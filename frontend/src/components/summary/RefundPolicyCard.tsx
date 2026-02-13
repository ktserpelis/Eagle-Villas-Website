function pctFromBps(bps: number) {
  return (bps / 100).toFixed(0); // 10_000 -> 100%
}

export function RefundPolicyCard({
  daysBeforeCheckIn,
  applicableTierKey,
  tiers,
}: {
  daysBeforeCheckIn: number;
  applicableTierKey: string;
  tiers: Array<{
    key: string;
    label: string;
    description: string;
    refundBps: number;
    voucherBps: number;
  }>;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900">Refund policy</h2>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold text-amber-950">
          Your stay starts in {daysBeforeCheckIn} day{daysBeforeCheckIn === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-xs text-amber-950/80">
          The highlighted tier below applies if you cancel today.
          Refunds apply to the cash amount paid to Stripe; credits are non-refundable.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {tiers.map((t) => {
          const active = t.key === applicableTierKey;
          return (
            <div
              key={t.key}
              className={[
                "rounded-xl border px-4 py-3",
                active
                  ? "border-amber-300 bg-amber-50"
                  : "border-stone-200 bg-stone-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    {t.label} {active ? "• Applies" : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">{t.description}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-900">
                    {pctFromBps(t.refundBps)}% refund
                  </p>
                  {t.voucherBps > 0 ? (
                    <p className="text-xs text-stone-700">
                      {pctFromBps(t.voucherBps)}% voucher
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500">—</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
