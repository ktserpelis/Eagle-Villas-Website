// src/components/dashboard/BookingCard.tsx

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BookingWithProperty } from "../../api/types";
import { CancelBookingModal } from "./CancelBookingModal";
import { RequestAdditionalBedModal } from "./RequestAdditionalBedModal";
import { ReviewModal } from "./ReviewModal";
import { useMyReviewsQuery, type Review } from "../../api/reviews";
import { useBookingRefundStatusQuery } from "../../api/payments"; // ✅ Refund status for cancelled bookings

/**
 * Local className join helper.
 * Kept in this file since it is UI-only and avoids a global dependency.
 */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Formats a date for dashboard display.
 * This is presentation-only (not used for business logic).
 */
function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Computes total nights between check-in/check-out.
 * Defensive: always returns at least 1 to keep UI stable.
 */
function nightsBetween(startISO: string, endISO: string) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  const diff = Math.max(0, e - s);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Human-friendly booking status labels.
 */
function prettyStatus(s: string) {
  const v = (s || "").toLowerCase();
  if (v === "confirmed") return "Confirmed";
  if (v === "pending") return "Pending";
  if (v === "cancelled") return "Cancelled";
  if (v === "rejected") return "Rejected";
  return s;
}

/**
 * Booking status pill styling.
 */
