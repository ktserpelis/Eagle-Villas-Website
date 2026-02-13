/**
 * Parse a date-only value into a UTC-midnight Date.
 *
 * Accepted inputs:
 * - "YYYY-MM-DD"        (preferred)
 * - full ISO string    (fallback; normalized to UTC date)
 *
 * Why this exists:
 * - Prevent timezone drift when admin or client is in a different locale
 * - Ensure all date math (nights, refunds, overlaps) works on date-only semantics
 * - Make DST changes irrelevant
 */
export function parseDateOnlyToUtcMidnight(value: string): Date {
  // Preferred format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }

  // Fallback: parse as Date and normalize to UTC date
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return dt;

  return new Date(
    Date.UTC(
      dt.getUTCFullYear(),
      dt.getUTCMonth(),
      dt.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}
