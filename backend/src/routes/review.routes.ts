// backend/src/routes/review.routes.ts
//
// Review system routes (customer + admin).
//
// Design goals:
// - A review is tied to exactly one booking (1 review per booking).
// - Customers can only review their own confirmed, completed bookings.
// - Customers can create/edit/delete only their own reviews.
// - Admin can list and delete any review.
// - On low ratings (overall <= 3), we notify admin (DB notification if available, else console).
//
// Mounting example:
//   app.use("/api/reviews", reviewsRouter);
//   app.use("/api/admin/reviews", adminReviewsRouter);
//   app.use("/api", propertyReviewsRouter); // for /properties/:propertyId/reviews
//
// Notes:
// - This file assumes you already have prismaClient, authMiddleware, requireRole.
// - This file does not change any existing models besides relying on Review model you added.

import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import { requireRole } from "../midleware/requireRole.js";

export const reviewsRouter = Router();
export const adminReviewsRouter = Router();
export const propertyReviewsRouter = Router();

/**
 * Utility: safe numeric parsing with clear client errors.
 */
function toInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Utility: rating validator for 1..5 integer ratings.
 */
function isRating(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
}

/**
 * Utility: validate rating field and return a typed integer.
 * Throws an Error with a professional message (handled by caller).
 */
function requireRatingField(body: any, key: string): number {
  const val = body?.[key];
  if (!isRating(val)) {
    throw new Error(`${key} must be an integer between 1 and 5`);
  }
  return val;
}

/**
 * Admin notification hook for low-rated reviews.
 *
 * Implementation strategy:
 * - If your Prisma schema includes `AdminNotification`, we create a record.
 * - If not, we log to server console (so you still get visibility).
 *
 * You can later replace this with:
 * - Email to admin
 * - In-app admin inbox
 * - Slack webhook, etc.
 */
async function notifyAdminLowRating(params: {
  reviewId: number;
  bookingId: number;
  propertyId: number;
  overall: number;
  comment: string | null;
}) {
  // Defensive: only trigger for low ratings.
  if (params.overall > 3) return;

  // Attempt DB notification if the model exists in your schema.
  // If it doesn't exist, Prisma will throw; we catch and fallback to console.
  try {
    // @ts-expect-error - This call is intentionally best-effort and optional.
    await prisma.adminNotification.create({
      data: {
        type: "LOW_REVIEW",
        message: `Low review (overall ${params.overall}/5) for propertyId=${params.propertyId}, bookingId=${params.bookingId}, reviewId=${params.reviewId}`,
        meta: {
          reviewId: params.reviewId,
          bookingId: params.bookingId,
          propertyId: params.propertyId,
          overall: params.overall,
          comment: params.comment,
        },
      },
    });
  } catch {
    // Fallback: log for now. This keeps behavior working without new schema changes.
    console.warn(
      `[ADMIN NOTIFY] Low review detected: overall=${params.overall}, reviewId=${params.reviewId}, propertyId=${params.propertyId}, bookingId=${params.bookingId}`
    );
  }
}

/* =========================================================================================
 * CUSTOMER ROUTES
 * ========================================================================================= */

/**
 * POST /api/reviews
 *
 * Creates a new review for a booking (exactly one per booking).
 *
 * Body:
 * {
 *   bookingId: number,
 *   cleanliness: 1..5,
 *   comfort: 1..5,
 *   amenities: 1..5,
 *   location: 1..5,
 *   value: 1..5,
 *   overall: 1..5,
 *   comment?: string
 * }
 */
