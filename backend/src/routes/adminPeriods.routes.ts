import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { validateBody } from "../midleware/validateBody.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import {
  createBookingPeriodSchema,
  updateBookingPeriodSchema,
} from "@eagle-villas/shared/schemas/booking.period.schema";
import { ensureNoPeriodOverlap } from "../services/periods.service.js";

// NOTE: Make sure this path is correct in your project.
// In your other files you used "../midleware/...". Keep it consistent.
import { requireRole } from "../midleware/requireRole.js";

import { parseDateOnlyToUtcMidnight } from "../utils/dateOnly.js";

export const adminPeriodsRouter = Router();

/**
 * ADMIN PERIODS ROUTER
 * --------------------
 * Periods are the authoritative source for:
 * - nightly pricing (standardNightlyPrice)
 * - availability (isOpen)
 * - booking constraints (minNights, maxGuests)
 * - weekly discount settings (weeklyDiscountPercentBps + threshold)
 *
 * Critical design assumptions:
 * 1) Periods should not overlap for a given property.
 *    - Overlapping periods make pricing/rules ambiguous.
 *    - ensureNoPeriodOverlap enforces this at write-time.
 *
 * 2) Period dates represent date-only boundaries and periods cover half-open ranges:
 *    - A period covers dates in [startDate, endDate)
 *    - A booking covers dates in [startDate, endDate) and uses nights within that range
 *
 * 3) Deleting periods is restricted when bookings reference them.
 *    - The booking flow links bookingPeriodId = arrival period
 *    - That link is used for analytics/auditing and potentially admin reporting
 */

/**
 * GET /api/admin/properties/:propertyId/periods
 *
 * Returns all booking periods for a property sorted by start date.
 * Admin-only endpoint used by the period editor UI.
 *
 * Notes:
 * - We return the raw list; client can render/edit it.
 * - Sorting by startDate gives a stable timeline view.
 */
