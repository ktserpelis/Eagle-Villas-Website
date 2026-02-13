import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperties } from "../../api/properties";

const GOLD = "#C9A24A";

export default function HeroBookingMiniForm() {
  const navigate = useNavigate();
  const { data: properties, isLoading } = useProperties();

  const [selectedId, setSelectedId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedProperty = useMemo(() => {
    if (!selectedId) return null;
    return properties?.find((p) => p.id === selectedId) ?? null;
  }, [properties, selectedId]);

  const canSubmit = !!selectedProperty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const qs = new URLSearchParams();
    if (startDate) qs.set("start", startDate);
    if (endDate) qs.set("end", endDate);

    const query = qs.toString();
    navigate(`/properties/${selectedProperty.slug}${query ? `?${query}` : ""}`);
  };


  return (
    <div
      className="
        w-[250px] sm:w-[260px]
        rounded-3xl
        border border-white/30
        bg-white/10
        backdrop-blur-md
        px-4 py-6
        shadow-[0_18px_45px_rgba(0,0,0,0.35)]
        text-white
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-white/95">Book your stay</div>
          <div className="mt-1 text-sm text-white/80">Pick a villa & dates</div>
        </div>

        <div
          className="shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold"
          style={{
            border: "1px solid rgba(255,255,255,0.28)",
            background: "rgba(0,0,0,0.12)",
          }}
        >
          Booking
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {/* Villa select */}
        <div className="min-w-0">
          <label className="block text-[11px] font-semibold text-white/85 mb-1.5">
            Choose a villa
          </label>
          <select
            className="
              w-full min-w-0 rounded-full
              border border-white/25 bg-black/10
              px-3 py-2 text-xs text-white/90
              focus:outline-none focus:ring-2 focus:ring-amber-300/80 focus:border-amber-300/80
            "
            value={selectedId}
            onChange={(e) =>
              setSelectedId(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={isLoading}
          >
            <option value="" className="text-stone-900">
              Select a villa…
            </option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id} className="text-stone-900">
                {p.title} · {p.city}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <label className="block text-[11px] font-semibold text-white/85 mb-1.5">
              Check-in
            </label>
            <input
              type="date"
              className="
                w-full min-w-0 appearance-none rounded-full
                border border-white/25 bg-black/10
                px-3 py-2 text-xs text-white/90
                focus:outline-none focus:ring-2 focus:ring-amber-300/80 focus:border-amber-300/80
              "
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="min-w-0">
            <label className="block text-[11px] font-semibold text-white/85 mb-1.5">
              Check-out
            </label>
            <input
              type="date"
              className="
                w-full min-w-0 appearance-none rounded-full
                border border-white/25 bg-black/10
                px-3 py-2 text-xs text-white/90
                focus:outline-none focus:ring-2 focus:ring-amber-300/80 focus:border-amber-300/80
              "
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="
            w-full rounded-full
            border border-white/20
            bg-white/15
            px-4 py-2.5
            text-sm font-semibold text-white
            hover:bg-white/20 transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          Book now
        </button>

        {/* Tiny helper text */}
        <div className="text-[11px] text-white/70 leading-relaxed">
          No payment on this step. You’ll confirm on the next page.
        </div>
      </form>

      {/* Tiny dots (same vibe as your mini) */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>

      {/* Accent hint (subtle gold) */}
      <div className="mt-3 h-px w-full" style={{ background: "rgba(255,255,255,0.12)" }} />
      <div className="mt-3 text-[11px] text-white/70">
        <span style={{ color: GOLD, fontWeight: 600 }}>Tip:</span> dates are optional here (kept for
        convenience).
      </div>
    </div>
  );
}
