// src/pages/BookingSuccessPage.tsx
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomerBookingByIdQuery } from "../api/booking";
import { getApiErrorMessage } from "../api/apiError";

/**
 * Stripe return page (after payment).
 *
 * IMPORTANT:
 * - This page does NOT confirm the booking.
 * - It polls the backend until the Stripe webhook marks the booking as "confirmed".
 *
 * UX:
 * - Adds top padding to avoid overlap with a sticky/fixed navbar.
 * - Provides safe navigation links while we wait.
 */
export default function BookingSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const bookingIdRaw = params.get("bookingId");
  const bookingId = bookingIdRaw ? Number(bookingIdRaw) : NaN;
  const bookingIdValid = Number.isFinite(bookingId);

  const { data: booking, isLoading, isError, error, refetch } =
    useCustomerBookingByIdQuery(bookingId, bookingIdValid);

  /**
   * Poll backend every ~1.5s until booking becomes confirmed.
   * Webhooks are async, so this is normal.
   */
  useEffect(() => {
    if (!bookingIdValid) return;

    const interval = setInterval(() => {
      refetch();
    }, 1500);

    return () => clearInterval(interval);
  }, [bookingIdValid, refetch]);

  /**
   * When the webhook has confirmed the booking, move to the final page.
   * We pass the booking object through router state to avoid an extra refetch.
   */
  useEffect(() => {
    if (!booking) return;

    if ((booking.status || "").toLowerCase() === "confirmed") {
      navigate("/booking/confirmed", {
        replace: true,
        state: { booking },
      });
    }
  }, [booking, navigate]);

  const errorMessage = useMemo(() => {
    if (!isError) return null;

    if (!bookingIdValid) return "Missing or invalid bookingId in the URL.";
    return getApiErrorMessage(error, "Could not verify booking status.");
  }, [isError, error, bookingIdValid]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md shadow-[0_18px_55px_rgba(0,0,0,0.10)]">
        {/* Banner image */}
        <div className="relative h-44 sm:h-56">
          <img
            src="/images/homehero/Screenshot 2025-01-28 183637.webp"
            alt="Eagle Villas"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          <div className="absolute left-5 bottom-5 sm:left-6 sm:bottom-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900 ring-1 ring-inset ring-white/40">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Payment received
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Confirming your booking…
          </h1>

          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
            Your payment was successful. We’re now waiting for Stripe to send a
            confirmation webhook to finalize your reservation.
          </p>

          {/* Status block */}
          <div className="mt-5">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                Checking booking status…
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-slate-700">
                This usually takes a few seconds. You can keep this page open,
                or check your dashboard later.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Back to home
            </Link>

            <Link
              to="/villas"
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"
            >
              Browse villas
            </Link>

            <Link
              to="/dashboard"
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"
            >
              My dashboard
            </Link>

            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:brightness-95"
              disabled={!bookingIdValid}
              title={!bookingIdValid ? "Missing bookingId" : "Refresh status"}
            >
              Refresh now
            </button>
          </div>

          {/* Small details */}
          {bookingIdValid && (
            <p className="mt-4 text-xs sm:text-sm text-slate-500">
              Booking ID:{" "}
              <span className="font-semibold text-slate-700">{bookingId}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
