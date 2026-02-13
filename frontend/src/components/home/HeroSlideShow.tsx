// src/components/home/HeroSlideshow.tsx
import { useEffect, useState } from "react";
import ReviewsPopupCarousel from "../ReviewsPopupCarousel";

const slides = [
  {
    id: 1,
    image: "/images/homehero/Screenshot 2025-01-28 183616.webp",
    title: "Eagle Luxury Villas — Sivota, Lefkas",
    subtitle: "Escape to a world of unparalleled luxury and breathtaking beauty in the heart of Sivota, where privacy, comfort, and refined elegance define every stay.",
  },
  {
    id: 2,
    image: "/images/homehero/image00022.webp",
    title: "Private pools, warm interiors, effortless comfort",
    subtitle: "Spacious villas with contemporary design, fully equipped kitchens, outdoor hot tubs, and daily housekeeping — created for slow island days and unforgettable evenings.",
  },
  {
    id: 3,
    image: "/images/homehero/Screenshot 2025-01-28 183637.webp",
    title: "Discover the beauty of Sivota & Lefkas",
    subtitle: "Sail to nearby islands, explore charming villages, or unwind on pristine beaches — adventure and serenity await just beyond your private retreat.",
  },
];

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      6000
    );
    return () => clearInterval(id);
  }, []);

  const activeSlide = slides[current];

  return (
    <>
      {/* Mobile: ~3/5 height, Desktop+: full screen */}
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
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
            </div>
          ))}
        </div>

        {/* ✅ Reviews trigger (right side) */}
       <div className="absolute z-20 right-[10%] top-[45%] -translate-y-1/2 hidden md:block">
        <ReviewsPopupCarousel visibleCount={2} />
      </div>

        {/* Foreground content */}
        <div className="relative z-10 max-w-6xl mx-auto h-full flex flex-col justify-end px-4 pb-20 sm:pb-24 pt-20 sm:pt-24 md:pt-32">
          <div className="max-w-2xl space-y-2.5 sm:space-y-3.5">
            <h1
              className="
                text-3xl sm:text-4xl md:text-5xl
                font-semibold
                tracking-tight
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
                  index === current
                    ? "w-5 bg-amber-400"
                    : "w-2 bg-amber-100/70 hover:bg-amber-200"
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
            <path
              d="M0,190 C480,230 960,40 1440,80 L1440,220 L0,220 Z"
              fill="#f5f5f4" /* matches bg-stone-100 */
            />
          </svg>
        </div>
      </section>
    </>
  );
}
