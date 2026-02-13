import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperties } from "../../api/properties";

export default function BookNowSection() {
  const navigate = useNavigate();
  const { data: properties, isLoading } = useProperties();

  const [selectedId, setSelectedId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    const property = properties?.find((p) => p.id === selectedId);
    if (!property) return;

    const qs = new URLSearchParams();
    if (startDate) qs.set("start", startDate);
    if (endDate) qs.set("end", endDate);

    const query = qs.toString();
    navigate(`/properties/${property.slug}${query ? `?${query}` : ""}`);
  };
  
  return (
    <section className="mt-4 lg:px-4">
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-3xl shadow-lg shadow-amber-900/30 p-[1px]">
        {/* overflow-hidden helps prevent any weird mobile overflow */}
        <div className="bg-white overflow-hidden rounded-[1.4rem] px-4 py-5 md:px-6 md:py-6 flex flex-col gap-4 md:gap-5">
          <div className="space-y-2">
            {/* match your section typography */}
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
              Book your stay
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-stone-900 leading-tight">
              Ready to book your stay?
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-stone-700">
              Choose a villa and start your booking. You can review all details and
              confirm on the next step.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Villa select */}
            <div className="sm:col-span-2 lg:col-span-1 min-w-0">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Choose a villa
              </label>
              <select
                className="w-full min-w-0 rounded-full border border-stone-300 bg-stone-50 px-3 py-2 text-xs md:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                value={selectedId}
                onChange={(e) =>
                  setSelectedId(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={isLoading}
              >
                <option value="">Select a villa…</option>
                {properties?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="min-w-0">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Check-in
              </label>
              <input
                type="date"
                className="w-full min-w-0 appearance-none rounded-full border border-stone-300 bg-stone-50 px-3 py-2 text-xs md:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Check-out
              </label>
              <input
                type="date"
                className="w-full min-w-0 appearance-none rounded-full border border-stone-300 bg-stone-50 px-3 py-2 text-xs md:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 lg:col-span-1 flex items-end min-w-0">
              <button
                type="submit"
                disabled={!selectedId}
                className="w-full rounded-full bg-amber-500 text-amber-950 text-sm sm:text-base font-semibold py-2.5 md:py-3 shadow-md shadow-amber-900/40 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Book now
              </button>
            </div>
          </form>

          <p className="text-xs sm:text-sm text-stone-600">
            No payment is taken on this step. You&apos;ll be able to review your
            booking details and confirm on the next page.
          </p>
        </div>
      </div>
    </section>
  );
}
