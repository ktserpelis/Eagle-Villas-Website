export function PropertyRulesCard({
  checkInFrom,
  checkInTo,
  checkOutUntil,
  policies,
}: {
  checkInFrom?: string | null;
  checkInTo?: string | null;
  checkOutUntil?: string | null;
  policies: Array<{ id: number; label: string; sortOrder?: number | null }>;
}) {
  const sorted = policies
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900">Rules</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-xs text-stone-600">Check-in</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {checkInFrom || "—"} {checkInTo ? `→ ${checkInTo}` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-xs text-stone-600">Check-out</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {checkOutUntil || "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
        <p className="text-xs text-stone-600">House rules</p>

        {sorted.length ? (
          <ul className="mt-2 space-y-1 text-sm text-stone-900">
            {sorted.map((x) => (
              <li key={x.id} className="flex gap-2">
                <span
                  className="mt-[6px] h-1.5 w-1.5 rounded-full bg-amber-600/90"
                  aria-hidden
                />
                <span>{x.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            No rules were provided for this property.
          </p>
        )}
      </div>
    </div>
  );
}
