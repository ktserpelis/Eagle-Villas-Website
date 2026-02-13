import express from "express";
import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../prismaClient.js";
import { stripe } from "../stripe/stripeClient.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import { sendTemplateEmail } from "services/emailService.js";

export const paymentsRouter = Router();

/**
 * ============================================================
 * PAYMENT ROUTES OVERVIEW
 * ============================================================
 *
 * This router handles:
 * - Customer additional bed requests (admin approval; manual charge or no charge)
 * - Admin additional bed request moderation (approve/reject + choose charge/no charge)
 * - Voucher visibility (customer + admin)
 *
 * Important design principles:
 * - Backend is source-of-truth for money outcomes.
 * - Stripe refunds are capped by remaining refundable amounts.
 * - Additional bed charges are handled manually (no Stripe charge); decision recorded on approval.
 * - Admin-only endpoints must enforce role checks.
 */

function requireAdmin(req: any, res: any): boolean {
  const role = req.user?.role;
  if (role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }
  return true;
}

/**
 * ============================================================
 * ADMIN: VOUCHERS VISIBILITY
 * ============================================================
 *
 * GET /api/payments/admin/vouchers
 *
 * Shows vouchers created by cancellations (or any future voucher system),
 * and includes the related user and original booking (if present).
 */
paymentsRouter.get("/admin/vouchers", authMiddleware, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const vouchers = await prisma.creditVoucher.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      // Prisma relation doesn't exist here (originalBookingId is not a relation field).
      // We'll join booking manually if you want deeper booking info later.
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ vouchers });
});

/**
 * ============================================================
 * CUSTOMER: ADDITIONAL BED REQUEST (ADMIN DECIDES CHARGE)
 * ============================================================
 *
 * POST /api/payments/additional-bed-request/:bookingId
 */
paymentsRouter.post(
  "/additional-bed-request/:bookingId",
  authMiddleware,
  async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const { userId } = req.user!;

    const bedsRequestedRaw = req.body?.bedsRequested;
    const bedsRequested = Number.isFinite(Number(bedsRequestedRaw))
      ? Number(bedsRequestedRaw)
      : 1;

    if (bedsRequested < 1 || bedsRequested > 10) {
      return res
        .status(400)
        .json({ message: "bedsRequested must be between 1 and 10" });
    }

    // Ensure booking belongs to user
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: { id: true, status: true },
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Optional guard (adjust if you want to allow other statuses)
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Only confirmed bookings can request an additional bed",
      });
    }

    // Create request
    const abr = await prisma.additionalBedRequest.create({
      data: {
        bookingId,
        userId,
        bedsRequested,
        customerMessage: req.body?.message ?? req.body?.note ?? null,
        status: "pending",
      },
    });

    // Notify single admin (you said only one admin exists)
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { email: true, name: true },
    });

    if (admin?.email) {
      await sendTemplateEmail("admin_additional_bed_request_created", admin.email, {
        adminName: admin.name ?? "Admin",
        bookingId,
        requestId: abr.id,
        bedsRequested,
      });
    }

    return res.json({
      bookingId,
      requestId: abr.id,
      status: "pending",
      message: "Your additional bed request was sent to admin for review.",
    });
  }
);

/**
 * ============================================================
 * ADMIN: ADDITIONAL BED REQUESTS
 * ============================================================
 *
 * GET  /api/payments/admin/additional-bed-requests?status=pending|approved|rejected
 * POST /api/payments/admin/additional-bed-requests/:id/approve
 * POST /api/payments/admin/additional-bed-requests/:id/reject
 */

paymentsRouter.get(
  "/admin/additional-bed-requests",
  authMiddleware,
  async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const status = String(req.query.status ?? "pending");

    const items = await prisma.additionalBedRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        booking: {
          include: {
            property: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ additionalBedRequests: items });
  }
);

