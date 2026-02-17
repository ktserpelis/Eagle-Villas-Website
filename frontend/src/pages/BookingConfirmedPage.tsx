// src/pages/BookingConfirmedPage.tsx
import { Link, useLocation } from "react-router-dom";

/**
 * Booking object passed via router state.
 * This avoids refetching when coming from BookingSuccessPage.
 */
interface BookingFromState {
  id: number;
  startDate: string;
  endDate: string;
  guestName: string;
  guestEmail: string;
  guestsCount: number;
  totalPrice: number;
}

/**
 * BookingConfirmedPage
 *
 * Final “success” page shown after:
 * - Stripe payment succeeded
 * - Webhook confirmed the booking
 *
 * UX:
 * - Adds top padding to avoid overlap with navbar.
 * - Shows a clean “receipt-style” summary.
 * - Offers useful navigation links (dashboard, villas, contact).
 */
export default function BookingConfirmedPage() {
  const location = useLocation();
  const booking = (location.state as any)?.booking as BookingFromState | undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md shadow-[0_18px_55px_rgba(0,0,0,0.10)]">
        {/* Photo header */}
        <div className="relative h-48 sm:h-60 lg:h-64">
          <img
            src="/images/homehero/image00022.webp"
            alt="Eagle Villas"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute left-5 bottom-5 sm:left-6 sm:bottom-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900 ring-1 ring-inset ring-white/40">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Booking confirmed
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Your booking is confirmed ✅
          </h1>

          {booking ? (
            <>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                Thank you, <span className="font-semibold">{booking.guestName}</span>. A confirmation
                email has been sent to{" "}
                <span className="font-semibold">{booking.guestEmail}</span>.
              </p>

              {/* Receipt */}
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_14px_45px_rgba(0,0,0,0.06)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Stay details
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Check-in:</span>{" "}
                      {new Date(booking.startDate).toDateString()}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Check-out:</span>{" "}
                      {new Date(booking.endDate).toDateString()}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Guests:</span>{" "}
                      {booking.guestsCount}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_14px_45px_rgba(0,0,0,0.06)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Payment summary
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Total:</span>{" "}
                      {booking.totalPrice} €
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Booking ID:</span>{" "}
                      #{booking.id}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-slate-600">
                    Need changes or special requests? Reach out and we’ll help personally.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Your booking has been confirmed. Please check your email for details.
            </p>
          )}

          {/* Navigation */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Back to home
            </Link>

            <Link
              to="/dashboard"
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"
            >
              My dashboard
            </Link>

            <Link
              to="/villas"
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"
            >
              Browse villas
            </Link>

            <Link
              to="/contact"
              className="rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:brightness-95"
            >
              Contact support
            </Link>
          </div>

          {/* Small footer note */}
          <p className="mt-4 text-xs sm:text-sm text-slate-500">
            You can always find this reservation under{" "}
            <span className="font-semibold text-slate-700">My dashboard</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
