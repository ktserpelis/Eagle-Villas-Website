import { prisma } from "../prismaClient.js";

/**
 * Constant used for date arithmetic under the assumption that
 * start/end are "date-only" values normalized to UTC midnight.
 *
 * If you ever allow time-of-day (check-in at 15:00), this approach becomes risky
 * because DST changes can make a "day" not exactly 24h in local time.
 * In this project we intentionally treat bookings as [startDate, endDate) date ranges
 * (check-in/check-out), so this is safe as long as inputs are normalized.
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Returns the number of nights in a booking for a [start, end) range.
 *
 * Important invariant:
 * - start and end should represent "date-only" boundaries (e.g. UTC midnight),
 *   and end must be strictly after start.
 *
 * Why Math.round and not Math.floor?
 * - When inputs are normalized to UTC midnight, the division should be an integer.
 * - Math.round provides a small tolerance if a date has a time component by mistake
 *   (though ideally you normalize earlier and never rely on tolerance here).
 */
export function nightsBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Prevent overlapping periods per property.
 *
 * Why this exists:
 * - Overlapping periods create ambiguous pricing/rules unless you define precedence.
 * - Your pricing logic currently uses "the period that covers this night" and assumes
 *   a single correct answer for any given date.
 *
 * When you should call this:
 * - On create period
 * - On update period dates
 *
 * When you might NOT need it:
 * - If your admin UI enforces non-overlap already AND you trust it fully.
 * - If you later implement a priority-based resolution model for overlapping periods.
 *
 * NOTE:
 * - This function is not used by booking creation directly; bookings can still be priced
 *   even if periods overlap, but results may be inconsistent.
 */
export async function ensureNoPeriodOverlap(params: {
  propertyId: number;
  startDate: Date;
  endDate: Date;
  ignorePeriodId?: number;
}) {
  const { propertyId, startDate, endDate, ignorePeriodId } = params;

  /**
   * Overlap condition:
   * - existing.start < new.end AND existing.end > new.start
   * This is the canonical interval overlap check for half-open ranges.
   */
  const overlap = await prisma.bookingPeriod.findFirst({
    where: {
      propertyId,
      ...(ignorePeriodId ? { id: { not: ignorePeriodId } } : {}),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true },
  });

  if (overlap) {
    const err: any = new Error("Period overlaps an existing period");
    err.status = 409;
    throw err;
  }
}

/**
 * Build contiguous segments covering [startDate, endDate) using booking periods.
 *
 * Output:
 * - segments: an array of { period, from, to } with no gaps and no overlaps,
 *   and where each segment spans a contiguous range of nights.
 *
 * Rules:
 * - If a night is covered by an OPEN period -> segment.period = that period
 * - If a night is NOT covered by any period -> fail fast (reason=NO_PERIOD)
 * - If a night is covered by a CLOSED period -> fail fast (reason=CLOSED)
 *
 * Important invariants / assumptions:
 * 1) startDate/endDate are normalized "date-only" boundaries (UTC midnight).
 * 2) Periods are ideally non-overlapping (see ensureNoPeriodOverlap). If they overlap,
 *    covering(cursor) will pick the first matching period in array order, which may
 *    not match admin intent.
 * 3) We treat the booking as [startDate, endDate) (checkout exclusive).
 *
 * Complexity:
 * - This loops over segments, not nights. In the worst case of highly fragmented periods,
 *   it can still be fine, but note covering() uses .find() over periods each time,
 *   which is O(P) per segment. For large P you could optimize by indexing periods.
 *
 * Failure behavior:
 * - If ANY part of the requested range falls inside a closed period -> we fail
 *   and the booking route should reject the booking.
 * - If ANY part of the requested range is not covered by any period -> we fail
 *   and the booking route should reject the booking (default closed when no period).
 */
export async function getOpenPeriodSegments(params: {
  propertyId: number;
  startDate: Date;
  endDate: Date;
}) {
  const { propertyId, startDate, endDate } = params;

  /**
   * Fetch all periods that intersect with [startDate, endDate).
   * We only need potentially relevant periods to build segments.
   */
  const periods = await prisma.bookingPeriod.findMany({
    where: {
      propertyId,
      endDate: { gt: startDate },
      startDate: { lt: endDate },
    },
    orderBy: { startDate: "asc" },
  });

  const segments: Array<{
    period: any | null;
    from: Date;
    to: Date;
  }> = [];

  /**
   * Cursor walks forward until it reaches endDate. Each iteration produces one segment.
   * Segment boundaries are always aligned to either:
   * - the end of the covering period
   * - the start of the next period
   * - or endDate
   */
  let cursor = startDate;

  /**
   * Returns the first period that covers date d, if any.
   * NOTE: If periods overlap, "first" may be arbitrary. This is why we recommend
   * enforcing no overlaps for predictable pricing.
   */
  const covering = (d: Date) =>
    periods.find((p) => p.startDate <= d && p.endDate > d);

  /**
   * Returns the next period that starts after date d (based on sorted order).
   * Used to define how long a fallback segment should last.
   */
  const nextStartingAfter = (d: Date) =>
    periods.find((p) => p.startDate > d);

  while (cursor < endDate) {
    const p = covering(cursor);

    // Case A: Covered by a period
    if (p) {
      // If the covering period is closed, reject the whole booking request.
      if (!p.isOpen) {
        return {
          ok: false as const,
          reason: "CLOSED" as const,
          segments: [] as any[],
        };
      }

      /**
       * Segment runs until the earlier of:
       * - the end of the covering period
       * - the booking endDate
       *
       * This ensures segments do not exceed booking window.
       */
      const segEnd = p.endDate < endDate ? p.endDate : endDate;
      segments.push({ period: p, from: cursor, to: segEnd });
      cursor = segEnd;
      continue;
    }

    // Case B: Not covered by any period => default CLOSED (no fallback pricing)
    return {
      ok: false as const,
      reason: "NO_PERIOD" as const,
      segments: [] as any[],
    };
  }

  /**
   * If we reached here, we created a full coverage of [startDate, endDate)
   * using only open periods (no gaps).
   */
  return { ok: true as const, reason: null as null, segments };
}

/**
 * Booking.com-like weekly pricing:
 * If total nights >= threshold, apply percent discount to WHOLE stay total.
 *
 * Input:
 * - baseTotal is an integer (euros) computed from segment totals
 * - discount percent is in basis points (BPS), e.g. 1000 = 10%
 *
 * Notes:
 * - We apply to whole stay rather than only the nights beyond threshold.
 *   This matches your stated rule and keeps it simple.
 *
 * Rounding:
 * - We use Math.round to avoid fractional cents issues at the euro level.
 *   (If you later move to cents internally, adjust accordingly.)
 */
export function applyWeeklyDiscount(params: {
  baseTotal: number;
  nights: number;
  weeklyThresholdNights: number;
  weeklyDiscountPercentBps?: number | null;
}) {
  const { baseTotal, nights, weeklyThresholdNights, weeklyDiscountPercentBps } = params;

  if (!weeklyDiscountPercentBps) return { total: baseTotal, appliedBps: null as number | null };
  if (nights < weeklyThresholdNights) return { total: baseTotal, appliedBps: null as number | null };

  const discounted = Math.round(baseTotal * (1 - weeklyDiscountPercentBps / 10000));
  return { total: discounted, appliedBps: weeklyDiscountPercentBps };
}
