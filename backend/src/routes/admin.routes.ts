import { Router } from "express";
import { authMiddleware } from "../midleware/authMiddleware.js";
import { requireRole } from "../midleware/requireRole.js";
import { prisma } from "../prismaClient.js";
import {
  createPropertySchema,
  updatePropertySchema,
} from "@eagle-villas/shared/schemas/property.schema"; // adjust path/extension as needed

const router = Router();

// Simple helper to generate a slug from title
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** List all properties */
router.get(
  "/properties",
  authMiddleware,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const properties = await prisma.property.findMany({
        include: {
          images: true,
          features: true,
          amenities: true,
          policies: true,
        },
      });
      res.json({ properties });
    } catch {
      res.status(500).json({ message: "Failed to load properties" });
    }
  }
);

/** Create property */
router.post(
  "/properties",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      // 1. Validate with Zod
      const parsed = createPropertySchema.safeParse(req.body);

      if (!parsed.success) {
        const { fieldErrors } = parsed.error.flatten();
        return res.status(400).json({
          message: "Invalid property data",
          errors: fieldErrors,
        });
      }

     const {
        title,
        description,
        address,
        city,
        country,
        pricePerNight,
        maxGuests,
        images,
        bookingComIcalUrl,
        bookingComIcalEnabled,

        longDescription,
        checkInFrom,
        checkInTo,
        checkOutUntil,
        weeklyDiscountBps,
        bedrooms,
        bathrooms,
        areaSqm,
        latitude,
        longitude,
        minNights,
        cleaningFeeCents,
        featureKeys,
        amenities,
        policies,
        tags,
      } = parsed.data;
      const slug = generateSlug(title);

      const property = await prisma.property.create({
        data: {
          title,
          slug,
          description,
          address,
          city,
          country,
          pricePerNight,
          maxGuests,
          //optional scalars
          ...(longDescription !== undefined ? { longDescription } : {}),
          ...(checkInFrom !== undefined ? { checkInFrom } : {}),
          ...(checkInTo !== undefined ? { checkInTo } : {}),
          ...(checkOutUntil !== undefined ? { checkOutUntil } : {}),
          ...(weeklyDiscountBps !== undefined ? { weeklyDiscountBps } : {}),
          ...(bedrooms !== undefined ? { bedrooms } : {}),
          ...(bathrooms !== undefined ? { bathrooms } : {}),
          ...(areaSqm !== undefined ? { areaSqm } : {}),
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(minNights !== undefined ? { minNights } : {}),
          ...(cleaningFeeCents !== undefined ? { cleaningFeeCents } : {}),
          ...(tags !== undefined ? { tags } : {}),

          ...(Array.isArray(images) && images.length
            ? {
                images: {
                  create: images.map((url, index) => ({
                    url,
                    sortOrder: index,
                  })),
                },
              }
            : {}),

            ...(Array.isArray(featureKeys) && featureKeys.length
            ? {
                features: {
                  create: featureKeys.map((key, index) => ({
                    key,
                    sortOrder: index,
                  })),
                },
              }
            : {}),

          ...(Array.isArray(amenities) && amenities.length
            ? {
                amenities: {
                  create: amenities.map((label, index) => ({
                    label,
                    sortOrder: index,
                  })),
                },
              }
            : {}),

          ...(Array.isArray(policies) && policies.length
            ? {
                policies: {
                  create: policies.map((label, index) => ({
                    label,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
                  },
        include: { images: true, features: true, amenities: true, policies: true },
      });

      // Check for ical link and add it if it is given 
      if (bookingComIcalUrl) {
      await prisma.externalCalendar.upsert({
        where: { propertyId_provider: { propertyId: property.id, provider: "BOOKING_COM" } },
        create: {
          propertyId: property.id,
          provider: "BOOKING_COM",
          icalUrl: bookingComIcalUrl,
          isEnabled: bookingComIcalEnabled ?? true,
        },
        update: {
          icalUrl: bookingComIcalUrl,
          ...(typeof bookingComIcalEnabled === "boolean" ? { isEnabled: bookingComIcalEnabled } : {}),
        },
      });
    }

      res.status(201).json({ property });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Failed to create property" });
    }
  }
);

/** Update property */
router.put(
  "/properties/:id",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      // 1. Validate with Zod (all fields optional)
      const parsed = updatePropertySchema.safeParse(req.body);

      if (!parsed.success) {
        const { fieldErrors } = parsed.error.flatten();
        return res.status(400).json({
          message: "Invalid property data",
          errors: fieldErrors,
        });
      }

      const data = parsed.data;

      const existing = await prisma.property.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ message: "Property not found" });
      }

      const {
        title,
        slug,
        description,
        address,
        city,
        country,
        pricePerNight,
        maxGuests,
        images,
        bookingComIcalUrl,
        bookingComIcalEnabled,

        // ✅ ADD THESE
        longDescription,
        checkInFrom,
        checkInTo,
        checkOutUntil,
        weeklyDiscountBps,
        bedrooms,
        bathrooms,
        areaSqm,
        latitude,
        longitude,
        minNights,
        cleaningFeeCents,
        featureKeys,
        amenities,
        policies,
        tags,
      } = data;

      const updateData: any = {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(country !== undefined ? { country } : {}),
        ...(pricePerNight !== undefined ? { pricePerNight } : {}),
        ...(maxGuests !== undefined ? { maxGuests } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(longDescription !== undefined ? { longDescription } : {}),
        ...(checkInFrom !== undefined ? { checkInFrom } : {}),
        ...(checkInTo !== undefined ? { checkInTo } : {}),
        ...(checkOutUntil !== undefined ? { checkOutUntil } : {}),
        ...(weeklyDiscountBps !== undefined ? { weeklyDiscountBps } : {}),
        ...(bedrooms !== undefined ? { bedrooms } : {}),
        ...(bathrooms !== undefined ? { bathrooms } : {}),
        ...(areaSqm !== undefined ? { areaSqm } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(minNights !== undefined ? { minNights } : {}),
        ...(cleaningFeeCents !== undefined ? { cleaningFeeCents } : {}),
        ...(tags !== undefined ? { tags } : {}),
      };

      // Simple images handling:
      // For now we ignore images in update (or you can implement full replace logic).
      // Example if you want to fully replace:
      if (images !== undefined) {
        await prisma.propertyImage.deleteMany({ where: { propertyId: id } });
        if (images.length) {
          await prisma.propertyImage.createMany({
            data: images.map((url, index) => ({
              propertyId: id,
              url,
              sortOrder: index,
            })),
          });
        }
      }

      // Replace features
      if (featureKeys !== undefined) {
        await prisma.propertyFeature.deleteMany({ where: { propertyId: id } });
        if (featureKeys.length) {
          await prisma.propertyFeature.createMany({
            data: featureKeys.map((key, index) => ({
              propertyId: id,
              key,
              sortOrder: index,
            })),
          });
        }
      }

      // Replace amenities
      if (amenities !== undefined) {
        await prisma.propertyAmenity.deleteMany({ where: { propertyId: id } });
        if (amenities.length) {
          await prisma.propertyAmenity.createMany({
            data: amenities.map((label, index) => ({
              propertyId: id,
              label,
              sortOrder: index,
            })),
          });
        }
      }

      // Replace policies
      if (policies !== undefined) {
        await prisma.propertyPolicy.deleteMany({ where: { propertyId: id } });
        if (policies.length) {
          await prisma.propertyPolicy.createMany({
            data: policies.map((label, index) => ({
              propertyId: id,
              label,
              sortOrder: index,
            })),
          });
        }
      }

      if (tags !== undefined) {
        updateData.tags = tags;
      }

      const updated = await prisma.property.update({
        where: { id },
        data: updateData,

        // include is only for relations; tags is a scalar and will be returned automatically
        include: { images: true, features: true, amenities: true, policies: true },
      });

      // Update ical link
      if (bookingComIcalUrl) {
        await prisma.externalCalendar.upsert({
          where: { propertyId_provider: { propertyId: updated.id, provider: "BOOKING_COM" } },
          create: {
            propertyId: updated.id,
            provider: "BOOKING_COM",
            icalUrl: bookingComIcalUrl,
            isEnabled: bookingComIcalEnabled ?? true,
          },
          update: {
            icalUrl: bookingComIcalUrl,
            ...(typeof bookingComIcalEnabled === "boolean" ? { isEnabled: bookingComIcalEnabled } : {}),
          },
        });
      }

      res.json({ property: updated });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Failed to update property" });
    }
  }
);

/** Delete property */
router.delete(
  "/properties/:id",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existing = await prisma.property.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ message: "Property not found" });
      }

      await prisma.property.delete({ where: { id } });

      res.json({ message: "Property deleted" });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Failed to delete property" });
    }
  }
);

