function formatMoneyEUR(value: number) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value}€`;
  }
}

export function PriceBreakdownCard({
  quote,
  onConfirm,
  disabled,
  isSubmitting,
}: {
  quote: any;
  onConfirm: () => void;
  disabled: boolean;
  isSubmitting: boolean;
}) {
  const ps = quote.priceSummary;

  return (
    <div className="sticky top-6 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900">Price breakdown</h2>

      <div className="mt-4 space-y-3 text-sm">
        <div className="space-y-2">
          {ps.segments.map((s: any, idx: number) => (
            <div key={idx} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-stone-900">
                  {formatMoneyEUR(s.nightlyPrice)} × {s.nights} night{s.nights === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-stone-600">
                  {s.from} → {s.to}
                </p>
              </div>
              <p className="font-semibold text-stone-900">
                {formatMoneyEUR(s.segmentTotal)}
              </p>
            </div>
          ))}
        </div>

        {ps.weeklyDiscountAppliedBps ? (
          <div className="flex items-center justify-between">
            <p className="text-stone-700">Weekly discount</p>
            <p className="font-semibold text-stone-900">
              −{(ps.weeklyDiscountAppliedBps / 100).toFixed(0)}%
            </p>
          </div>
        ) : null}

        {ps.creditsAppliedCents > 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-stone-700">Credits</p>
            <p className="font-semibold text-stone-900">
              −{formatMoneyEUR(Math.round(ps.creditsAppliedCents / 100))}
            </p>
          </div>
        ) : null}

        <div className="my-3 h-px bg-stone-200" />

        <div className="flex items-center justify-between">
          <p className="text-stone-700">Total</p>
          <p className="text-base font-semibold text-stone-900">
            {formatMoneyEUR(ps.totalEur)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-stone-700">Due now</p>
          <p className="text-base font-semibold text-amber-900">
            {formatMoneyEUR(Math.round(ps.cashDueNowCents / 100))}
          </p>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating booking…" : "Confirm & Pay"}
        </button>

        <p className="mt-3 text-[11px] text-stone-600">
          You’ll be redirected to Stripe to complete payment.
        </p>
      </div>
    </div>
  );
}
