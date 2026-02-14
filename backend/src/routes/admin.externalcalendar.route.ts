import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { validateBody } from "../midleware/validateBody.js";
import { upsertBookingComIcalSchema } from "@eagle-villas/shared/schemas/externalcalendar.schema";
import { syncBookingComForProperty } from "../services/bookingComIcalSync.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import { requireRole } from "../midleware/requireRole.js";

export const adminExternalCalendarsRouter = Router();

/**
 * PUT /api/admin/properties/:propertyId/bookingcom-ical
 * Save iCal URL + optionally sync immediately
 */
adminExternalCalendarsRouter.put(
  "/properties/:propertyId/bookingcom-ical",
  authMiddleware,
  requireRole("ADMIN"),
  validateBody(upsertBookingComIcalSchema),
  async (req, res, next) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (Number.isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property id" });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) return res.status(404).json({ message: "Property not found" });

      const { icalUrl, isEnabled } = req.body as { icalUrl: string; isEnabled?: boolean };

      const row = await prisma.externalCalendar.upsert({
        where: { propertyId_provider: { propertyId, provider: "BOOKING_COM" } },
        create: {
          propertyId,
          provider: "BOOKING_COM",
          icalUrl,
          isEnabled: isEnabled ?? true,
        },
        update: {
          icalUrl,
          ...(typeof isEnabled === "boolean" ? { isEnabled } : {}),
        },
      });

      // Sync immediately so admin sees blocks right away
      try {
        await syncBookingComForProperty(propertyId);
      } catch (e) {
        console.error("Immediate iCal sync failed:", e);
      }

      return res.json(row);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/calendar/property/:propertyId
 * Admin merged calendar for ONE property:
 * - DIRECT bookings (with guest info)
 * - BOOKING_COM blocks
 * - MANUAL blocks
 */
adminExternalCalendarsRouter.get(
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

      const rangeWhere =
        fromDate || toDate
          ? {
              AND: [
                ...(toDate ? [{ startDate: { lt: toDate } }] : []),
                ...(fromDate ? [{ endDate: { gt: fromDate } }] : []),
              ],
            }
          : {};

      const [direct, bookingCom, manual] = await Promise.all([
        prisma.booking.findMany({
          where: { propertyId, status: { in: ["pending", "confirmed"] }, ...(rangeWhere as any) },
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
      ]);

      return res.json([
        ...direct.map((b) => ({
          source: "DIRECT" as const,
          id: b.id,
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          guestsCount: b.guestsCount,
          totalPrice: b.totalPrice,
          createdAt: b.createdAt,
        })),
        ...bookingCom.map((x) => ({
          source: "BOOKING_COM" as const,
          id: x.id,
          startDate: x.startDate,
          endDate: x.endDate,
          summary: x.summary,
        })),
        ...manual.map((m) => ({
          source: "MANUAL" as const,
          id: m.id,
          startDate: m.startDate,
          endDate: m.endDate,
          reason: m.reason,
        })),
      ]);
    } catch (err) {
      next(err);
    }
  }
);
