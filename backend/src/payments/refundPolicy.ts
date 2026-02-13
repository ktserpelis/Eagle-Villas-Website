/**
 * refundPolicy.ts
 *
 * Centralized cancellation refund policy.
 *
 * Design goals:
 * - Backend is the source of truth for policy selection and calculation.
 * - Refund policy is deterministic and can be safely previewed.
 * - Use "basis points" (bps) to avoid floating point drift (1% = 100 bps).
 *
 * Policy rules:
 * - 60+ days: 100% refund
 * - 30–59 days: 50% refund
 * - 15–29 days: 25% refund
 * - <15 days: 0% refund + 80% voucher credit
 */

export type RefundTierKey = "60_plus" | "30_to_59" | "15_to_29" | "lt_15";

/**
 * Refund tier definition.
 * - refundBps: cash refund percentage in basis points (bps)
 * - voucherBps: voucher percentage in basis points (bps)
 */
export type RefundTier = {
  key: RefundTierKey;
  minDaysBefore: number; // inclusive
  maxDaysBefore: number | null; // inclusive, null => infinity
  label: string;
  description: string;
  refundBps: number;
  voucherBps: number;
};

/**
 * Canonical refund policy snapshot.
 * This is safe to return to the frontend for display.
 */
export const REFUND_POLICY: RefundTier[] = [
  {
    key: "60_plus",
    minDaysBefore: 60,
    maxDaysBefore: null,
    label: "60+ days before check-in",
    description: "Full refund to your original payment method.",
    refundBps: 10_000,
    voucherBps: 0,
  },
  {
    key: "30_to_59",
    minDaysBefore: 30,
    maxDaysBefore: 59,
    label: "30–59 days before check-in",
    description: "50% refund to your original payment method.",
    refundBps: 5_000,
    voucherBps: 0,
  },
  {
    key: "15_to_29",
    minDaysBefore: 15,
    maxDaysBefore: 29,
    label: "15–29 days before check-in",
    description: "25% refund to your original payment method.",
    refundBps: 2_500,
    voucherBps: 0,
  },
  {
    key: "lt_15",
    minDaysBefore: 0,
    maxDaysBefore: 14,
    label: "Less than 15 days before check-in",
    description: "No cash refund. 80% voucher credit for future bookings.",
    refundBps: 0,
    voucherBps: 8_000,
  },
];

/**
 * Returns the policy tier for a given daysBefore value.
 * - daysBefore is clamped at 0 (negative means booking already started/expired).
 */
export function getRefundTier(daysBefore: number): RefundTier {
  const d = Math.max(0, Math.floor(daysBefore));

  // Highest tier first ensures correct matching when maxDaysBefore is null.
  for (const tier of REFUND_POLICY) {
    const minOk = d >= tier.minDaysBefore;
    const maxOk = tier.maxDaysBefore === null ? true : d <= tier.maxDaysBefore;
    if (minOk && maxOk) return tier;
  }

  // Defensive fallback (should never happen due to lt_15 tier).
  return REFUND_POLICY[REFUND_POLICY.length - 1];
}

/**
 * Computes the cash refund + voucher outcome (in cents) for a cancellation.
 * - bookingTotalCents must be an integer
 * - Uses tier bps for stable math
 */
export function computeRefundOutcome(daysBefore: number, bookingTotalCents: number): {
  refundCents: number;
  voucherCents: number;
} {
  const tier = getRefundTier(daysBefore);

  const total = Math.max(0, Math.floor(bookingTotalCents));

  // Basis point math: (total * bps) / 10_000
  const refundCents = Math.floor((total * tier.refundBps) / 10_000);
  const voucherCents = Math.floor((total * tier.voucherBps) / 10_000);

  return { refundCents, voucherCents };
}

/**
 * Days before check-in:
 * - If start is earlier than now, returns 0.
 * - Otherwise, returns whole days between now and start.
 */
export function daysBeforeStart(now: Date, start: Date): number {
  const nowMs = now.getTime();
  const startMs = start.getTime();
  const diffMs = startMs - nowMs;

  if (diffMs <= 0) return 0;

  // Convert milliseconds to whole days.
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
