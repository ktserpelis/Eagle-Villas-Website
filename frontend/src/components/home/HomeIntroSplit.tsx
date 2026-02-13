// src/components/home/HomeIntroSplit.tsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

/**
 * Intro slideshow images.
 * These are static marketing visuals stored in /public/images.
 * They are not backend-driven by design.
 */
const introSlides = [
  { id: 1, image: "/images/homeherosplit/image00004.webp" },
  { id: 2, image: "/images/homeherosplit/image00021.webp" },
  { id: 3, image: "/images/homeherosplit/Screenshot 2025-01-28 183508.webp" },
];

export default function HomeIntroSplit() {
  const [current, setCurrent] = useState(0);

  /**
   * Automatically rotates intro images to keep the layout dynamic
   * while maintaining a calm, premium pace.
   */
  useEffect(() => {
    const id = setInterval(
      () => setCurrent((prev) => (prev + 1) % introSlides.length),
      7000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mt-6 sm:mt-8 md:mt-10">
      {/* Layout intentionally minimal: no background wrapper, no card container */}
      <div className="w-full flex flex-col-reverse md:flex-row md:items-stretch">
        
        {/* Image section */}
        <div className="w-full md:w-1/2">
          <div className="relative h-64 sm:h-80 md:h-[480px] lg:h-[540px] overflow-hidden rounded-3xl md:rounded-l-none md:rounded-r-[2.5rem]">
            {introSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                  index === current ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={slide.image}
                  alt="Eagle Luxury Villas exterior"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-black/10 to-transparent" />
              </div>
            ))}

            {/* Slide navigation dots */}
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {introSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrent(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === current
                      ? "w-4 bg-amber-400"
                      : "w-2 bg-amber-100/80 hover:bg-amber-200"
                  }`}
                  aria-label={`Go to intro slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Text section */}
        <div className="w-full md:w-1/2 flex items-center">
          <div className="w-full max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-10 md:py-12 space-y-4 sm:space-y-5">
            
            {/* Section label */}
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
              Welcome to Eagle Luxury Villas
            </p>

            {/* Main heading derived from brand positioning text */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-semibold text-stone-900 leading-tight">
              A refined escape in Sivota, Lefkas.
            </h2>

            {/* Supporting paragraph based strictly on provided content */}
            <p className="text-sm sm:text-base md:text-lg text-stone-700">
              Discover a collection of elegant private villas designed for comfort, privacy, and unforgettable moments. 
              Enjoy private pools, fully equipped kitchens, and daily housekeeping — all set against the breathtaking beauty of Sivota and the Ionian Sea.
            </p>

            {/* Primary and secondary actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/properties"
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2.5 text-sm sm:text-base font-semibold text-amber-950 shadow-md shadow-amber-900/20 hover:bg-amber-400 transition-colors"
              >
                View our villas
              </Link>

              <Link
                to="/lefkada"
                className="inline-flex items-center justify-center rounded-full border border-amber-500/70 px-5 py-2.5 text-sm sm:text-base font-semibold text-amber-800 bg-amber-50/40 hover:bg-amber-100/80 transition-colors"
              >
                Location & access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
