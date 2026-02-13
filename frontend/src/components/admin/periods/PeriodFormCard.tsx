export type PeriodFormState = {
  startDate: string;
  endDate: string;
  isOpen: boolean;
  standardNightlyPrice: number;
  weeklyDiscountPercentBps: number | null;
  weeklyThresholdNights: number;
  minNights: number;
  maxGuests: number;
  name: string;
  notes: string;
};

type Props = {
  value: PeriodFormState;
  busy: boolean;
  onChange: (patch: Partial<PeriodFormState>) => void;
  onSubmit: () => void;
};

export default function PeriodFormCard({ value, busy, onChange, onSubmit }: Props) {
  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900">Create period</h3>
        <span className="text-xs text-slate-500">Pricing + rules</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Start date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
          <p className="text-xs text-slate-500 mt-1">Checkout date (exclusive)</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nightly price (€)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.standardNightlyPrice}
            onChange={(e) => onChange({ standardNightlyPrice: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max guests</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.maxGuests}
            onChange={(e) => onChange({ maxGuests: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Min nights (arrival)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.minNights}
            onChange={(e) => onChange({ minNights: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Weekly discount (bps)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.weeklyDiscountPercentBps ?? ""}
            placeholder="1000 = 10%"
            onChange={(e) =>
              onChange({
                weeklyDiscountPercentBps: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <p className="text-xs text-slate-500 mt-1">Booking.com style discount</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Weekly threshold</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.weeklyThresholdNights}
            onChange={(e) => onChange({ weeklyThresholdNights: Number(e.target.value) })}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Name (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="High season"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={value.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.isOpen} onChange={(e) => onChange({ isOpen: e.target.checked })} />
            Open for booking
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Create period"}
          </button>
        </div>
      </div>
    </div>
  );
}
