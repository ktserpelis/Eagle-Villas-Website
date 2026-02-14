import express, { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../prismaClient.js";
import { stripe } from "../stripe/stripeClient.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import {
  computeRefundOutcome,
  daysBeforeStart,
  getRefundTier,
} from "../payments/refundPolicy.js";
import { sendTemplateEmail } from "../services/emailService.js";

export const refundsRouter = Router();

function requireAdmin(req: any, res: any): boolean {
  const role = req.user?.role;
  if (role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }
  return true;
}

function mapStripeRefundStatus(
  s: Stripe.Refund["status"]
): "pending" | "succeeded" | "failed" | "canceled" {
  if (s === "succeeded") return "succeeded";
  if (s === "failed") return "failed";
  if (s === "canceled") return "canceled";
  return "pending";
}

/**
 * Apply succeeded refund to Payment totals exactly-once.
 * - guarded by Refund.status transition
 */
async function applySucceededOnce(refundId: number, stripeAmountCents?: number) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!r || !r.payment) return;

    // ✅ idempotency guard
    if (r.appliedAt) return;

    const amount = Math.max(0, Math.floor(stripeAmountCents ?? r.amountCents));

    // mark applied first so concurrent handler can’t also apply
    await tx.refund.update({
      where: { id: refundId },
      data: {
        status: "succeeded",
        appliedAt: new Date(),
        amountCents: amount, // store Stripe truth
      },
    });

    const p = r.payment;
    const newRefunded = Math.min(p.amountCents, p.refundedCents + amount);

    await tx.payment.update({
      where: { id: p.id },
      data: {
        refundedCents: newRefunded,
        status: newRefunded >= p.amountCents ? "refunded" : "partially_refunded",
      },
    });
  });
}
/**
 * ============================================================
 * CUSTOMER: REFUND STATUS FOR BOOKING CARD
 * ============================================================
 * GET /api/payments/refund-status/:bookingId
 *
 * - returns latest refund record for that booking (if any)
 * - returns voucher info from Cancellation (if any)
 *
 * This is lightweight and lets the BookingCard show:
 * - Refund: pending/succeeded/failed
 * - Voucher issued
 */
refundsRouter.get("/refund-status/:bookingId", authMiddleware, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { userId } = req.user!;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    select: {
      id: true,
      status: true,
      guestEmail: true,
      payment: { select: { currency: true } },
      cancellation: { select: { voucherIssuedCents: true, policyRefundCents: true } },
    },
  });

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const latestRefund = await prisma.refund.findFirst({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      source: true,
      status: true,
      amountCents: true,
      currency: true,
      createdAt: true,
      failureReason: true,
    },
  });

  return res.json({
    bookingId,
    bookingStatus: booking.status,
    currency: booking.payment?.currency ?? "eur",
    cancellation: booking.cancellation
      ? {
          voucherIssuedCents: booking.cancellation.voucherIssuedCents,
          policyRefundCents: booking.cancellation.policyRefundCents,
        }
      : null,
    refund: latestRefund ?? null,
  });
});

/**
 * ============================================================
 * CUSTOMER: CANCEL BOOKING (policy-based)
 * POST /api/payments/cancel/:bookingId
 * ============================================================
 */