function statusPill(status: string) {
  const v = (status || "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset";

  if (v === "confirmed") return cn(base, "bg-emerald-50 text-emerald-700 ring-emerald-200");
  if (v === "pending") return cn(base, "bg-amber-50 text-amber-800 ring-amber-200");
  if (v === "cancelled") return cn(base, "bg-rose-50 text-rose-700 ring-rose-200");
  if (v === "rejected") return cn(base, "bg-slate-50 text-slate-700 ring-slate-200");
  return cn(base, "bg-slate-50 text-slate-700 ring-slate-200");
}

/**
 * Refund status pill styling.
 * Shown only when a booking is cancelled and a refund exists.
 */
function refundPill(status: "pending" | "succeeded" | "failed" | "canceled") {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset";

  if (status === "succeeded") return cn(base, "bg-emerald-50 text-emerald-700 ring-emerald-200");
  if (status === "pending") return cn(base, "bg-amber-50 text-amber-800 ring-amber-200");
  if (status === "failed") return cn(base, "bg-rose-50 text-rose-700 ring-rose-200");
  return cn(base, "bg-slate-50 text-slate-700 ring-slate-200");
}

/**
 * Human-friendly refund status labels.
 */
function prettyRefundStatus(status: "pending" | "succeeded" | "failed" | "canceled") {
  if (status === "pending") return "Refund pending";
  if (status === "succeeded") return "Refund completed";
  if (status === "failed") return "Refund failed";
  return "Refund canceled";
}

/**
 * Small “stat” tile used inside the booking card.
 */
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

/**
 * BookingCard responsibilities:
 * - Show booking summary and actions (view villa, cancel, request bed, review)
 * - Show refund status after cancellation (Stripe-confirmed, read-only)
 *
 * Notes:
 * - Refund status is fetched only for cancelled bookings to avoid extra requests.
 * - Review state is derived from a shared React Query list to avoid per-card spam.
 */
export function BookingCard({
  booking,
  onChanged,
}: {
  booking: BookingWithProperty;
  onChanged: () => void;
}) {
  const title = booking.property.title;
  const city = booking.property.city;
  const country = booking.property.country;

  /**
   * Defensive hero image fallback so the layout never breaks
   * even if a property is missing images.
   */
  const hero =
    (booking.property as any)?.heroImage ||
    (booking.property as any)?.image ||
    "/images/V_IMG_2764.webp";

  const nights = nightsBetween(booking.startDate, booking.endDate);

  const statusLower = (booking.status || "").toLowerCase();
  const now = Date.now();
  const isPast = new Date(booking.endDate).getTime() < now;

  /**
   * Cancellation rules (UI-only guard):
   * - cannot cancel past stays
   * - cannot cancel already cancelled/rejected bookings
   * - allow only pending/confirmed
   *
   * Backend still enforces all real rules.
   */
  const canCancel = useMemo(() => {
    if (isPast) return false;
    if (statusLower === "cancelled" || statusLower === "rejected") return false;
    return statusLower === "confirmed" || statusLower === "pending";
  }, [isPast, statusLower]);

  /**
   * Review eligibility:
   * - only after stay has ended
   * - only if booking was confirmed
   */
  const canReviewCreate = useMemo(() => statusLower === "confirmed" && isPast, [statusLower, isPast]);

  /**
   * Reviews query is shared across cards by React Query caching (same queryKey).
   * This avoids triggering a network request per BookingCard.
   */
  const my = useMyReviewsQuery(true);

  /**
   * Find if a review already exists for this booking.
   * Numeric comparison avoids string/number mismatches coming from APIs.
   */
  const existingReview: Review | null = useMemo(() => {
    const list = my.data?.reviews ?? [];
    const bookingIdNum = Number(booking.id);

    for (const r of list) {
      if (Number(r.bookingId) === bookingIdNum) return r;
    }
    return null;
  }, [my.data, booking.id]);

  const showReviewButton = !!existingReview || canReviewCreate;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [bedOpen, setBedOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  /**
   * Refund status query:
   * - Enabled only when booking is cancelled (performance)
   * - Read-only for the customer; actual truth is Stripe + backend webhooks
   */
  const refundQuery = useBookingRefundStatusQuery(Number(booking.id), statusLower === "cancelled");

  const refundStatus = refundQuery.data?.refund?.status ?? null;
  const refundAmountCents = refundQuery.data?.refund?.amountCents ?? null;
  const voucherIssuedCents = refundQuery.data?.cancellation?.voucherIssuedCents ?? 0;

  return (
    <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="grid sm:grid-cols-[140px_1fr] gap-0">
        <div className="relative h-32 sm:h-full">
          <img src={hero} alt={title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-slate-900 font-semibold leading-tight">{title}</p>
              <p className="text-slate-600 text-sm mt-0.5">
                {city}, {country}
              </p>

              {/* Refund status line: shown only after cancellation */}
              {statusLower === "cancelled" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* If a cash refund exists, show Stripe-confirmed status */}
                  {refundStatus && (
                    <span className={refundPill(refundStatus)}>
                      {prettyRefundStatus(refundStatus)}
                      {typeof refundAmountCents === "number" && refundAmountCents > 0
                        ? ` • €${(refundAmountCents / 100).toFixed(2)}`
                        : ""}
                    </span>
                  )}

                  {/* If no refund record but voucher was issued, show voucher note */}
                  {!refundStatus && voucherIssuedCents > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
                        "bg-slate-50 text-slate-700 ring-slate-200"
                      )}
                    >
                      Voucher issued • €{(voucherIssuedCents / 100).toFixed(2)}
                    </span>
                  )}

                  {/* Loading state (kept subtle to match existing card style) */}
                  {refundQuery.isLoading && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
                        "bg-slate-50 text-slate-700 ring-slate-200"
                      )}
                    >
                      Loading refund status…
                    </span>
                  )}
                </div>
              )}
            </div>

            <span className={statusPill(booking.status)}>{prettyStatus(booking.status)}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Info label="Check-in" value={formatDate(booking.startDate)} />
            <Info label="Check-out" value={formatDate(booking.endDate)} />
            <Info label="Nights" value={`${nights}`} />
            <Info label="Guests" value={`${booking.guestsCount}`} />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-slate-700 text-sm">
              Total:{" "}
              <span className="text-slate-900 font-semibold">
                €{Number(booking.totalPrice).toFixed(0)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/properties/${booking.property.slug}`}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                View villa
              </Link>

              <div className="rounded-full px-4 py-2 text-sm font-semibold bg-stone-50 text-slate-700 ring-1 ring-inset ring-stone-200">
                ID: {booking.id}
              </div>

              {showReviewButton && (
                <button
                  onClick={() => setReviewOpen(true)}
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition"
                >
                  {existingReview ? "View review" : "Leave review"}
                </button>
              )}

              {statusLower === "confirmed" && !isPast && (
                <button
                  onClick={() => setBedOpen(true)}
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition"
                >
                  Request additional bed
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-white text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 transition"
                >
                  Cancel booking
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3">Booking ID: {booking.id}</p>
        </div>
      </div>

      <CancelBookingModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        bookingId={booking.id}
        onCancelled={onChanged}
      />

      <RequestAdditionalBedModal
        open={bedOpen}
        onClose={() => setBedOpen(false)}
        bookingId={booking.id}
        onRequested={onChanged}
      />

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        bookingId={Number(booking.id)}
        villaTitle={title}
        existingReview={existingReview}
        onSubmitted={() => {
          // Ensure button switches to "View review" immediately after submit.
          my.refetch();
          onChanged();
        }}
      />
    </div>
  );
}
