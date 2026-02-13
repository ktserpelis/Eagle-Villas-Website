export default function VillasAmenities() {
  return (
    <div className="rounded-[2rem] bg-stone-100/90 border border-stone-300/60 shadow-[0_18px_40px_rgba(24,20,15,0.08)] p-6 sm:p-8">
      <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
        Amenities
      </p>
      <h3 className="mt-2 text-2xl sm:text-3xl font-semibold text-stone-900">
        What you’ll find in every villa
      </h3>
      <p className="mt-3 text-base sm:text-lg text-stone-700">
        Earthy interiors, thoughtful details, and the essentials for a calm island stay.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 text-base sm:text-lg font-medium text-stone-700">
        {[
          "Sea view terraces",
          "Fully equipped kitchen",
          "Air conditioning",
          "High-speed Wi-Fi",
          "Premium linens & towels",
          "Private parking",
        ].map((t) => (
          <li key={t} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