refundsRouter.post("/cancel/:bookingId", authMiddleware, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { userId } = req.user!;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { payment: true, cancellation: true },
  });

  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status === "cancelled")
    return res.status(400).json({ message: "Already cancelled" });

  if (booking.cancellation) {
    return res.status(400).json({ message: "Cancellation already recorded" });
  }

  const bookingTotalCents = booking.totalPrice * 100;

  const now = new Date();
  const daysBefore = daysBeforeStart(now, booking.startDate);
  const { refundCents: policyRefundCents, voucherCents } = computeRefundOutcome(
    daysBefore,
    bookingTotalCents
  );

  const payment = booking.payment;

  // Admin bookings: cancel only
  if (payment?.provider === "admin") {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
      await tx.cancellation.create({
        data: {
          bookingId,
          policyRefundCents: 0,
          voucherIssuedCents: 0,
          reason: req.body?.reason ?? null,
        },
      });
    });

    return res.json({
      bookingId,
      status: "cancelled",
      refund: {
        refundType: "none",
        refundedCents: 0,
        voucherCents: 0,
        refundStatus: "not_applicable",
      },
    });
  }

  if (!payment || payment.provider !== "stripe") {
    return res.status(400).json({ message: "No Stripe payment found for this booking" });
  }

  const refundableRemaining = Math.max(0, payment.amountCents - payment.refundedCents);
  const stripeRefundCents = Math.min(policyRefundCents, refundableRemaining);

  const refundType =
    stripeRefundCents > 0 ? "stripe_refund" : voucherCents > 0 ? "voucher" : "none";

  const result = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });

    const cancellation = await tx.cancellation.create({
      data: {
        bookingId,
        policyRefundCents: stripeRefundCents,
        voucherIssuedCents: voucherCents,
        reason: req.body?.reason ?? null,
      },
    });

    if (voucherCents > 0) {
      await tx.creditVoucher.create({
        data: {
          userId,
          currency: "eur",
          originalBookingId: bookingId,
          issuedCents: voucherCents,
          remainingCents: voucherCents,
          status: "active",
        },
      });
    }

    if (stripeRefundCents <= 0) {
      return { cancellationId: cancellation.id, refundId: null as number | null };
    }

    if (!payment.stripePaymentIntentId) {
      const failed = await tx.refund.create({
        data: {
          bookingId,
          paymentId: payment.id,
          source: "policy_cancel",
          status: "failed",
          amountCents: stripeRefundCents,
          currency: payment.currency ?? "eur",
          stripePaymentIntentId: null,
          cancellationId: cancellation.id,
          failureReason: "Missing stripePaymentIntentId",
        },
      });

      return { cancellationId: cancellation.id, refundId: failed.id };
    }

    const created = await tx.refund.create({
      data: {
        bookingId,
        paymentId: payment.id,
        source: "policy_cancel",
        status: "pending",
        amountCents: stripeRefundCents,
        currency: payment.currency ?? "eur",
        stripePaymentIntentId: payment.stripePaymentIntentId,
        cancellationId: cancellation.id,
      },
    });

    return { cancellationId: cancellation.id, refundId: created.id };
  });

  if (stripeRefundCents <= 0) {
    return res.json({
      bookingId,
      status: "cancelled",
      refund: {
        refundType,
        refundedCents: 0,
        voucherCents,
        refundStatus: "not_applicable",
      },
    });
  }

  if (!payment.stripePaymentIntentId) {
    return res.status(409).json({
      message: "Booking cancelled, but cannot refund: missing payment_intent",
      bookingId,
      status: "cancelled",
      refund: {
        refundType: "stripe_refund",
        refundedCents: 0,
        voucherCents,
        refundStatus: "failed",
      },
    });
  }

  try {
    // ✅ Stripe idempotency: protects against duplicate refund submissions
    const idempotencyKey = `refund:policy_cancel:booking:${bookingId}:refund:${result.refundId}`;

    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        amount: stripeRefundCents,
        metadata: {
          localRefundId: String(result.refundId),
          bookingId: String(bookingId),
          cancellationId: String(result.cancellationId),
          source: "policy_cancel",
        },
      },
      { idempotencyKey }
    );

    await prisma.refund.update({
      where: { id: result.refundId! },
      data: {
        stripeRefundId: stripeRefund.id,
        status: mapStripeRefundStatus(stripeRefund.status),
      },
    });

    return res.json({
      bookingId,
      status: "cancelled",
      refund: {
        refundType: "stripe_refund",
        refundedCents: stripeRefundCents,
        voucherCents,
        refundStatus: "pending", // webhook confirms final
      },
    });
  } catch (e) {
    console.error("❌ Stripe refund create failed:", e);

    await prisma.refund.update({
      where: { id: result.refundId! },
      data: { status: "failed", failureReason: "Stripe refund create failed" },
    });

    return res.status(502).json({
      message: "Booking cancelled, but refund submission failed. Admin may retry.",
      bookingId,
      status: "cancelled",
    });
  }
});

/**
 * ============================================================
 * CUSTOMER: CANCEL PREVIEW
 * GET /api/payments/cancel-preview/:bookingId
 * ============================================================
 */
