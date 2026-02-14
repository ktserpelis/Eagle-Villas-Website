import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { createBookingSchema } from "@eagle-villas/shared/schemas/booking.schema";
import { validateBody } from "../midleware/validateBody.js";
import { optionalAuthMiddleware } from "../midleware/optionalAuthMiddleware.js";
import {
  getOpenPeriodSegments,
  nightsBetween,
  applyWeeklyDiscount,
} from "../services/periods.service.js";
import { stripe } from "../stripe/stripeClient.js";
import { REFUND_POLICY, daysBeforeStart, getRefundTier } from "../payments/refundPolicy.js";
import { bookingQuoteSchema } from "@eagle-villas/shared/schemas/bookingQuoteSchema";

export const bookingRouter = Router();

/**
 * Parse a date-only value into a UTC-midnight Date.
 *
 * Accepted inputs:
 * - "YYYY-MM-DD" (preferred)
 * - full ISO string (fallback; normalized to UTC date)
 *
 * Why this matters:
 * - Prevents timezone drift and DST issues in price/availability calculations.
 * - Ensures "nightsBetween" yields stable integer results.
 */
function parseDateOnlyToUtcMidnight(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return dt;

  return new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0)
  );
}

/**
 * Checks if a date range overlaps with:
 * - direct site bookings (pending/confirmed)
 * - Booking.com imported blocks (externalBlock)
 * - manual blocks (manualBlock)
 *
 * Overlap condition:
 * existing.start < requested.end AND existing.end > requested.start
 *
 * Notes:
 * - We treat "pending" bookings as holds to prevent double-selling inventory
 *   while a customer is completing Stripe Checkout.
 */