reviewsRouter.post(
  "/",
  authMiddleware,
  requireRole("CUSTOMER"),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;

      // Validate bookingId.
      const bookingId = toInt(req.body?.bookingId);
      if (!bookingId) {
        return res.status(400).json({ message: "bookingId is required and must be a number" });
      }

      // Fetch booking and enforce:
      // - ownership
      // - confirmed status
      // - stay completed (endDate <= now)
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          userId: true,
          propertyId: true,
          status: true,
          endDate: true,
        },
      });

      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (!booking.userId || booking.userId !== userId) {
        return res.status(403).json({ message: "You can only review your own booking" });
      }

      if (booking.status !== "confirmed") {
        return res.status(400).json({ message: "Booking must be confirmed to leave a review" });
      }

      if (new Date(booking.endDate).getTime() > Date.now()) {
        return res.status(400).json({ message: "You can review only after checkout (endDate)" });
      }

      // Enforce 1-review-per-booking at the application layer (and also via @unique in schema).
      const existing = await prisma.review.findUnique({
        where: { bookingId },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({ message: "A review already exists for this booking" });
      }

      // Validate rating fields with explicit, user-friendly errors.
      let cleanliness: number,
        comfort: number,
        amenities: number,
        location: number,
        value: number,
        overall: number;

      try {
        cleanliness = requireRatingField(req.body, "cleanliness");
        comfort = requireRatingField(req.body, "comfort");
        amenities = requireRatingField(req.body, "amenities");
        location = requireRatingField(req.body, "location");
        value = requireRatingField(req.body, "value");
        overall = requireRatingField(req.body, "overall");
      } catch (e: any) {
        return res.status(400).json({ message: e.message || "Invalid ratings payload" });
      }

      // Normalize comment: optional, trimmed, and stored as null when empty.
      const comment =
        typeof req.body?.comment === "string" && req.body.comment.trim().length > 0
          ? req.body.comment.trim()
          : null;

      // Create the review, tying it to booking, property, and user.
      const review = await prisma.review.create({
        data: {
          bookingId,
          propertyId: booking.propertyId,
          userId,
          cleanliness,
          comfort,
          amenities,
          location,
          value,
          overall,
          comment,
        },
      });

      // Notify admin when rating is low (overall <= 3).
      // This is best-effort and should never block the customer response.
      notifyAdminLowRating({
        reviewId: review.id,
        bookingId,
        propertyId: booking.propertyId,
        overall,
        comment,
      }).catch((err) => {
        console.warn("[ADMIN NOTIFY] Failed to notify admin about low rating:", err);
      });

      return res.status(201).json({ review });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/reviews/:id
 *
 * Updates an existing review owned by the current user.
 * Accepts any subset of rating fields and/or comment.
 */
reviewsRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("CUSTOMER"),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;

      const id = toInt(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid review id" });

      // Ensure the review exists and belongs to this user.
      const existing = await prisma.review.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!existing) return res.status(404).json({ message: "Review not found" });
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own review" });
      }

      // Build a partial update object.
      const data: any = {};
      const ratingKeys = ["cleanliness", "comfort", "amenities", "location", "value", "overall"] as const;

      for (const k of ratingKeys) {
        if (req.body?.[k] !== undefined) {
          if (!isRating(req.body[k])) {
            return res.status(400).json({ message: `${k} must be an integer between 1 and 5` });
          }
          data[k] = req.body[k];
        }
      }

      // Handle comment updates (allow clearing).
      if (req.body?.comment !== undefined) {
        if (req.body.comment === null || req.body.comment === "") data.comment = null;
        else if (typeof req.body.comment === "string") data.comment = req.body.comment.trim();
        else return res.status(400).json({ message: "comment must be a string" });
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updated = await prisma.review.update({
        where: { id },
        data,
      });

      return res.json({ review: updated });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/reviews/:id
 *
 * Deletes an existing review owned by the current user.
 */
reviewsRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("CUSTOMER"),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;

      const id = toInt(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid review id" });

      const existing = await prisma.review.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!existing) return res.status(404).json({ message: "Review not found" });
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own review" });
      }

      await prisma.review.delete({ where: { id } });
      return res.json({ message: "Review deleted" });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reviews/me
 *
 * Lists reviews owned by the current customer (for profile/dashboard UI).
 */
reviewsRouter.get(
  "/me",
  authMiddleware,
  requireRole("CUSTOMER"),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;

      const reviews = await prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { id: true, title: true, slug: true } },
          booking: { select: { id: true, startDate: true, endDate: true, status: true } },
        },
      });

      return res.json({ reviews });
    } catch (err) {
      next(err);
    }
  }
);

/* =========================================================================================
 * PUBLIC / PROPERTY ROUTES
 * ========================================================================================= */

/**
 * GET /api/properties/:propertyId/reviews
 *
 * Public endpoint to fetch reviews for a property + summary stats.
 * Useful for property details pages (stars, review count, etc.).
 */