refundsRouter.get("/cancel-preview/:bookingId", authMiddleware, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { userId } = req.user!;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { payment: true },
  });

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const bookingTotalCents = booking.totalPrice * 100;

  const now = new Date();
  const daysBefore = daysBeforeStart(now, booking.startDate);
  const tier = getRefundTier(daysBefore);

  const { refundCents: policyRefundCents, voucherCents } = computeRefundOutcome(
    daysBefore,
    bookingTotalCents
  );

  let currency = "eur";
  let stripeRefundCents = 0;

  const payment = booking.payment;

  if (payment?.provider === "admin") {
    return res.json({
      bookingId,
      action: "cancel",
      currency,
      policy: {
        daysBefore,
        tier: tier.key,
        label: tier.label,
        description: tier.description,
        refundBps: tier.refundBps,
        voucherBps: tier.voucherBps,
      },
      outcome: {
        refundType: "none",
        stripeRefundCents: 0,
        voucherCents: 0,
      },
    });
  }

  if (payment?.provider === "stripe") {
    currency = payment.currency ?? "eur";
    const refundableRemaining = Math.max(0, payment.amountCents - payment.refundedCents);
    stripeRefundCents = Math.min(policyRefundCents, refundableRemaining);
  }

  const refundType =
    stripeRefundCents > 0 ? "stripe_refund" : voucherCents > 0 ? "voucher" : "none";

  return res.json({
    bookingId,
    action: "cancel",
    currency,
    policy: {
      daysBefore,
      tier: tier.key,
      label: tier.label,
      description: tier.description,
      refundBps: tier.refundBps,
      voucherBps: tier.voucherBps,
    },
    outcome: {
      refundType,
      stripeRefundCents,
      voucherCents,
    },
  });
});

/**
 * ============================================================
 * CUSTOMER: REFUND REQUEST (admin approval)
 * POST /api/payments/refund-request/:bookingId
 * GET  /api/payments/refund-request-preview/:bookingId
 * ============================================================
 */
refundsRouter.post("/refund-request/:bookingId", authMiddleware, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { userId } = req.user!;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    select: { id: true },
  });

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const rr = await prisma.refundRequest.create({
    data: {
      bookingId,
      userId,
      message: req.body?.reason ?? req.body?.message ?? null,
      status: "pending",
    },
  });

  return res.json({
    bookingId,
    status: "pending_admin_approval",
    requestId: rr.id,
    message: "Your request was sent to admin for review.",
  });
});

refundsRouter.get("/refund-request-preview/:bookingId", authMiddleware, async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const { userId } = req.user!;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { payment: true },
  });

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const bookingTotalCents = booking.totalPrice * 100;

  let currency = "eur";
  let refundableRemainingCents = 0;

  const payment = booking.payment;

  if (payment?.provider === "stripe") {
    currency = payment.currency ?? "eur";
    refundableRemainingCents = Math.max(0, payment.amountCents - payment.refundedCents);
  }

  return res.json({
    bookingId,
    action: "refund_request",
    currency,
    amount: {
      bookingTotalCents,
      refundableRemainingCents,
      requestedRefundCents: bookingTotalCents,
    },
  });
});

/**
 * ============================================================
 * ADMIN: REFUND REQUEST MODERATION (same routes)
 * ============================================================
 */
refundsRouter.get("/admin/refund-requests", authMiddleware, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const status = String(req.query.status ?? "pending");

  const items = await prisma.refundRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true } },
      booking: {
        include: {
          payment: true,
          cancellation: true,
          property: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = items.map((r) => {
    const p = r.booking.payment;
    const remaining =
      p && p.provider === "stripe" ? Math.max(0, p.amountCents - p.refundedCents) : 0;
    return { ...r, computed: { refundableRemainingCents: remaining } };
  });

  return res.json({ refundRequests: enriched });
});