/**
 * GET /api/admin/bookings
 *
 * Scalable admin bookings listing.
 *
 * Goals:
 * - Cursor pagination for DIRECT bookings (stable ordering, prevents huge payloads)
 * - Filters (bookingId exact match, q, status, propertyId, date overlap)
 * - Include payment/refund totals and priceBreakdown for expanded DIRECT view
 *
 * Source behavior:
 * - DIRECT bookings are always paginated (can become extremely large).
 * - BOOKING_COM / MANUAL blocks can also become extremely large over time.
 *   To keep responses safe by default:
 *   - If the request includes blocks (source=ALL/BOOKING_COM/MANUAL) and no from/to is provided,
 *     a default range window is applied (recent past + upcoming).
 *   - If from/to is provided, that range is used.
 *
 * Query params:
 * - source: ALL | DIRECT | BOOKING_COM | MANUAL (default ALL)
 * - bookingId: number (exact lookup; overrides pagination/filtering)
 * - q: string (free-text search; DIRECT only)
 * - status: pending | confirmed | cancelled (DIRECT only)
 * - propertyId: number (DIRECT + blocks)
 * - from/to: YYYY-MM-DD (date overlap filter)
 * - limit: 1..100 (DIRECT page size; default 50)
 * - cursorId: number (DIRECT cursor pagination)
 */
