import { Router } from "express";
import { prisma } from "../prismaClient.js";

export const publicIcalExportRouter = Router();

function icsEscape(s: string) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function yyyymmdd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function dtstampUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

/**
 * GET /api/ical/properties/:propertyId.ics
 * Public iCal export for ONE property (for Booking.com import)
 * Exports:
 * - DIRECT bookings (blocks dates)
 * - MANUAL blocks
 *
 * IMPORTANT: We do NOT export BOOKING_COM external blocks to avoid loops.
 */
publicIcalExportRouter.get("/ical/properties/:propertyId.ics", async (req, res, next) => {
  try {
    const propertyId = Number(req.params.propertyId);
    if (Number.isNaN(propertyId)) {
      return res.status(400).send("Invalid property id");
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, slug: true },
    });

    if (!property) {
      return res.status(404).send("Property not found");
    }

    const [direct, manual] = await Promise.all([
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { in: ["pending", "confirmed"] },
        },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
        },
      }),
      prisma.manualBlock.findMany({
        where: { propertyId },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          reason: true,
          updatedAt: true,
        },
      }),
    ]);

    const nowStamp = dtstampUTC();
    const events: string[] = [];

    for (const b of direct) {
      events.push(
        [
          "BEGIN:VEVENT",
          `UID:direct-${propertyId}-${b.id}@eagle-villas`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART;VALUE=DATE:${yyyymmdd(new Date(b.startDate))}`,
          `DTEND;VALUE=DATE:${yyyymmdd(new Date(b.endDate))}`,
          `SUMMARY:${icsEscape(`Reservation - ${property.title}`)}`,
          "END:VEVENT",
        ].join("\r\n")
      );
    }

    for (const m of manual) {
      events.push(
        [
          "BEGIN:VEVENT",
          `UID:manual-${propertyId}-${m.id}@eagle-villas`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART;VALUE=DATE:${yyyymmdd(new Date(m.startDate))}`,
          `DTEND;VALUE=DATE:${yyyymmdd(new Date(m.endDate))}`,
          `SUMMARY:${icsEscape(m.reason ? `Blocked - ${m.reason}` : `Blocked - ${property.title}`)}`,
          "END:VEVENT",
        ].join("\r\n")
      );
    }

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Eagle Villas//Availability//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
      "",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${property.slug || `property-${propertyId}`}.ics"`
    );
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(ics);
  } catch (err) {
    next(err);
  }
});