refundsRouter.post("/admin/refund-requests/:id/approve", authMiddleware, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const requestId = Number(req.params.id);

  const rr = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    include: {
      booking: { include: { payment: true, user: true } },
    },
  });

  if (!rr) return res.status(404).json({ message: "Refund request not found" });
  if (rr.status !== "pending") return res.status(400).json({ message: "Request already decided" });

  const payment = rr.booking.payment;
  if (!payment || payment.provider !== "stripe" || !payment.stripePaymentIntentId) {
    return res.status(400).json({ message: "No refundable Stripe payment found" });
  }

  const remaining = Math.max(0, payment.amountCents - payment.refundedCents);

  if (remaining === 0) {
    await prisma.refundRequest.update({
      where: { id: requestId },
      data: { status: "approved", decidedAt: new Date() },
    });
    return res.json({ status: "approved", refundedCents: 0, refundStatus: "not_applicable" });
  }

  const localRefund = await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: requestId },
      data: { status: "approved", decidedAt: new Date() },
    });

    // You wanted booking moved to cancelled for customer UX
    await tx.booking.update({
      where: { id: rr.bookingId },
      data: { status: "cancelled" },
    });

    return tx.refund.create({
      data: {
        bookingId: rr.bookingId,
        paymentId: payment.id,
        source: "admin_request",
        status: "pending",
        amountCents: remaining,
        currency: payment.currency ?? "eur",
        stripePaymentIntentId: payment.stripePaymentIntentId,
        refundRequestId: rr.id,
      },
    });
  });

  try {
    const idempotencyKey = `refund:admin_request:request:${requestId}:refund:${localRefund.id}`;

    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        amount: remaining,
        metadata: {
          localRefundId: String(localRefund.id),
          bookingId: String(rr.bookingId),
          requestId: String(requestId),
          source: "admin_request",
        },
      },
      { idempotencyKey }
    );

    await prisma.refund.update({
      where: { id: localRefund.id },
      data: {
        stripeRefundId: stripeRefund.id,
        status: mapStripeRefundStatus(stripeRefund.status),
      },
    });

    return res.json({ status: "approved", refundedCents: remaining, refundStatus: "pending" });
  } catch (e) {
    console.error("❌ Stripe refund create failed:", e);

    await prisma.refund.update({
      where: { id: localRefund.id },
      data: { status: "failed", failureReason: "Stripe refund create failed" },
    });

    return res.status(502).json({
      message: "Refund approval recorded, but refund submission failed. Admin may retry.",
      status: "approved",
    });
  }
});

refundsRouter.post("/admin/refund-requests/:id/reject", authMiddleware, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const requestId = Number(req.params.id);

  const rr = await prisma.refundRequest.findUnique({ where: { id: requestId } });
  if (!rr) return res.status(404).json({ message: "Refund request not found" });
  if (rr.status !== "pending") return res.status(400).json({ message: "Request already decided" });

  await prisma.refundRequest.update({
    where: { id: requestId },
    data: { status: "rejected", decidedAt: new Date() },
  });

  return res.json({ status: "rejected" });
});

/**
 * ============================================================
 * STRIPE WEBHOOK: REFUND CONFIRMATION + CUSTOMER EMAIL
 * POST /api/payments/stripe/refund-webhook
 * ============================================================
 *
 * Responsibilities:
 * - Verify Stripe signature (raw body required)
 * - Reconcile Stripe refund with local Refund record
 * - Update local refund status
 * - Apply succeeded refund effects once (idempotent)
 * - Send customer notification email (once)
 *
 * IMPORTANT:
 * - Must be mounted before express.json()
 * - req.body must be a raw Buffer
 */