router.get(
  "/bookings",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      // -----------------------------
      // Parse query params
      // -----------------------------
      const source = (String(req.query.source ?? "ALL") as
        | "ALL"
        | "DIRECT"
        | "BOOKING_COM"
        | "MANUAL");

      const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;

      const limitRaw = req.query.limit ? Number(req.query.limit) : 50;
      const limit =
        Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

      const cursorId = req.query.cursorId ? Number(req.query.cursorId) : undefined;

      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;

      /**
       * Parse a date-only value into a UTC-midnight Date.
       * Accepted: "YYYY-MM-DD"
       */
      const parseDateOnlyToUtcMidnight = (value: string): Date => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date("invalid");
        const [y, m, d] = value.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      };

      /**
       * When blocks are requested without an explicit range, apply a default window.
       * This keeps responses small while still showing relevant external/manual blocks.
       *
       * Default window:
       * - from: today - 30 days
       * - to:   today + 365 days
       */
      const wantsBlocks = source === "ALL" || source === "BOOKING_COM" || source === "MANUAL";

      const ymdUTC = (d: Date) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      let effectiveFrom = from;
      let effectiveTo = to;

      if (wantsBlocks && (!effectiveFrom || !effectiveTo)) {
        const now = new Date();
        const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        const df = new Date(base);
        df.setUTCDate(df.getUTCDate() - 30);

        const dt = new Date(base);
        dt.setUTCDate(dt.getUTCDate() + 365);

        effectiveFrom = ymdUTC(df);
        effectiveTo = ymdUTC(dt);
      }

      const hasRange = Boolean(effectiveFrom && effectiveTo);
      const fromDate = hasRange ? parseDateOnlyToUtcMidnight(effectiveFrom!) : null;
      const toDate = hasRange ? parseDateOnlyToUtcMidnight(effectiveTo!) : null;

      if (hasRange) {
        if (Number.isNaN(fromDate!.getTime()) || Number.isNaN(toDate!.getTime())) {
          return res.status(400).json({ message: "Invalid from/to date (YYYY-MM-DD)" });
        }
        if (toDate! <= fromDate!) {
          return res.status(400).json({ message: "to must be after from" });
        }
      }

      // -----------------------------
      // 1) Exact bookingId lookup
      // -----------------------------
      if (Number.isFinite(bookingId)) {
        const b = await prisma.booking.findUnique({
          where: { id: bookingId! },
          include: {
            property: { select: { id: true, title: true, city: true, country: true } },
            user: { select: { id: true, name: true, email: true } },
            payment: {
              select: {
                provider: true,
                status: true,
                amountCents: true,
                refundedCents: true,
                creditsAppliedCents: true,
                currency: true,
              },
            },
            refunds: {
              select: { id: true, amountCents: true, status: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        const merged = b
          ? [
              {
                source: "DIRECT" as const,
                id: b.id,
                propertyId: b.propertyId,
                userId: b.userId,
                startDate: b.startDate,
                endDate: b.endDate,
                guestName: b.guestName,
                guestEmail: b.guestEmail,
                guestPhone: b.guestPhone,
                guestsCount: b.guestsCount,
                totalPrice: b.totalPrice,
                status: b.status,
                createdAt: b.createdAt,
                property: b.property,
                user: b.user ?? null,

                // Expanded admin details
                payment: b.payment ?? null,
                refunds: b.refunds ?? [],
                refundedTotalCents:
                  b.payment?.refundedCents ??
                  (b.refunds?.reduce((sum, r) => sum + (r.amountCents ?? 0), 0) ?? 0),
              },
            ]
          : [];

        return res.json({ bookings: merged, nextCursorId: null });
      }

      // -----------------------------
      // 2) DIRECT bookings query (paginated)
      // -----------------------------
      const wantsDirect = source === "ALL" || source === "DIRECT";

      const directWhere: any = {};

      if (propertyId && Number.isFinite(propertyId)) directWhere.propertyId = propertyId;

      // Status filter (DIRECT only)
      // Default behavior: exclude cancelled to keep the main admin list lightweight.
      // Cancelled bookings can still be fetched explicitly with status=cancelled,
      // and bookingId lookup still returns cancelled.
      if (status) {
        if (!["pending", "confirmed", "cancelled"].includes(status)) {
          return res.status(400).json({ message: "Invalid status filter" });
        }
        directWhere.status = status;
      } else {
        directWhere.status = { in: ["pending", "confirmed"] };
      }

      // Date overlap filter (DIRECT)
      if (hasRange) {
        directWhere.startDate = { lt: toDate! };
        directWhere.endDate = { gt: fromDate! };
      }

      // Free-text search (DIRECT only)
      if (q) {
        directWhere.OR = [
          { guestName: { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          {
            property: {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { country: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      let directItems: any[] = [];
      let nextCursorId: number | null = null;

      if (wantsDirect) {
        const page = await prisma.booking.findMany({
          where: directWhere,
          include: {
            property: { select: { id: true, title: true, city: true, country: true } },
            user: { select: { id: true, name: true, email: true } },
            payment: {
              select: {
                provider: true,
                status: true,
                amountCents: true,
                refundedCents: true,
                creditsAppliedCents: true,
                currency: true,
              },
            },
            refunds: {
              select: { id: true, amountCents: true, status: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            },
          },

          // Stable ordering for cursor pagination
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],

          // Cursor page
          take: limit + 1,
          ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        });

        const hasMore = page.length > limit;
        const slice = hasMore ? page.slice(0, limit) : page;

        directItems = slice.map((b) => ({
          source: "DIRECT" as const,
          id: b.id,
          propertyId: b.propertyId,
          userId: b.userId,
          startDate: b.startDate,
          endDate: b.endDate,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          guestsCount: b.guestsCount,
          totalPrice: b.totalPrice,
          status: b.status,
          createdAt: b.createdAt,
          property: b.property,
          user: b.user ?? null,

          // Expanded admin details
          payment: b.payment ?? null,
          refunds: b.refunds ?? [],
          refundedTotalCents:
            b.payment?.refundedCents ??
            (b.refunds?.reduce((sum, r) => sum + (r.amountCents ?? 0), 0) ?? 0),
        }));

        nextCursorId = hasMore ? slice[slice.length - 1].id : null;
      }

      // -----------------------------
      // 3) BOOKING_COM + MANUAL blocks (range windowed)
      // -----------------------------
      const includeBlocks = wantsBlocks && hasRange;

      let bookingComBlocks: any[] = [];
      let manualBlocks: any[] = [];

      if (includeBlocks) {
        const rangeWhere = {
          startDate: { lt: toDate! },
          endDate: { gt: fromDate! },
        };

        const [bcom, manual] = await Promise.all([
          source === "MANUAL"
            ? Promise.resolve([])
            : prisma.externalBlock.findMany({
                where: {
                  provider: "BOOKING_COM",
                  ...(propertyId && Number.isFinite(propertyId) ? { propertyId } : {}),
                  ...rangeWhere,
                },
                include: {
                  property: { select: { id: true, title: true, city: true, country: true } },
                },
                orderBy: { startDate: "asc" },
                take: 500,
              }),

          source === "BOOKING_COM"
            ? Promise.resolve([])
            : prisma.manualBlock.findMany({
                where: {
                  ...(propertyId && Number.isFinite(propertyId) ? { propertyId } : {}),
                  ...rangeWhere,
                },
                include: {
                  property: { select: { id: true, title: true, city: true, country: true } },
                },
                orderBy: { startDate: "asc" },
                take: 500,
              }),
        ]);

        bookingComBlocks = bcom.map((x) => ({
          source: "BOOKING_COM" as const,
          id: x.id,
          propertyId: x.propertyId,
          userId: null,
          startDate: x.startDate,
          endDate: x.endDate,
          guestName: x.summary ?? "Booking.com reservation",
          guestEmail: "",
          guestPhone: "",
          guestsCount: 0,
          totalPrice: 0,
          status: "confirmed",
          createdAt: (x as any).createdAt ?? x.startDate,
          property: x.property,
          user: null,
          summary: x.summary ?? null,
        }));

        manualBlocks = manual.map((m) => ({
          source: "MANUAL" as const,
          id: m.id,
          propertyId: m.propertyId,
          userId: null,
          startDate: m.startDate,
          endDate: m.endDate,
          guestName: m.reason ?? "Manual block",
          guestEmail: "",
          guestPhone: "",
          guestsCount: 0,
          totalPrice: 0,
          status: "blocked",
          createdAt: (m as any).createdAt ?? m.startDate,
          property: m.property,
          user: null,
          reason: m.reason ?? null,
        }));
      }

      const merged = [...directItems, ...bookingComBlocks, ...manualBlocks].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      return res.json({
        bookings: merged,
        nextCursorId,
      });
    } catch (err) {
      next(err);
    }
  }
);


/**
 * GET /api/admin/calendar/property/:propertyId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { blocks, periods }
 * - blocks: merged DIRECT + BOOKING_COM + MANUAL (DIRECT includes PII)
 * - periods: booking periods for that property (open/closed + pricing/rules)
 */
router.get(
  "/calendar/property/:propertyId",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (Number.isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property id" });
      }

      const { from, to } = req.query as { from?: string; to?: string };
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      if (fromDate && Number.isNaN(fromDate.getTime())) {
        return res.status(400).json({ message: "Invalid from date" });
      }
      if (toDate && Number.isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid to date" });
      }

      // overlap filter: start < to AND end > from
      const rangeWhere =
        fromDate || toDate
          ? {
              AND: [
                ...(toDate ? [{ startDate: { lt: toDate } }] : []),
                ...(fromDate ? [{ endDate: { gt: fromDate } }] : []),
              ],
            }
          : {};

      const [direct, bookingCom, manual, periods] = await Promise.all([
        prisma.booking.findMany({
          where: {
            propertyId,
            status: { in: ["pending", "confirmed"] },
            ...(rangeWhere as any),
          },
          orderBy: { startDate: "asc" },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            guestsCount: true,
            totalPrice: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
          },
        }),

        prisma.externalBlock.findMany({
          where: {
            propertyId,
            provider: "BOOKING_COM",
            ...(rangeWhere as any),
          },
          orderBy: { startDate: "asc" },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            summary: true,
          },
        }),

        prisma.manualBlock.findMany({
          where: {
            propertyId,
            ...(rangeWhere as any),
          },
          orderBy: { startDate: "asc" },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            reason: true,
          },
        }),

        // Change model name if yours differs (BookingPeriod vs Period)
        prisma.bookingPeriod.findMany({
          where: {
            propertyId,
            ...(rangeWhere as any),
          },
          orderBy: { startDate: "asc" },
        }),
      ]);

      const blocks = [
        ...direct.map((b) => ({
          source: "DIRECT" as const,
          id: b.id,
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
          guestsCount: b.guestsCount,
          totalPrice: b.totalPrice,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
        })),

        ...bookingCom.map((x) => ({
          source: "BOOKING_COM" as const,
          id: x.id,
          startDate: x.startDate,
          endDate: x.endDate,
          summary: x.summary ?? "Reserved",
        })),

        ...manual.map((m) => ({
          source: "MANUAL" as const,
          id: m.id,
          startDate: m.startDate,
          endDate: m.endDate,
          reason: m.reason ?? "Blocked",
        })),
      ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      return res.json({ blocks, periods });
    } catch (err) {
      next(err);
    }
  }
);


export default router;