paymentsRouter.post(
  "/admin/additional-bed-requests/:id/approve",
  authMiddleware,
  async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const requestId = Number(req.params.id);

    const chargeType = String(req.body?.chargeType ?? "").trim(); // "charge" | "no_charge"
    const adminMessage = req.body?.adminMessage ?? req.body?.note ?? null;

    if (chargeType !== "charge" && chargeType !== "no_charge") {
      return res
        .status(400)
        .json({ message: "chargeType must be 'charge' or 'no_charge'" });
    }

    let amountCents: number | null = null;

    if (chargeType === "charge") {
      const raw = req.body?.amountCents ?? req.body?.amount;
      const parsed = Number(raw);

      if (!Number.isFinite(parsed) || parsed <= 0) {
        return res.status(400).json({
          message:
            "amountCents must be a positive number when chargeType='charge'",
        });
      }

      amountCents = parsed;
    }

    const abr = await prisma.additionalBedRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!abr)
      return res.status(404).json({ message: "Additional bed request not found" });

    if (abr.status !== "pending") {
      return res.status(400).json({ message: "Request already decided" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.additionalBedRequest.update({
        where: { id: requestId },
        data: {
          status: "approved",
          decidedAt: new Date(),
          chargeType,
          amountCents,
          adminMessage,
        },
      });

      const bookingUpdated = await tx.booking.update({
        where: { id: abr.bookingId },
        data: {
          extraBedsCount: { increment: abr.bedsRequested },
        },
      });

      return { reqUpdated, bookingUpdated };
    });

    // Email customer
    await sendTemplateEmail("customer_additional_bed_request_approved", abr.user.email, {
      customerName: abr.user.name ?? "Customer",
      bookingId: abr.bookingId,
      bedsRequested: abr.bedsRequested,
      chargeType,
      amountCents: amountCents ?? "",
      adminMessage: adminMessage ?? "",
    });

    return res.json({
      status: "approved",
      bookingId: abr.bookingId,
      bedsAdded: abr.bedsRequested,
      chargeType,
      amountCents,
    });
  }
);

paymentsRouter.post(
  "/admin/additional-bed-requests/:id/reject",
  authMiddleware,
  async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const requestId = Number(req.params.id);
    const adminMessage = req.body?.adminMessage ?? req.body?.note ?? null;

    const abr = await prisma.additionalBedRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!abr)
      return res.status(404).json({ message: "Additional bed request not found" });

    if (abr.status !== "pending") {
      return res.status(400).json({ message: "Request already decided" });
    }

    await prisma.additionalBedRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        decidedAt: new Date(),
        adminMessage,
      },
    });

    await sendTemplateEmail("customer_additional_bed_request_rejected", abr.user.email, {
      customerName: abr.user.name ?? "Customer",
      bookingId: abr.bookingId,
      adminMessage: adminMessage ?? "",
    });

    return res.json({ status: "rejected" });
  }
);

/**
 * ============================================================
 * STRIPE WEBHOOK: CONFIRM CHECKOUT SESSION
 * ============================================================
 *
 * POST /api/payments/stripe/webhook
 *
 * Purpose:
 * - Stripe Checkout success page DOES NOT confirm a booking.
 * - This webhook is the source-of-truth that marks:
 *   - booking.status = "confirmed"
 *   - payment.status = "paid"
 *   - payment.stripePaymentIntentId = session.payment_intent
 *
 * Critical implementation detail:
 * - Stripe signature verification requires the RAW request body.
 * - Therefore this route must use express.raw({ type: "application/json" }).
 *
 * IMPORTANT app-level note:
 * - If you have app.use(express.json()) globally, Stripe verification will fail
 *   if that JSON middleware runs before this route.
 * - Common fix: mount this router OR this webhook endpoint before express.json(),
 *   OR mount this webhook at the app level with raw body middleware.
 */
