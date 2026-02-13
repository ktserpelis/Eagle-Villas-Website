import * as icalNS from "node-ical";
import { request } from "undici";
import { prisma } from "../prismaClient.js";

const ical: any = (icalNS as any).default ?? icalNS;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function headerToString(value: string | string[] | undefined | null): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function syncBookingComForProperty(propertyId: number) {
  const cal = await prisma.externalCalendar.findUnique({
    where: { propertyId_provider: { propertyId, provider: "BOOKING_COM" } },
  });

  if (!cal || !cal.isEnabled) return { synced: false, reason: "no_calendar_or_disabled" as const };

  const headers: Record<string, string> = {};
  if (cal.etag) headers["If-None-Match"] = cal.etag;
  if (cal.lastModified) headers["If-Modified-Since"] = cal.lastModified;

  const resp = await request(cal.icalUrl, { headers });

  if (resp.statusCode === 304) {
    await prisma.externalCalendar.update({
      where: { id: cal.id },
      data: { lastSyncAt: new Date() },
    });
    return { synced: false, reason: "not_modified" as const };
  }

  if (resp.statusCode < 200 || resp.statusCode >= 300) {
    return { synced: false, reason: `http_${resp.statusCode}` as const };
  }

  const text = await resp.body.text();

  const parsed = ical.parseICS(text);
  const vevents = Object.values(parsed).filter((e: any) => e?.type === "VEVENT") as any[];

  const uids: string[] = [];

  for (const e of vevents) {
    const uid = String(e.uid ?? "").trim();
    const start = toDate(e.start);
    const end = toDate(e.end);
    if (!uid || !start || !end) continue;

    uids.push(uid);

    await prisma.externalBlock.upsert({
      where: { calendarId_externalUid: { calendarId: cal.id, externalUid: uid } },
      create: {
        calendarId: cal.id,
        propertyId: cal.propertyId,
        provider: "BOOKING_COM",
        externalUid: uid,
        startDate: start,
        endDate: end,
        summary: e.summary ? String(e.summary) : null,
      },
      update: {
        startDate: start,
        endDate: end,
        summary: e.summary ? String(e.summary) : null,
      },
    });
  }

  // ✅ Ensure deletions work even if feed becomes empty
  if (uids.length === 0) {
    await prisma.externalBlock.deleteMany({ where: { calendarId: cal.id } });
  } else {
    await prisma.externalBlock.deleteMany({
      where: { calendarId: cal.id, externalUid: { notIn: uids } },
    });
  }

  const etag = headerToString((resp.headers as any)["etag"]);
  const lastModified = headerToString((resp.headers as any)["last-modified"]);

  await prisma.externalCalendar.update({
    where: { id: cal.id },
    data: {
      etag: etag ?? cal.etag,
      lastModified: lastModified ?? cal.lastModified,
      lastSyncAt: new Date(),
    },
  });

  return { synced: true, count: uids.length };
}
