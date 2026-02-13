import LocationHeroSlideshow from "../components/lefkada/LocationHeroSlideshow";
import BeachesMapSection from "../components/lefkada/BeachesMapSection";

export default function LocationPage() {
  return (
    <main className="bg-stone-100">
      <LocationHeroSlideshow />

      {/* Intro text */}
      <section className="pt-16 sm:pt-20 md:pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          {/* Centered block, left-aligned content */}
          <div className="max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
              Location
            </p>

            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold text-stone-900 leading-tight">
              Sivota, Lefkada — Harbour Calm & Ionian Blues
            </h2>

            <div className="mt-6 space-y-5 text-sm sm:text-base md:text-lg text-stone-700">
              <p>
                Tucked into the south-eastern coast of Lefkada, Sivota is a small harbour village where life unfolds at an easy, sun-warmed pace. Fishing boats sway gently in the marina, waterfront tavernas spill out toward the sea, and evenings are reserved for unhurried walks along the bay.
              </p>
              <p>
                From here, the quieter side of the island reveals itself. Hidden coves with crystalline water, sheltered beaches perfect for morning swims, and winding drives through olive groves and pine-scented hillsides. Each day can be as simple or as exploratory as you wish.
              </p>
              <p>
               Begin with a swim in a calm turquoise cove. Pause for a light lunch by the water. Return to Sivota as the sky softens into gold, and settle in for a slow dinner overlooking the harbour — the kind of evening that lingers long after summer ends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Extra breathing room before beaches */}
      <div className="mt-16 sm:mt-20 md:mt-24" />

      <BeachesMapSection />

      {/* Bottom spacing */}
      <div className="h-20 sm:h-24 md:h-28" />
    </main>
  );
}