paymentsRouter.post(
  "/stripe/webhook",
  async (req, res) => {
    // NOTE:
    // This handler expects req.body to be a RAW Buffer.
    // The raw body middleware is mounted at the app level for the exact webhook path
    // BEFORE express.json(). Do NOT add express.raw() here, or it can consume the stream twice.
    const sig = req.headers["stripe-signature"];

    if (!sig || Array.isArray(sig)) {
      return res.status(400).send("Missing Stripe signature header");
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not set");
      return res.status(500).send("Webhook misconfigured");
    }

    console.log("✅ webhook hit", sig ? "signed" : "no sig");

    let event: Stripe.Event;
    // 1) Verify its raw body 
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌Stripe webhook signature verification failed:", err?.message ?? err);
      return res.status(400).send("Invalid signature");
    }

    try {
            // 2) Confirm booking only when Checkout session is completed
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        /**
         * ============================================================
         * BOOKING RECONCILIATION STRATEGY
         * ============================================================
         *
         * Primary method:
         * - Use session.metadata.bookingId (set during Checkout creation)
         *
         * Fallback method:
         * - If metadata is missing (e.g. CLI test event or edge case),
         *   look up the booking via stripeSessionId stored in Payment.
         *
         * This guarantees:
         * - Paid bookings are never left pending
         * - Metadata bugs do not break confirmation
         * ============================================================
         */

        // 1) Attempt to read bookingId from Stripe metadata
        const bookingIdRaw = session.metadata?.bookingId;
        let bookingId = bookingIdRaw ? Number(bookingIdRaw) : NaN;

        // 2) Fallback: resolve booking via stripeSessionId
        if (!bookingIdRaw || Number.isNaN(bookingId)) {
          const payment = await prisma.payment.findFirst({
            where: { stripeSessionId: session.id },
            select: { bookingId: true },
          });
          
          console.log("fallback lookup by stripeSessionId result:", payment);

          bookingId = payment?.bookingId ?? NaN;
        }

        

        // 3) Final safety check
        if (!bookingId || Number.isNaN(bookingId)) {
          console.error(
            "checkout.session.completed: unable to resolve bookingId (metadata + stripeSessionId lookup failed)"
          );
          return res.status(400).send("Missing bookingId");
        }
        
        // Idempotency: Stripe may retry the same event multiple times.
        // We only want to confirm once.
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { payment: true },
        });

        if (!booking || !booking.payment) {
          console.error("❌ Booking/payment not found for bookingId:", bookingId);
          return res.status(404).send("Booking/payment not found");
        }

        // Only Stripe payments should be confirmed by this webhook
        if (booking.payment.provider !== "stripe") {
          // If vouchers/admin were used, this webhook is irrelevant.
          return res.json({ received: true, ignored: true });
        }

        // If already confirmed + paid, just acknowledge (idempotent)
        if (booking.status === "confirmed" && booking.payment.status === "paid") {
          return res.json({ received: true, idempotent: true });
        }

        // Stripe Checkout fields
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;

        // Keep what you already stored, but session.amount_total is the actual charged amount.
        // Your system already set payment.amountCents = payableCents (remaining after credits).
        const amountTotal =
          typeof session.amount_total === "number" ? session.amount_total : booking.payment.amountCents;

        const currency =
          typeof session.currency === "string" ? session.currency : booking.payment.currency ?? "eur";

        // 3) Persist confirmation (atomic)
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { bookingId },
            data: {
              status: "paid",
              amountCents: amountTotal,
              currency,
              // You already store stripeSessionId earlier, but keep it in sync anyway
              stripeSessionId: session.id,
              // Needed for refunds in your cancellation/refund routes
              stripePaymentIntentId: paymentIntentId,
            },
          });

          await tx.booking.update({
            where: { id: bookingId },
            data: { status: "confirmed" },
          });
        });

        console.log("checkout.session.completed session.id:", session.id);
        console.log("checkout.session.completed metadata:", session.metadata);
        console.log("checkout.session.completed payment_intent:", session.payment_intent);

        return res.json({ received: true });
      }

      // For all other event types, we acknowledge to avoid retries
      return res.json({ received: true });
    } catch (err) {
      console.error("❌ Webhook handler error:", err);
      return res.status(500).send("Webhook handler failed");
    }
  }
);