propertyReviewsRouter.get("/properties/:propertyId/reviews", async (req, res, next) => {
  try {
    const propertyId = toInt(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ message: "Invalid propertyId" });

    const reviews = await prisma.review.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const count = reviews.length;

    // Compute averages with one decimal precision, returning null if no reviews exist.
    const avg = (vals: number[]) =>
      vals.length === 0 ? null : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;

    const avgOverall = avg(reviews.map((r) => r.overall));
    const avgCleanliness = avg(reviews.map((r) => r.cleanliness));
    const avgComfort = avg(reviews.map((r) => r.comfort));
    const avgAmenities = avg(reviews.map((r) => r.amenities));
    const avgLocation = avg(reviews.map((r) => r.location));
    const avgValue = avg(reviews.map((r) => r.value));

    return res.json({
      count,
      averages: {
        overall: avgOverall,
        cleanliness: avgCleanliness,
        comfort: avgComfort,
        amenities: avgAmenities,
        location: avgLocation,
        value: avgValue,
      },
      reviews,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reviews/latest
 *
 * Public endpoint that returns the most recent reviews across all properties.
 * Intended for global widgets (homepage/hero mini reviews) where reviews are not property-specific.
 *
 * Query params:
 * - limit: number (default 12, max 50)
 *
 * Response:
 * - count: number of reviews returned
 * - averages: overall average across returned reviews (null if none)
 * - reviews: list of review records with user and property summary
 */
propertyReviewsRouter.get("/reviews/latest", async (req, res, next) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(50, limitRaw))
      : 12;

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        property: { select: { id: true, slug: true, title: true } },
      },
    });

    const count = reviews.length;

    /**
     * Average helper returns null if there are no numeric values.
     * Values are rounded to one decimal to match the rest of the UI.
     */
    const avg = (vals: number[]) =>
      vals.length === 0
        ? null
        : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;

    const avgOverall = avg(reviews.map((r) => r.overall).filter((v) => typeof v === "number"));

    return res.json({
      count,
      averages: { overall: avgOverall },
      reviews,
    });
  } catch (err) {
    next(err);
  }
});


/* =========================================================================================
 * ADMIN ROUTES
 * ========================================================================================= */

/**
 * GET /api/admin/reviews
 *
 * Admin moderation listing with optional filters + pagination.
 *
 * Query params:
 * - propertyId?: number
 * - minOverall?: number (1..5)
 * - maxOverall?: number (1..5)
 * - q?: string   (searches comment + guest/user name)
 * - page?: number (default 1)
 * - pageSize?: number (default 25, max 100)
 */
adminReviewsRouter.get(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const propertyId = req.query.propertyId ? toInt(req.query.propertyId) : null;

      const minOverall = req.query.minOverall ? toInt(req.query.minOverall) : null;
      const maxOverall = req.query.maxOverall ? toInt(req.query.maxOverall) : null;

      // Validate rating filters when provided.
      if (minOverall !== null && !isRating(minOverall)) {
        return res.status(400).json({ message: "minOverall must be an integer between 1 and 5" });
      }
      if (maxOverall !== null && !isRating(maxOverall)) {
        return res.status(400).json({ message: "maxOverall must be an integer between 1 and 5" });
      }

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

      const page = Math.max(1, toInt(req.query.page) ?? 1);
      const pageSizeRaw = toInt(req.query.pageSize) ?? 25;
      const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
      const skip = (page - 1) * pageSize;

      // Build a flexible where clause based on filters.
      const where: any = {};

      if (propertyId) where.propertyId = propertyId;

      if (minOverall !== null || maxOverall !== null) {
        where.overall = {};
        if (minOverall !== null) where.overall.gte = minOverall;
        if (maxOverall !== null) where.overall.lte = maxOverall;
      }

      if (q.length > 0) {
        // Search in comment and in user's name (if present).
        where.OR = [
          { comment: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
        ];
      }

      // Execute count + page query.
      const [total, reviews] = await Promise.all([
        prisma.review.count({ where }),
        prisma.review.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: {
            property: { select: { id: true, title: true, slug: true } },
            user: { select: { id: true, name: true, email: true } },
            booking: { select: { id: true, startDate: true, endDate: true, status: true } },
          },
        }),
      ]);

      return res.json({
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        reviews,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/properties/:propertyId/reviews
 *
 * Convenience admin endpoint: quickly list all reviews for a property (no filters needed in UI).
 * Supports basic pagination.
 */
adminReviewsRouter.get(
  "/properties/:propertyId/reviews",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const propertyId = toInt(req.params.propertyId);
      if (!propertyId) return res.status(400).json({ message: "Invalid propertyId" });

      const page = Math.max(1, toInt(req.query.page) ?? 1);
      const pageSizeRaw = toInt(req.query.pageSize) ?? 25;
      const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
      const skip = (page - 1) * pageSize;

      const [total, reviews] = await Promise.all([
        prisma.review.count({ where: { propertyId } }),
        prisma.review.findMany({
          where: { propertyId },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: {
            user: { select: { id: true, name: true, email: true } },
            booking: { select: { id: true, startDate: true, endDate: true, status: true } },
          },
        }),
      ]);

      return res.json({
        propertyId,
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        reviews,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/admin/reviews/:id
 *
 * Admin can delete any review (moderation).
 * If you later decide to avoid data loss, convert this into a "hide" flag instead of hard delete.
 */
adminReviewsRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const id = toInt(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid review id" });

      const existing = await prisma.review.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) return res.status(404).json({ message: "Review not found" });

      await prisma.review.delete({ where: { id } });

      return res.json({ message: "Review deleted (admin)" });
    } catch (err) {
      next(err);
    }
  }
);
