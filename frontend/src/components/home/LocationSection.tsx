// src/components/home/LocationSection.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Location slideshow images.
 * These are static scenic visuals stored in /public/images.
 * They are intentionally marketing-driven and not backend-sourced.
 */
const locationSlides = [
  { id: 1, image: "/images/location/image00020.webp" },
  { id: 2, image: "/images/location/Screenshot 2025-01-28 184209.webp" },
  { id: 3, image: "/images/location/467291290_452922667825827_1444362560291200960_n.webp" },
];

export default function LocationSection() {
  const [current, setCurrent] = useState(0);

  /**
   * Automatic slideshow rotation.
   * Maintains a calm visual rhythm consistent with the luxury positioning.
   */
  useEffect(() => {
    const id = setInterval(
      () => setCurrent((prev) => (prev + 1) % locationSlides.length),
      7000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mt-8 sm:mt-10 md:mt-12">
      {/* No background wrapper to keep layout clean and editorial */}
      <div className="w-full flex flex-col md:flex-row md:items-stretch">
        
        {/* Text section (left) */}
        <div className="w-full md:w-1/2 flex items-center">
          <div className="w-full max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-10 md:py-12 space-y-4 sm:space-y-5">
            
            {/* Section label */}
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
              Sivota, Lefkas
            </p>

            {/* Heading derived directly from provided location content */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.4rem] font-semibold text-stone-900 leading-tight">
              A world of islands, crystal waters and Mediterranean beauty.
            </h2>

            {/* Main paragraph based strictly on supplied material */}
            <p className="text-sm sm:text-base md:text-lg text-stone-700">
              Nestled in the picturesque landscape of Sivota, Eagle Luxury Villas offer a privileged setting close to pristine beaches, charming seaside villages, and the sparkling waters of the Ionian Sea.
            </p>

            {/* Supporting paragraph derived from “A World of Possibilities” section */}
            <p className="text-xs sm:text-sm text-stone-600">
              Sail to nearby islands, explore traditional tavernas, enjoy snorkeling and kayaking, or simply relax beneath the warm Mediterranean sun — all just moments from your private villa.
            </p>

            {/* Location CTA */}
            <div className="pt-2">
              <Link
                to="/lefkada"
                className="inline-flex items-center justify-center rounded-full border border-amber-500/80 bg-amber-50/40 px-5 py-2.5 text-sm sm:text-base font-semibold text-amber-800 hover:bg-amber-100/80 transition-colors"
              >
                View location & access
              </Link>
            </div>
          </div>
        </div>

        {/* Image section (right) */}
        <div className="w-full md:w-1/2">
          {/* 
            Border radius logic:
            - Mobile: rounded bottom edges
            - Desktop: rounded left edge (because image sits on the right)
          */}
          <div className="relative h-64 sm:h-80 md:h-[420px] lg:h-[480px] overflow-hidden rounded-3xl md:rounded-r-none md:rounded-l-[2.5rem]">
            {locationSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                  index === current ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={slide.image}
                  alt="Sivota Lefkas coastal scenery"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              </div>
            ))}

            {/* Slide navigation dots */}
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {locationSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrent(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === current
                      ? "w-4 bg-amber-400"
                      : "w-2 bg-amber-100/80 hover:bg-amber-200"
                  }`}
                  aria-label={`Go to location slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