refundsRouter.post(
  "/stripe/refund-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    /**
     * ------------------------------------------------------------
     * 1) Verify Stripe signature
     * ------------------------------------------------------------
     * If signature verification fails:
     * - Do NOT process the event
     * - Return 400 so Stripe retries if needed
     */
    const sig = req.headers["stripe-signature"];
    if (!sig || Array.isArray(sig)) {
      return res.status(400).send("Missing Stripe signature header");
    }

    const webhookSecret =
      process.env.STRIPE_REFUND_WEBHOOK_SECRET ??
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_REFUND_WEBHOOK_SECRET/STRIPE_WEBHOOK_SECRET not set");
      return res.status(500).send("Webhook misconfigured");
    }

    let event: Stripe.Event;

    try {
      // constructEvent requires raw Buffer
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err?.message ?? err);
      return res.status(400).send("Invalid signature");
    }

    try {
      /**
       * ------------------------------------------------------------
       * 2) Filter only refund events
       * ------------------------------------------------------------
       * We only care about:
       * - refund.created
       * - refund.updated
       *
       * Everything else is acknowledged and ignored.
       */
      if (event.type !== "refund.created" && event.type !== "refund.updated") {
        return res.json({ received: true, ignored: true });
      }

      const refund = event.data.object as Stripe.Refund;

      const stripeRefundId = refund.id;

      /**
       * Map Stripe refund.status to your internal enum
       * Example:
       * - pending
       * - succeeded
       * - failed
       * - canceled
       */
      const nextStatus = mapStripeRefundStatus(refund.status);

      /**
       * Attempt to link Stripe refund to local refund:
       *
       * Primary:
       *   - stripeRefundId (strongest link)
       *
       * Fallback:
       *   - metadata.localRefundId (if you stored it when creating refund)
       */
      const localRefundIdRaw = (refund.metadata?.localRefundId ?? "").trim();
      const localRefundId = localRefundIdRaw ? Number(localRefundIdRaw) : NaN;

      const local = await prisma.refund.findFirst({
        where: {
          OR: [
            { stripeRefundId },
            ...(Number.isFinite(localRefundId)
              ? [{ id: localRefundId }]
              : []),
          ],
        },
        include: {
          booking: { include: { user: true, property: true } },
          payment: true,
        },
      });

      /**
       * If we cannot find a matching local refund:
       * - Log warning
       * - Acknowledge event so Stripe stops retrying
       *
       * This prevents infinite webhook retries.
       */
      if (!local) {
        console.warn("refund-webhook: local refund not found", {
          stripeRefundId,
          localRefundId,
        });
        return res.json({ received: true, localFound: false });
      }

      /**
       * Ensure stripeRefundId is persisted locally.
       * This guarantees future events reconcile cleanly.
       */
      if (!local.stripeRefundId) {
        await prisma.refund.update({
          where: { id: local.id },
          data: { stripeRefundId },
        });
      }

      /**
       * ------------------------------------------------------------
       * 3) Handle non-succeeded statuses
       * ------------------------------------------------------------
       * If refund is pending, failed, or canceled:
       * - Update local status
       * - Do NOT apply refund effects
       */
      if (nextStatus !== "succeeded") {
        await prisma.refund.update({
          where: { id: local.id },
          data: { status: nextStatus },
        });

        return res.json({
          received: true,
          status: nextStatus,
          applied: false,
        });
      }

      /**
       * ------------------------------------------------------------
       * 4) Handle succeeded refunds (idempotent)
       * ------------------------------------------------------------
       * applySucceededOnce should:
       * - Ensure refund effects only apply once
       * - Update payment.refundedCents
       * - Update booking state if needed
       */
      await applySucceededOnce(local.id, refund.amount ?? undefined);

      /**
       * ------------------------------------------------------------
       * 5) Send customer email (only once)
       * ------------------------------------------------------------
       * Guarded by customerNotifiedAt to prevent duplicate emails
       */
      const alreadyNotified = !!local.customerNotifiedAt;

        if (!alreadyNotified && local.booking?.user?.email) {
        const amountEuros = (local.amountCents / 100).toFixed(2);
        const currency = (local.currency ?? local.payment?.currency ?? "eur").toUpperCase();

        try {
            await sendTemplateEmail("customer_refund_succeeded", local.booking.user.email, {
            customerName: local.booking.user.name ?? "Customer",
            bookingId: local.bookingId,
            amount: amountEuros,
            currency,
            propertyTitle: local.booking.property?.title ?? "",
            });

            await prisma.refund.update({
            where: { id: local.id },
            data: { customerNotifiedAt: new Date() },
            });
        } catch (e) {
            console.error("refund webhook: customer email failed", e);
            // Intentionally do not throw.
            // Refund completion must be acknowledged even if email/template fails.
        }
    }

      /**
       * Acknowledge successful processing
       */
      return res.json({
        received: true,
        status: "succeeded",
        applied: true,
      });

    } catch (err) {
      console.error("refund webhook handler error:", err);
      return res.status(500).send("Webhook handler failed");
    }
  }
);
