type Props = {
  periods: any[];
  onToggleOpen: (p: any) => void;
  onDelete: (p: any) => void;
};

function bpsToPercentText(bps?: number | null) {
  if (!bps) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

function dateOnly(iso: string) {
  if (!iso) return iso;

  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2); // last 2 digits

  return `${day}/${month}/${year}`;
}

export default function PeriodsListCard({ periods, onToggleOpen, onDelete }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-slate-100 px-4 py-2 text-sm font-semibold">Periods</div>

      {periods.length === 0 ? (
        <div className="p-4 text-sm text-slate-600">No periods yet.</div>
      ) : (
        <div className="divide-y">
          {periods.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-slate-900 truncate">
                    {p.name?.trim() ? p.name : `Period #${p.id}`}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      p.isOpen ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {p.isOpen ? "OPEN" : "CLOSED"}
                  </span>
                </div>

                <div className="text-sm text-slate-700 mt-1">
                  <span className="font-semibold">
                    {dateOnly(p.startDate)} → {dateOnly(p.endDate)}
                  </span>
                  <span className="text-slate-500 ml-2">
                    nightly €{p.standardNightlyPrice} · min {p.minNights} · max {p.maxGuests} · weekly{" "}
                    {bpsToPercentText(p.weeklyDiscountPercentBps)} (≥ {p.weeklyThresholdNights})
                  </span>
                </div>

                {p.notes ? <div className="text-xs text-slate-500 mt-1">{p.notes}</div> : null}
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => onToggleOpen(p)}
                  className="text-xs px-3 py-2 rounded border border-slate-300 hover:bg-slate-100"
                >
                  {p.isOpen ? "Close" : "Open"}
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  className="text-xs px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
