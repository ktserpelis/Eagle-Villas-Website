import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import { requireRole } from "../midleware/requireRole.js";

export const customerRouter = Router();

// GET /api/customer/bookings
customerRouter.get(
  "/bookings",
  authMiddleware,            // must be logged in
  requireRole("CUSTOMER"),   // and must be a CUSTOMER
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;

      const bookings = await prisma.booking.findMany({
        where: { userId }, // only bookings linked to this user
        orderBy: { startDate: "desc" },
        include: {
          property: true,  // include property info for display
        },
      });

      // For debugging, it's fine to return userId too;
      // you can remove userId from the JSON later if you want.
      return res.json({ bookings });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/customer/bookings/:id
 *
 * Used by Stripe success page polling:
 * - Customer can only access their own booking
 * - Returns booking (and property info for UI)
 */
customerRouter.get(
  "/bookings/:id",
  authMiddleware,
  requireRole("CUSTOMER"),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid booking id" });
      }

      const booking = await prisma.booking.findFirst({
        where: { id, userId }, // ✅ ensures ownership
        include: { property: true },
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      return res.json(booking);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/customer/credits
 *
 * Returns all credit vouchers for the logged-in customer
 */
customerRouter.get("/vouchers", authMiddleware, async (req, res) => {
  const { userId } = req.user!;
  const now = new Date();

  const vouchers = await prisma.creditVoucher.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      currency: true,
      originalBookingId: true,
      issuedCents: true,
      remainingCents: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const enrichedVouchers = vouchers.map((v) => {
    const isExpired =
      v.expiresAt !== null && v.expiresAt.getTime() < now.getTime();

    const isUsable =
      v.status === "active" &&
      !isExpired &&
      v.remainingCents > 0;

    return {
      ...v,
      isExpired,
      isUsable,
    };
  });

  const totalRemainingCents = enrichedVouchers
    .filter((v) => v.isUsable)
    .reduce((sum, v) => sum + v.remainingCents, 0);

  res.json({
    currency: enrichedVouchers[0]?.currency ?? "eur",
    totalRemainingCents,
    vouchers: enrichedVouchers,
  });
});