adminPeriodsRouter.get(
  "/properties/:propertyId/periods",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (Number.isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property id" });
      }

      const periods = await prisma.bookingPeriod.findMany({
        where: { propertyId },
        orderBy: { startDate: "asc" },
      });

      res.json(periods);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/periods
 *
 * Creates a new booking period.
 *
 * Key validations:
 * - Property must exist
 * - startDate/endDate must form a valid interval (implicitly validated by schema + Date parse)
 * - ensureNoPeriodOverlap prevents ambiguous pricing/rules
 *
 * Important:
 * - If you later want to support overlapping periods, you must define a resolution rule
 *   (priority, specificity, newest wins, etc.) and change both ensureNoPeriodOverlap and
 *   getOpenPeriodSegments().
 */
adminPeriodsRouter.post(
  "/periods",
  authMiddleware,
  requireRole("ADMIN"),
  validateBody(createBookingPeriodSchema),
  async (req, res, next) => {
    try {
      const body = req.body as any;

      // 1) Ensure property exists before creating a period under it
      const property = await prisma.property.findUnique({
        where: { id: body.propertyId },
      });
      if (!property) return res.status(404).json({ message: "Property not found" });

      // 2) Parse dates
      // - Keep admin UI sending YYYY-MM-DD (date-only)
      // - Normalize to UTC midnight on the server to avoid timezone surprises
     const startDate = parseDateOnlyToUtcMidnight(body.startDate);
     const endDate = parseDateOnlyToUtcMidnight(body.endDate);

     if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
       return res.status(400).json({ message: "Invalid dates" });
     }
     if (endDate <= startDate) {
       return res.status(400).json({ message: "End date must be after start date" });
     }


      // Optional hardening:
      // if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
      //   return res.status(400).json({ message: "Invalid dates" });
      // if (endDate <= startDate)
      //   return res.status(400).json({ message: "End date must be after start date" });

      // 3) Enforce non-overlap so pricing and rules remain deterministic
      await ensureNoPeriodOverlap({
        propertyId: body.propertyId,
        startDate,
        endDate,
      });

      // 4) Create period with defaults. These defaults must match your business logic:
      // - isOpen defaults to true
      // - weeklyThresholdNights defaults to 7
      // - minNights defaults to 1
      const period = await prisma.bookingPeriod.create({
        data: {
          propertyId: body.propertyId,
          startDate,
          endDate,
          isOpen: body.isOpen ?? true,
          standardNightlyPrice: body.standardNightlyPrice,
          weeklyDiscountPercentBps: body.weeklyDiscountPercentBps ?? null,
          weeklyThresholdNights: body.weeklyThresholdNights ?? 7,
          minNights: body.minNights ?? 1,
          maxGuests: body.maxGuests,
          name: body.name ?? null,
          notes: body.notes ?? null,
        },
      });

      res.status(201).json(period);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/admin/periods/:periodId
 *
 * Updates an existing period.
 *
 * Key behaviors:
 * - Loads current record and merges patch values with existing values
 * - Validates date interval if start/end change
 * - Enforces non-overlap excluding itself (ignorePeriodId)
 *
 * Why ignorePeriodId matters:
 * - Without it, the overlap check would always "overlap" with itself on updates.
 */
adminPeriodsRouter.patch(
  "/periods/:periodId",
  authMiddleware,
  requireRole("ADMIN"),
  validateBody(updateBookingPeriodSchema),
  async (req, res, next) => {
    try {
      const periodId = Number(req.params.periodId);
      if (Number.isNaN(periodId)) return res.status(400).json({ message: "Invalid period id" });

      const existing = await prisma.bookingPeriod.findUnique({ where: { id: periodId } });
      if (!existing) return res.status(404).json({ message: "Period not found" });

      const patch = req.body as any;

      // Compute proposed next interval
     const nextStart = patch.startDate
      ? parseDateOnlyToUtcMidnight(patch.startDate)
      : existing.startDate;

    const nextEnd = patch.endDate
      ? parseDateOnlyToUtcMidnight(patch.endDate)
      : existing.endDate;

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
      return res.status(400).json({ message: "Invalid dates" });
    }
    if (nextEnd <= nextStart) {
      return res.status(400).json({ message: "End date must be after start date" });
    }


      // Guard invalid intervals early
      if (nextEnd <= nextStart) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Enforce non-overlap among periods for the same property
      await ensureNoPeriodOverlap({
        propertyId: existing.propertyId,
        startDate: nextStart,
        endDate: nextEnd,
        ignorePeriodId: periodId,
      });

      // Apply patch using Prisma semantics:
      // - undefined -> do not change field
      // - null -> set to null (only used where allowed)
      const updated = await prisma.bookingPeriod.update({
        where: { id: periodId },
        data: {
          startDate: patch.startDate ? nextStart : undefined,
          endDate: patch.endDate ? nextEnd : undefined,
          isOpen: patch.isOpen ?? undefined,
          standardNightlyPrice: patch.standardNightlyPrice ?? undefined,
          weeklyDiscountPercentBps:
            patch.weeklyDiscountPercentBps === undefined ? undefined : patch.weeklyDiscountPercentBps,
          weeklyThresholdNights: patch.weeklyThresholdNights ?? undefined,
          minNights: patch.minNights ?? undefined,
          maxGuests: patch.maxGuests ?? undefined,
          name: patch.name === undefined ? undefined : patch.name,
          notes: patch.notes === undefined ? undefined : patch.notes,
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/admin/periods/:periodId
 *
 * Deletes a period only if it has no bookings referencing it.
 *
 * Why this restriction exists:
 * - Your booking flow links bookingPeriodId = "arrivalPeriod.id"
 * - Deleting would orphan that reference or destroy auditability
 *
 * Operational guidance:
 * - If a period should no longer be bookable, prefer setting isOpen=false
 *   rather than deleting it. That preserves history and prevents accidental
 *   rule changes for past bookings.
 */
adminPeriodsRouter.delete(
  "/periods/:periodId",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const periodId = Number(req.params.periodId);
      if (Number.isNaN(periodId)) return res.status(400).json({ message: "Invalid period id" });

      const existing = await prisma.bookingPeriod.findUnique({ where: { id: periodId } });
      if (!existing) return res.status(404).json({ message: "Period not found" });

      // Prevent deletion if any booking references this period.
      // This avoids breaking booking history and admin reporting.
      const bookingCount = await prisma.booking.count({ where: { bookingPeriodId: periodId } });
      if (bookingCount > 0) {
        return res.status(409).json({
          message: "Cannot delete a period that has bookings. Close it instead.",
        });
      }

      await prisma.bookingPeriod.delete({ where: { id: periodId } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/calendar/property/:propertyId?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns blocks (direct + booking.com + manual) AND periods.
 * This powers the "big admin calendar" view.
 *
 * Notes:
 * - Includes DIRECT bookings for status pending + confirmed.
 *   Pending bookings are important because they represent holds during payment flow.
 * - Includes periods so the admin calendar can show availability and pricing overlays.
 *
 * Date filtering:
 * - rangeWhere is built as an interval overlap filter:
 *   startDate < toDate AND endDate > fromDate
 * - If from/to are omitted, returns everything (could be large; UI usually passes range).
 */
adminPeriodsRouter.get(
  "/calendar/property/:propertyId",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (Number.isNaN(propertyId)) return res.status(400).json({ message: "Invalid property id" });

      const { from, to } = req.query as { from?: string; to?: string };
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      if (fromDate && Number.isNaN(fromDate.getTime())) return res.status(400).json({ message: "Invalid from date" });
      if (toDate && Number.isNaN(toDate.getTime())) return res.status(400).json({ message: "Invalid to date" });

      const rangeWhere =
        fromDate || toDate
          ? {
              AND: [
                ...(toDate ? [{ startDate: { lt: toDate } }] : []),
                ...(fromDate ? [{ endDate: { gt: fromDate } }] : []),
              ],
            }
          : {};

      // Fetch everything in parallel for performance (admin calendar often hits this frequently)
      const [direct, bookingCom, manual, periods] = await Promise.all([
        prisma.booking.findMany({
          where: {
            propertyId,
            status: { in: ["pending", "confirmed"] },
            ...(rangeWhere as any),
          },
          orderBy: { startDate: "asc" },
        }),
        prisma.externalBlock.findMany({
          where: { propertyId, provider: "BOOKING_COM", ...(rangeWhere as any) },
          orderBy: { startDate: "asc" },
        }),
        prisma.manualBlock.findMany({
          where: { propertyId, ...(rangeWhere as any) },
          orderBy: { startDate: "asc" },
        }),
        prisma.bookingPeriod.findMany({
          where: { propertyId },
          orderBy: { startDate: "asc" },
        }),
      ]);

      // Normalize to a single blocks array for the calendar UI.
      // Admin calendar includes extra booking details such as guestsCount and totalPrice.
      res.json({
        blocks: [
          ...direct.map((b) => ({
            source: "DIRECT",
            id: b.id,
            startDate: b.startDate,
            endDate: b.endDate,
            status: b.status,
            guestsCount: b.guestsCount,
            totalPrice: b.totalPrice,
          })),
          ...bookingCom.map((x) => ({
            source: "BOOKING_COM",
            id: x.id,
            startDate: x.startDate,
            endDate: x.endDate,
            summary: x.summary,
          })),
          ...manual.map((m) => ({
            source: "MANUAL",
            id: m.id,
            startDate: m.startDate,
            endDate: m.endDate,
            reason: m.reason,
          })),
        ],
        periods,
      });
    } catch (err) {
      next(err);
    }
  }
);
