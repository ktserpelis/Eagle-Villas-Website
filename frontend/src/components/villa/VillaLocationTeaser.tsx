import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const locationSlides = [
  { id: 1, image: "/images/location/image00020.webp" },
  { id: 2, image: "/images/homehero/Screenshot 2025-01-28 183616.webp" },
  { id: 3, image: "/images/location/467291290_452922667825827_1444362560291200960_n.webp" },
];

export default function LocationSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setCurrent((prev) => (prev + 1) % locationSlides.length),
      7000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mt-8 sm:mt-10 md:mt-12">
      {/* No background wrapper */}
      <div className="w-full flex flex-col md:flex-row md:items-stretch">
        {/* Text left */}
        <div className="w-full md:w-1/2 flex items-center">
          <div className="w-full max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-10 md:py-12 space-y-4 sm:space-y-5">
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
              Sivota, Leykada, Greece
            </p>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.4rem] font-semibold text-stone-900 leading-tight">
              Golden beaches, whitewashed lanes and quiet olive groves.
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-stone-700">
              Eagle Villas sit in a calm part of Sivota, close to the beach and a
              short drive from town. Think early swims, small tavernas and long
              evenings outside under the sky.
            </p>

            <p className="text-xs sm:text-sm text-stone-600">
              Within a few minutes by car you&apos;ll find local tavernas, shops and
              coastal paths with sea views.
            </p>

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

        {/* Image right */}
        <div className="w-full md:w-1/2">
          {/* 
            IMPORTANT:
            - Mobile: rounded bottom edges
            - Desktop: rounded left edge (because it sits on the right)
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
                  alt="Naxos island scenery"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              </div>
            ))}

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
