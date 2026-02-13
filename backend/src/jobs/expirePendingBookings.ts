import cron from "node-cron";
import { subMinutes } from "date-fns";
import { prisma } from "../prismaClient.js";

/**
 * Expire unpaid "pending" bookings so they don't block inventory forever.
 *
 * Strategy:
 * - Run every 15 minutes
 * - Expire bookings that are:
 *   - status === "pending"
 *   - createdAt < now - HOLD_MINUTES
 *   - have no cancellation record yet (so it's idempotent)
 *
 * For each expired booking:
 * - set status = "cancelled"
 * - create Cancellation record with reason="expired_unpaid"
 *
 * Note:
 * - We do NOT refund here because pending bookings should not be paid.
 * - If you ever allow "pending but paid" states, add logic to check payment.status.
 */

const HOLD_MINUTES = 30;

export function startExpirePendingBookingsJob() {
  // Every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    const cutoff = subMinutes(new Date(), HOLD_MINUTES);

    // Find candidates first (keeps logic explicit and safe)
    const candidates = await prisma.booking.findMany({
      where: {
        status: "pending",
        createdAt: { lt: cutoff },
        cancellation: null,
      },
      select: { id: true },
      take: 200, // safety cap; remove or increase if needed
    });

    if (candidates.length === 0) return;

    // Process each booking in its own transaction for correctness
    // (avoids one failure aborting all)
    for (const b of candidates) {
      await prisma.$transaction(async (tx) => {
        // Re-check inside tx to avoid races if webhook confirms between find and update
        const fresh = await tx.booking.findUnique({
          where: { id: b.id },
          include: { cancellation: true },
        });

        if (!fresh) return;
        if (fresh.status !== "pending") return;
        if (fresh.cancellation) return;

        await tx.booking.update({
          where: { id: b.id },
          data: { status: "cancelled" },
        });

        await tx.cancellation.create({
          data: {
            bookingId: b.id,
            policyRefundCents: 0,
            voucherIssuedCents: 0,
            reason: "expired_unpaid",
          },
        });
      });
    }
  });
}
