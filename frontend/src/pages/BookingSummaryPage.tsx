import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useProperty } from "../api/properties";
import { useBookingQuote } from "../api/bookingQuote";
import { useCreateBooking } from "../api/booking";

import { PropertyRulesCard } from "../components/summary/PropertyRulesCard";
import { RefundPolicyCard } from "../components/summary/RefundPolicyCard";
import { PriceBreakdownCard } from "../components/summary/PriceBreakDownCard";
import { ConsentBox } from "../components/summary/ConsentBox";

type BookingDraft = {
  slug: string;
  propertyId: number;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  babies: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  useCredit: boolean;
  note?: string;
};

/**
 * Reads the draft payload passed via navigate(..., { state: { draft } }).
 * If the page is refreshed, location.state is typically lost, so we show fallback UI.
 */
function getDraftFromLocationState(state: unknown): BookingDraft | null {
  if (!state || typeof state !== "object") return null;
  const s = state as { draft?: unknown };
  if (!s.draft) return null;
  return s.draft as BookingDraft;
}

export default function BookingSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * TS-safe narrowing:
   * - compute draft once
   * - early-return if missing
   * - after the guard, "draft" is guaranteed non-null
   */
  const draftMaybe = useMemo(
    () => getDraftFromLocationState(location.state),
    [location.state]
  );

  if (!draftMaybe) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-24">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">Booking summary</h1>
          <p className="mt-2 text-sm text-stone-600">
            Your booking details were not found (this can happen after a refresh).
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
          >
            <span aria-hidden>←</span> Go back home
          </Link>
        </div>
      </div>
    );
  }

  const draft = draftMaybe;

  const { data: property, isLoading: propertyLoading } = useProperty(draft.slug);

  /**
   * Build the quote payload with stable dependencies.
   * Depending on the whole "draft" object can cause unnecessary recalculations.
   */
  const quoteInput = useMemo(
    () => ({
      propertyId: draft.propertyId,
      startDate: draft.startDate,
      endDate: draft.endDate,
      adults: draft.adults,
      children: draft.children,
      babies: draft.babies,
      useCredit: draft.useCredit,
    }),
    [
      draft.propertyId,
      draft.startDate,
      draft.endDate,
      draft.adults,
      draft.children,
      draft.babies,
      draft.useCredit,
    ]
  );

  const {
    data: quote,
    isLoading: quoteLoading,
    error: quoteError,
  } = useBookingQuote(quoteInput);

  const { mutate, isPending } = useCreateBooking();

  const [agreeRules, setAgreeRules] = useState(false);
  const [agreeRefunds, setAgreeRefunds] = useState(false);

  const canProceed =
    agreeRules &&
    agreeRefunds &&
    !isPending &&
    !!quote &&
    !quoteLoading &&
    !quoteError;

  const backToBookingUrl = `/properties/${draft.slug}/book?start=${draft.startDate}&end=${draft.endDate}`;

  function confirmAndPay() {
    if (!canProceed) return;

    mutate(
      {
        propertyId: draft.propertyId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        adults: draft.adults,
        children: draft.children,
        babies: draft.babies,
        guestName: draft.guestName,
        guestEmail: draft.guestEmail,
        guestPhone: draft.guestPhone,
        useCredit: draft.useCredit,
        note: draft.note,
      } as any,
      {
        onSuccess: ({ booking, checkoutUrl }: any) => {
          if (checkoutUrl) {
            window.location.assign(checkoutUrl);
            return;
          }
          navigate("/booking/confirmed", { replace: true, state: { booking } });
        },
      }
    );
  }

  return (
    <div className="relative">
      {/* Subtle background for a more premium feel, still minimal */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px 420px at 20% 0%, rgba(245, 158, 11, 0.14), transparent 55%), radial-gradient(900px 520px at 85% 10%, rgba(15, 23, 42, 0.06), transparent 55%)",
        }}
      />

      {/* Top padding to avoid overlapping with a sticky navbar */}
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-24">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={backToBookingUrl}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-900 backdrop-blur hover:bg-white"
          >
            <span aria-hidden>←</span> Back to details
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-xs text-stone-600">
            <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1">
              {draft.startDate} → {draft.endDate}
            </span>
            <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1">
              {draft.adults + draft.children} guest{draft.adults + draft.children === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-700/90">
            Review and confirm
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">
            Booking summary
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Review everything below. You will be redirected to Stripe to complete payment.
          </p>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Stay details */}
            <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Stay</h2>
                  <p className="mt-1 text-xs text-stone-600">
                    Confirm dates, guests, and contact details before paying.
                  </p>
                </div>

                {quoteLoading ? (
                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600">
                    Calculating…
                  </span>
                ) : quoteError ? (
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">
                    Quote failed
                  </span>
                ) : quote ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    Due now:{" "}
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(Math.round(quote.priceSummary.cashDueNowCents / 100))}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-xs text-stone-600">Dates</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {draft.startDate} → {draft.endDate}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-xs text-stone-600">Guests</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {draft.adults} adult{draft.adults === 1 ? "" : "s"}
                    {draft.children
                      ? `, ${draft.children} child${draft.children === 1 ? "" : "ren"}`
                      : ""}
                    {draft.babies
                      ? `, ${draft.babies} baby${draft.babies === 1 ? "" : "ies"}`
                      : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-stone-600">
                    Babies (&lt;2) don’t count toward max guests.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-900/80">Guest details</p>
                <p className="mt-1 text-sm font-semibold text-amber-950">
                  {draft.guestName}
                </p>
                <p className="text-xs text-amber-950/80">
                  {draft.guestEmail} • {draft.guestPhone}
                </p>
                {draft.note ? (
                  <p className="mt-2 text-xs text-amber-950/80">
                    Note: {draft.note}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Property rules pulled from property.policies */}
            <PropertyRulesCard
              checkInFrom={property?.checkInFrom ?? null}
              checkInTo={property?.checkInTo ?? null}
              checkOutUntil={property?.checkOutUntil ?? null}
              policies={property?.policies ?? []}
            />

            {/* Exact refund policy snapshot from backend */}
            {quote?.refundPolicy ? (
              <RefundPolicyCard
                daysBeforeCheckIn={quote.refundPolicy.daysBeforeCheckIn}
                applicableTierKey={quote.refundPolicy.applicableTier.key}
                tiers={quote.refundPolicy.tiers}
              />
            ) : null}

            {/* Consent */}
            <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <h2 className="text-sm font-semibold text-stone-900">Confirm</h2>
              <p className="mt-1 text-sm text-stone-600">
                You must agree before continuing to payment.
              </p>

              <div className="mt-4 space-y-3">
                <ConsentBox
                  checked={agreeRules}
                  onChange={setAgreeRules}
                  label="I agree to the property rules and guidelines."
                />
                <ConsentBox
                  checked={agreeRefunds}
                  onChange={setAgreeRefunds}
                  label="I understand the refund policy and that credits are non-refundable."
                />
              </div>

              {quoteLoading || propertyLoading ? (
                <p className="mt-3 text-xs text-stone-500">Loading…</p>
              ) : null}
            </div>
          </div>

          {/* Price */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
            {quoteLoading ? (
              <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <p className="text-sm text-stone-600">Calculating total…</p>
              </div>
            ) : quoteError ? (
              <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <p className="text-sm text-red-600">
                  Could not calculate pricing. Please go back and try again.
                </p>
              </div>
            ) : quote ? (
              <div className="rounded-3xl border border-stone-200 bg-white/90 shadow-sm backdrop-blur">
                {/* Wrap the existing card to keep your component unchanged,
                    while improving spacing and visual consistency */}
                <div className="p-1">
                  <PriceBreakdownCard
                    quote={quote}
                    onConfirm={confirmAndPay}
                    disabled={!canProceed}
                    isSubmitting={isPending}
                  />
                </div>
              </div>
            ) : null}

            {/* Secondary action below price card */}
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white/70 p-4 text-xs text-stone-600 backdrop-blur">
              Payment is processed securely by Stripe. Your booking is confirmed only
              after payment succeeds.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
