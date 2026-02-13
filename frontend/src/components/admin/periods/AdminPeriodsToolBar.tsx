type PropertyLite = {
  id: number;
  title: string;
  city?: string;
  country?: string;
};

type Props = {
  properties?: PropertyLite[]; // ✅ optional to avoid crashes while loading
  propertyId: number;
  setPropertyId: (v: number) => void;

  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;

  busy: boolean;
  onRefresh: () => void;
  loading?: boolean;
};

export default function AdminPeriodsToolbar({
  properties = [], // ✅ default
  propertyId,
  setPropertyId,
  from,
  setFrom,
  to,
  setTo,
  busy,
  onRefresh,
  loading,
}: Props) {
  const isDisabled = busy || loading;

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <label className="text-sm text-slate-700">
          Property
          <select
            className="ml-2 border rounded px-3 py-2 text-sm min-w-[260px]"
            value={propertyId}
            onChange={(e) => setPropertyId(Number(e.target.value))}
            disabled={isDisabled || properties.length === 0}
          >
            {properties.length === 0 ? (
              <option value={propertyId}>
                {loading ? "Loading properties..." : "No properties"}
              </option>
            ) : (
              properties.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} · {p.title}
                  {p.city ? ` · ${p.city}` : ""}
                  {p.country ? `, ${p.country}` : ""}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          From
          <input
            type="date"
            className="ml-2 border rounded px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            disabled={isDisabled}
          />
        </label>

        <label className="text-sm text-slate-700">
          To
          <input
            type="date"
            className="ml-2 border rounded px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={isDisabled}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isDisabled}
        className="border rounded px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
      >
        Refresh
      </button>
    </div>
  );
}