async function isDateRangeTaken(propertyId: number, start: Date, end: Date) {
  const [direct, external, manual] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        propertyId,
        status: { in: ["pending", "confirmed"] },
        startDate: { lt: end },
        endDate: { gt: start },
      },
      select: { id: true },
    }),
    prisma.externalBlock.findFirst({
      where: {
        propertyId,
        provider: "BOOKING_COM",
        startDate: { lt: end },
        endDate: { gt: start },
      },
      select: { id: true },
    }),
    prisma.manualBlock.findFirst({
      where: {
        propertyId,
        startDate: { lt: end },
        endDate: { gt: start },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(direct || external || manual);
}

/**
 * GET /api/bookings/calendar/property/:propertyId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * (USED FOR CUSTOMER CALENDAR)
 * Returns:
 * - blocks: DIRECT + BOOKING_COM + MANUAL (public-safe, no PII)
 * - dailyPrices: map of YYYY-MM-DD -> nightly price (period price if OPEN, else property default)
 * - dailyOpen: map of YYYY-MM-DD -> boolean (true only if covered by an OPEN period)
 * - defaultNightlyPrice: property.pricePerNight
 * - hasAnyPeriods: boolean
 *
 * Date semantics:
 * - from/to are treated as date-only boundaries.
 * - dailyPrices includes each night in [from, to).
 *
 * Availability behavior:
 * - If a night is covered by an OPEN period -> dailyOpen=true
 * - If a night is covered by a CLOSED period -> dailyOpen=false
 * - If a night is NOT covered by any period -> dailyOpen=false (default closed when no period)
 */
bookingRouter.get("/calendar/property/:propertyId", async (req, res, next) => {
  try {
    const propertyId = Number(req.params.propertyId);
    if (Number.isNaN(propertyId)) {
      return res.status(400).json({ message: "Invalid property id" });
    }

    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "from and to are required (YYYY-MM-DD)" });
    }

    const fromDate = parseDateOnlyToUtcMidnight(from);
    const toDate = parseDateOnlyToUtcMidnight(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: "Invalid from/to date" });
    }
    if (toDate <= fromDate) {
      return res.status(400).json({ message: "to must be after from" });
    }

    // Load property fallback price used for display when a night is not open.
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, pricePerNight: true },
    });
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Overlap filter: item.start < to AND item.end > from
    const rangeWhere = {
      AND: [{ startDate: { lt: toDate } }, { endDate: { gt: fromDate } }],
    };

    const [direct, bookingCom, manual, periods] = await Promise.all([
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { in: ["pending", "confirmed"] },
          ...(rangeWhere as any),
        },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, endDate: true, status: true },
      }),
      prisma.externalBlock.findMany({
        where: { propertyId, provider: "BOOKING_COM", ...(rangeWhere as any) },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, endDate: true, summary: true },
      }),
      prisma.manualBlock.findMany({
        where: { propertyId, ...(rangeWhere as any) },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, endDate: true, reason: true },
      }),
      prisma.bookingPeriod.findMany({
        where: {
          propertyId,
          ...(rangeWhere as any),
        },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          isOpen: true,
          standardNightlyPrice: true,
        },
      }),
    ]);

    const blocks = [
      ...direct.map((b) => ({
        source: "DIRECT" as const,
        id: b.id,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
      })),
      ...bookingCom.map((x) => ({
        source: "BOOKING_COM" as const,
        id: x.id,
        startDate: x.startDate,
        endDate: x.endDate,
        summary: x.summary ?? null,
      })),
      ...manual.map((m) => ({
        source: "MANUAL" as const,
        id: m.id,
        startDate: m.startDate,
        endDate: m.endDate,
        reason: m.reason ?? null,
      })),
    ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Utility: YYYY-MM-DD string based on UTC date components
    const ymdUTC = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const hasAnyPeriods = periods.length > 0;
    const dailyPrices: Record<string, number> = {};
    const dailyOpen: Record<string, boolean> = {};

    for (let d = new Date(fromDate); d < toDate; d = new Date(d.getTime() + 86400000)) {
      const key = ymdUTC(d);

      if (!hasAnyPeriods) {
        // No periods configured => default CLOSED for all days
        dailyOpen[key] = false;
        dailyPrices[key] = property.pricePerNight;
        continue;
      }

      const p = periods.find((p) => d >= p.startDate && d < p.endDate);

      // Default CLOSED when no period
      if (!p) {
        dailyOpen[key] = false;
        dailyPrices[key] = property.pricePerNight;
        continue;
      }

      // Covered by a period: OPEN only if period.isOpen=true
      dailyOpen[key] = !!p.isOpen;
      dailyPrices[key] = p.standardNightlyPrice ?? property.pricePerNight;
    }

    return res.json({
      blocks,
      dailyPrices,
      dailyOpen,
      defaultNightlyPrice: property.pricePerNight,
      hasAnyPeriods,
    });
  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/bookings
 *
 * Creates a DIRECT booking, but blocks if overlap with:
 * - direct bookings
 * - booking.com blocks (iCal)
 * - manual blocks
 *
 * Payment behavior:
 * - CUSTOMER:
 *   - creates booking.status = "pending"
 *   - creates payment.provider = "stripe" (unless payableCents===0)
 *   - returns Stripe Checkout URL
 *   - booking becomes "confirmed" only after Stripe webhook: checkout.session.completed
 * - ADMIN:
 *   - creates booking.status = "confirmed"
 *   - creates payment.provider = "admin", payment.amountCents = 0
 *   - NO Stripe session is created
 *
 * Credit policy:
 * - credits reduce the Stripe amount (payableCents)
 * - creditsAppliedCents are stored on Payment (non-refundable)
 * - refunds are only ever based on Payment.amountCents (cash paid to Stripe)
 *
 * Pricing behavior:
 * - Period pricing is used when a night is covered by a period.
 * - If a night is not covered by any period, we allow fallback pricing using property defaults.
 * - If any covered night is within a CLOSED period, we reject the booking.
 */
bookingRouter.post(
  "/",
  optionalAuthMiddleware,
  validateBody(createBookingSchema),
  async (req, res, next) => {
    try {
      const {
        propertyId,
        startDate,
        endDate,
        adults,
        children,
        babies,
        useCredit, // defaults false via zod schema
        guestName,
        guestEmail,
        guestPhone,
      } = req.body as any;

      /**
       * Babies (<2) are NOT counted in maxGuests checks.
       * Counted guests = adults + children
       */
      const countedGuests = Number(adults) + Number(children);

      /**
       * Parse YYYY-MM-DD date strings into UTC midnight Date objects.
       * Important: we compare and calculate nights using these normalized values.
       */
      const start = parseDateOnlyToUtcMidnight(startDate);
      const end = parseDateOnlyToUtcMidnight(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid dates" });
      }
      if (start >= end) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // 1) Load property (defaults are used when segments are uncovered)
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property) return res.status(404).json({ message: "Property not found" });

      const propertyDefaultMinNights = (property as any).minNights ?? 1;
      const propertyDefaultMaxGuests = property.maxGuests;
      const propertyDefaultNightlyPrice = property.pricePerNight;

      // 2) Property-level max guests (babies excluded)
      if (countedGuests > propertyDefaultMaxGuests) {
        return res.status(400).json({
          message: `Max guests for this property is ${propertyDefaultMaxGuests}`,
        });
      }

      // 3) Check availability including iCal blocks
      const isTaken = await isDateRangeTaken(propertyId, start, end);
      if (isTaken) {
        return res.status(409).json({ message: "These dates are not available for this property" });
      }

      // 4) Nights count (must be >= 1)
      const nights = nightsBetween(start, end);
      if (nights <= 0) return res.status(400).json({ message: "Stay must be at least 1 night" });

      // 5) Get open coverage segments:
      // - ok=false if any part hits CLOSED
      // - segments may include "uncovered" entries where period=null (fallback pricing allowed)
      const coverage = await getOpenPeriodSegments({
        propertyId,
        startDate: start,
        endDate: end,
      });

      if (!coverage.ok) {
        return res.status(409).json({
          message:
            coverage.reason === "CLOSED"
              ? "These dates are not available (closed period)"
              : "These dates are not available",
        });
      }

      // Arrival period defines min nights + weekly discount rules (Booking.com style)
      const arrivalPeriod = coverage.segments[0]?.period ?? null;

      // 6) Min nights (arrival-based, fallback to property)
      const arrivalMinNights = arrivalPeriod?.minNights ?? propertyDefaultMinNights;
      if (nights < arrivalMinNights) {
        return res.status(400).json({
          message: `Minimum stay for these dates is ${arrivalMinNights} nights`,
        });
      }

      // 7) Strictest maxGuests across stay (babies excluded)
      const strictestMaxGuests = Math.min(
        propertyDefaultMaxGuests,
        ...coverage.segments.map((s) => s.period?.maxGuests ?? propertyDefaultMaxGuests)
      );

      if (countedGuests > strictestMaxGuests) {
        return res.status(400).json({
          message: `Max guests for selected dates is ${strictestMaxGuests}`,
        });
      }

      // 8) Compute base total (EUR) + segment breakdown
      let baseTotal = 0;

      const segmentBreakdown = coverage.segments.map((seg) => {
        const segNights = nightsBetween(seg.from, seg.to);

        // Period price if present, else fallback to property default
        const nightly = seg.period?.standardNightlyPrice ?? propertyDefaultNightlyPrice;

        const segTotal = segNights * nightly;
        baseTotal += segTotal;

        return {
          periodId: seg.period?.id ?? null,
          from: seg.from.toISOString().slice(0, 10),
          to: seg.to.toISOString().slice(0, 10),
          nights: segNights,
          nightlyPrice: nightly,
          segmentTotal: segTotal,
        };
      });

      // 9) Apply weekly discount (only if arrivalPeriod has weeklyDiscountPercentBps)
      const weekly = applyWeeklyDiscount({
        baseTotal,
        nights,
        weeklyThresholdNights: arrivalPeriod?.weeklyThresholdNights ?? 7,
        weeklyDiscountPercentBps: arrivalPeriod?.weeklyDiscountPercentBps ?? null,
      });

      const totalPrice = weekly.total; // EUR int (gross booking value)

      // 10) Auth context
      const userId = req.user?.userId ?? null;
      const role = req.user?.role ?? "CUSTOMER";

      /**
       * ==========================
       * ADMIN BOOKINGS
       * ==========================
       * Admin creates confirmed booking immediately.
       * Payment is recorded as provider="admin" with amountCents=0 (no Stripe involved).
       */
      if (role === "ADMIN") {
        const breakdownJson = {
          currency: "eur",

          // stay pricing
          nights,
          segments: segmentBreakdown,
          baseTotalEur: baseTotal,
          weeklyDiscountAppliedBps: weekly.appliedBps ?? null,
          totalEur: totalPrice,

          // payment split
          grossTotalCents: totalPrice * 100,
          creditsAppliedCents: 0,
          cashDueNowCents: 0,
          creditRefundable: false,
          refundPolicyAppliesTo: "cash_paid_to_stripe_only",
        };

        const booking = await prisma.booking.create({
          data: {
            propertyId,
            userId,
            bookingPeriodId: arrivalPeriod?.id ?? null,
            startDate: start,
            endDate: end,
            guestName,
            guestEmail,
            guestPhone,

            adults: Number(adults),
            children: Number(children),
            babies: Number(babies),
            guestsCount: countedGuests,

            totalPrice,
            priceBreakdown: breakdownJson,
            weeklyDiscountAppliedBps: weekly.appliedBps,
            status: "confirmed",

            payment: {
              create: {
                provider: "admin",
                status: "paid",
                amountCents: 0,
                refundedCents: 0,
                currency: "eur",
                creditsAppliedCents: 0,
              },
            },
          },
          include: { payment: true },
        });

        return res.status(201).json({
          booking,
          checkoutUrl: null,
          priceSummary: breakdownJson,
        });
      }

      /**
       * ==========================
       * CUSTOMER BOOKINGS
       * ==========================
       * Customer must be logged in because:
       * - booking ownership
       * - cancellations/refunds
       * - credit vouchers are per-user
       */
      if (!userId) {
        return res.status(401).json({ message: "Please login to book and pay." });
      }

      // 10.5) Credit application (optional)
      // Total due in cents (gross)
      const totalDueCents = totalPrice * 100;

      let creditsAppliedCents = 0;
      let payableCents = totalDueCents;

      if (useCredit === true) {
        const now = new Date();

        // NOTE: we compute how much credit CAN be applied before we consume it in the transaction.
        const vouchers = await prisma.creditVoucher.findMany({
          where: { userId, currency: "eur", status: "active" },
          orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
        });

        let remainingToCover = totalDueCents;

        for (const v of vouchers) {
          if (remainingToCover <= 0) break;
          if (v.remainingCents <= 0) continue;
          if (v.expiresAt && v.expiresAt.getTime() <= now.getTime()) continue;

          const use = Math.min(v.remainingCents, remainingToCover);
          remainingToCover -= use;
          creditsAppliedCents += use;
        }

        // Net cash the customer will pay to Stripe
        payableCents = Math.max(0, totalDueCents - creditsAppliedCents);
      }

      // 10.6) Breakdown stored on booking + returned to UI for the "review before pay" screen
      const breakdownJson = {
        currency: "eur",

        // stay pricing
        nights,
        segments: segmentBreakdown,
        baseTotalEur: baseTotal,
        weeklyDiscountAppliedBps: weekly.appliedBps ?? null,
        totalEur: totalPrice,

        // payment split (credit is explicitly non-refundable)
        grossTotalCents: totalPrice * 100,
        creditsAppliedCents,
        cashDueNowCents: payableCents,
        creditRefundable: false,
        refundPolicyAppliesTo: "cash_paid_to_stripe_only",
      };

      /**
       * 11) Create booking + payment + (optional) consume vouchers atomically
       *
       * - If payableCents === 0:
       *   - we confirm immediately (no Stripe)
       *   - payment.provider = "admin", amountCents=0, creditsAppliedCents>0
       *
       * - Else:
       *   - booking.pending until webhook confirms Stripe session completion
       *   - payment.provider="stripe", amountCents=payableCents
       */
      const booking = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            propertyId,
            userId,
            bookingPeriodId: arrivalPeriod?.id ?? null,
            startDate: start,
            endDate: end,
            guestName,
            guestEmail,
            guestPhone,

            adults: Number(adults),
            children: Number(children),
            babies: Number(babies),
            guestsCount: countedGuests,

            totalPrice,
            priceBreakdown: breakdownJson,
            weeklyDiscountAppliedBps: weekly.appliedBps,
            status: payableCents === 0 ? "confirmed" : "pending",

            payment: {
              create: {
                provider: payableCents === 0 ? "admin" : "stripe",
                status: payableCents === 0 ? "paid" : "unpaid",
                amountCents: payableCents, // ✅ cash charged to Stripe (0 if fully covered by credit)
                refundedCents: 0,
                currency: "eur",
                creditsAppliedCents, // ✅ non-refundable credits used
              },
            },
          },
          include: { payment: true },
        });

        // Consume vouchers only if we decided to apply them
        if (useCredit === true && creditsAppliedCents > 0) {
          const now = new Date();
          let remainingToConsume = creditsAppliedCents;

          const vouchers = await tx.creditVoucher.findMany({
            where: { userId, currency: "eur", status: "active" },
            orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
          });

          for (const v of vouchers) {
            if (remainingToConsume <= 0) break;
            if (v.remainingCents <= 0) continue;
            if (v.expiresAt && v.expiresAt.getTime() <= now.getTime()) continue;

            const use = Math.min(v.remainingCents, remainingToConsume);
            remainingToConsume -= use;

            const newRemaining = v.remainingCents - use;

            if (newRemaining === 0) {
              await tx.creditVoucher.delete({ where: { id: v.id } });
            } else {
              await tx.creditVoucher.update({
                where: { id: v.id },
                data: { remainingCents: newRemaining },
              });
            }
          }

          // Hard safety: if mismatch, abort transaction so we don't create inconsistent booking/payment
          if (remainingToConsume !== 0) {
            throw new Error("Credit voucher consumption mismatch");
          }
        }

        return booking;
      });

      /**
       * 12) If nothing left to pay, skip Stripe entirely.
       * Important: checkoutUrl MUST be null here.
       */
      if (payableCents === 0) {
        return res.status(201).json({
          booking,
          checkoutUrl: null,
          priceSummary: breakdownJson,
          creditsAppliedCents,
          payableCents,
        });
      }

      /**
       * 13) Create Stripe Checkout Session (cashDueNowCents only)
       * Booking remains pending until webhook confirms payment.
       */
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: guestEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: payableCents,
              product_data: {
                name: `Booking #${booking.id}`,
                description: `${property.title} • ${start.toISOString().slice(0, 10)} → ${end
                  .toISOString()
                  .slice(0, 10)}`,
              },
            },
          },
        ],
        success_url: `${process.env.APP_URL}/booking/success?bookingId=${booking.id}`,
        cancel_url: `${process.env.APP_URL}/booking/cancelled?bookingId=${booking.id}`,
        metadata: {
          bookingId: String(booking.id),
          userId: String(userId),
          creditsAppliedCents: String(creditsAppliedCents),
          useCredit: String(useCredit === true),
        },
      });

      // Persist Stripe session id so the webhook can reconcile payment properly
      await prisma.payment.update({
        where: { bookingId: booking.id },
        data: { stripeSessionId: session.id },
      });

      return res.status(201).json({
        booking,
        checkoutUrl: session.url,
        priceSummary: breakdownJson,
        creditsAppliedCents,
        payableCents,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/bookings/quote
 *
 * Returns an authoritative price breakdown + policy-related payment split
 * WITHOUT creating a booking and WITHOUT consuming credit vouchers.
 *
 * Why:
 * - Enables a "review before pay" summary step.
 * - Keeps booking creation atomic ONLY when the user confirms.
 *
 * Notes:
 * - Validates dates, min nights, max guests, and availability the same way as booking creation.
 * - If useCredit=true, calculates the maximum credits that WOULD be applied (but does not consume).
 * - Refund policy reminder:
 *   - creditsAppliedCents are non-refundable
 *   - refunds only ever apply to cash paid to Stripe
 */
bookingRouter.post(
  "/quote",
  optionalAuthMiddleware,
  validateBody(bookingQuoteSchema),
  async (req, res, next) => {
    try {
      const {
        propertyId,
        startDate,
        endDate,
        adults,
        children,
        babies,
        useCredit,
      } = req.body as any;

      const countedGuests = Number(adults) + Number(children);

      const start = parseDateOnlyToUtcMidnight(startDate);
      const end = parseDateOnlyToUtcMidnight(endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid dates" });
      }
      if (start >= end) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Customers must be logged in to review/pay (consistent with booking creation).
      const userId = req.user?.userId ?? null;
      const role = req.user?.role ?? "CUSTOMER";
      if (role !== "ADMIN" && !userId) {
        return res.status(401).json({ message: "Please login to review and pay." });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property) return res.status(404).json({ message: "Property not found" });

      const propertyDefaultMinNights = (property as any).minNights ?? 1;
      const propertyDefaultMaxGuests = property.maxGuests;
      const propertyDefaultNightlyPrice = property.pricePerNight;

      // babies excluded
      if (countedGuests > propertyDefaultMaxGuests) {
        return res.status(400).json({
          message: `Max guests for this property is ${propertyDefaultMaxGuests}`,
        });
      }

      const isTaken = await isDateRangeTaken(propertyId, start, end);
      if (isTaken) {
        return res.status(409).json({ message: "These dates are not available for this property" });
      }

      const nights = nightsBetween(start, end);
      if (nights <= 0) return res.status(400).json({ message: "Stay must be at least 1 night" });

      const coverage = await getOpenPeriodSegments({
        propertyId,
        startDate: start,
        endDate: end,
      });

      if (!coverage.ok) {
        return res.status(409).json({
          message:
            coverage.reason === "CLOSED"
              ? "These dates are not available (closed period)"
              : "These dates are not available",
        });
      }

      const arrivalPeriod = coverage.segments[0]?.period ?? null;

      const arrivalMinNights = arrivalPeriod?.minNights ?? propertyDefaultMinNights;
      if (nights < arrivalMinNights) {
        return res.status(400).json({
          message: `Minimum stay for these dates is ${arrivalMinNights} nights`,
        });
      }

      const strictestMaxGuests = Math.min(
        propertyDefaultMaxGuests,
        ...coverage.segments.map((s) => s.period?.maxGuests ?? propertyDefaultMaxGuests)
      );

      if (countedGuests > strictestMaxGuests) {
        return res.status(400).json({
          message: `Max guests for selected dates is ${strictestMaxGuests}`,
        });
      }

      // Compute totals + segment breakdown
      let baseTotal = 0;

      const segmentBreakdown = coverage.segments.map((seg) => {
        const segNights = nightsBetween(seg.from, seg.to);
        const nightly = seg.period?.standardNightlyPrice ?? propertyDefaultNightlyPrice;

        const segTotal = segNights * nightly;
        baseTotal += segTotal;

        return {
          periodId: seg.period?.id ?? null,
          from: seg.from.toISOString().slice(0, 10),
          to: seg.to.toISOString().slice(0, 10),
          nights: segNights,
          nightlyPrice: nightly,
          segmentTotal: segTotal,
        };
      });

      const weekly = applyWeeklyDiscount({
        baseTotal,
        nights,
        weeklyThresholdNights: arrivalPeriod?.weeklyThresholdNights ?? 7,
        weeklyDiscountPercentBps: arrivalPeriod?.weeklyDiscountPercentBps ?? null,
      });

      const totalPrice = weekly.total; // EUR int
      const totalDueCents = totalPrice * 100;

      // Credit estimate (NOT consumed here)
      let creditsAppliedCents = 0;
      let payableCents = totalDueCents;

      if (useCredit === true) {
        const now = new Date();

        // Admin quote never applies credit logic (admin flow is separate)
        if (role !== "ADMIN" && userId) {
          const vouchers = await prisma.creditVoucher.findMany({
            where: { userId, currency: "eur", status: "active" },
            orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
          });

          let remainingToCover = totalDueCents;

          for (const v of vouchers) {
            if (remainingToCover <= 0) break;
            if (v.remainingCents <= 0) continue;
            if (v.expiresAt && v.expiresAt.getTime() <= now.getTime()) continue;

            const use = Math.min(v.remainingCents, remainingToCover);
            remainingToCover -= use;
            creditsAppliedCents += use;
          }

          payableCents = Math.max(0, totalDueCents - creditsAppliedCents);
        }
      }

      const breakdownJson = {
        currency: "eur",

        nights,
        segments: segmentBreakdown,
        baseTotalEur: baseTotal,
        weeklyDiscountAppliedBps: weekly.appliedBps ?? null,
        totalEur: totalPrice,

        grossTotalCents: totalDueCents,
        creditsAppliedCents,
        cashDueNowCents: payableCents,
        creditRefundable: false,
        refundPolicyAppliesTo: "cash_paid_to_stripe_only",
      };

       // Refund policy preview for the selected dates (tier depends on "days before check-in").
      const now = new Date();
      const daysBefore = daysBeforeStart(now, start);
      const refundTier = getRefundTier(daysBefore);

      return res.status(200).json({
        priceSummary: breakdownJson,
        creditsAppliedCents,
        payableCents,

        refundPolicy: {
          tiers: REFUND_POLICY,
          daysBeforeCheckIn: daysBefore,
          applicableTier: refundTier,
          // IMPORTANT: Your system refunds only cash paid to Stripe (credits are non-refundable).
          appliesTo: "cash_paid_to_stripe_only",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);




