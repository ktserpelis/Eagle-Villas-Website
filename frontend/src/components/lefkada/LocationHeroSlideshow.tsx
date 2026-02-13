import { useEffect, useState } from "react";
import HeroBookingMiniForm from "./HeroBookingMiniForm.tsx";

/**
 * Location showcase slides.
 * Images are static assets stored under /public/images/location.
 * Text is derived from the official Eagle Luxury Villas brand material.
 */
const slides = [
  {
    id: 1,
    image: "/images/location/467291290_452922667825827_1444362560291200960_n.webp",
    title: "Sivota, Lefkas",
    subtitle:
      "Nestled in the picturesque harbour of Sivota, where crystal waters, charming tavernas and Mediterranean sunsets define the rhythm of each day.",
  },
  {
    id: 2,
    image: "/images/location/Screenshot 2025-01-28 184209.webp",
    title: "Islands, sailing & Ionian blue",
    subtitle:
      "Embark on sailing excursions to nearby islands, explore hidden coves, and swim in the calm, clear waters of the Ionian Sea.",
  },
  {
    id: 3,
    image: "/images/image00002.jpeg",
    title: "Beaches & authentic village life",
    subtitle:
      "Discover pristine beaches, traditional villages and peaceful coastal paths — all just moments from your private villa retreat.",
  },
];

export default function LocationHeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      6000
    );
    return () => window.clearInterval(id);
  }, []);

  const activeSlide = slides[current];

  return (
    <section className="relative min-h-[60vh] md:min-h-screen w-full">
      {/* Background images with smooth crossfade */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`
              absolute inset-0
              transition-opacity duration-1000 ease-out
              ${index === current ? "opacity-100" : "opacity-0"}
            `}
          >
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
          </div>
        ))}
      </div>

      {/* ✅ Booking mini FORM (replaces reviews) */}
      <div className="absolute z-20 right-[10%] top-[45%] -translate-y-1/2 hidden md:block">
        <HeroBookingMiniForm />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 max-w-6xl mx-auto h-full flex flex-col justify-end px-4 pb-20 sm:pb-24 pt-20 sm:pt-24 md:pt-32">
        <div className="max-w-2xl space-y-2.5 sm:space-y-3.5">
          <h1
            className="
              text-3xl sm:text-4xl md:text-5xl
              font-semibold tracking-tight
              text-amber-50
              drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]
            "
          >
            {activeSlide.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-amber-100/95 max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {activeSlide.subtitle}
          </p>
        </div>

        {/* Dots */}
        <div className="mt-4 flex gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === current ? "w-5 bg-amber-400" : "w-2 bg-amber-100/70 hover:bg-amber-200"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Single smooth curved bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
        <svg
          viewBox="0 0 1440 220"
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full h-24 sm:h-28 md:h-32"
          preserveAspectRatio="none"
        >
          <path d="M0,190 C480,230 960,40 1440,80 L1440,220 L0,220 Z" fill="#f5f5f4" />
        </svg>
      </div>
    </section>
  );
}
