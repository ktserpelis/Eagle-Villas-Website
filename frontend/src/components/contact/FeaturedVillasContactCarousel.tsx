import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProperties } from "../../api/properties";

type Slide = {
  id: number;
  title: string;
  slug: string;
  image: string;
};

const FALLBACK_IMAGE = "/images/hero-villa-1.jpg"; // keep one safe local fallback

export default function FeaturedVillasContactCarousel() {
  const { data, isLoading, error } = useProperties();

  const slides: Slide[] = useMemo(() => {
    const properties = data ?? [];
    return properties
      .filter((p) => p?.slug && p?.title) // basic safety
      .slice(0, 6) // you can tweak how many you want in the carousel
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        image: p.images?.[0]?.url || FALLBACK_IMAGE,
      }));
  }, [data]);

  const [current, setCurrent] = useState(0);

  // If slides shrink (loading -> loaded), clamp index
  useEffect(() => {
    if (current > Math.max(0, slides.length - 1)) setCurrent(0);
  }, [slides.length, current]);

  // Auto-rotate only if we have 2+ slides
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      7000
    );
    return () => clearInterval(id);
  }, [slides.length]);

  const active = slides[current];

  const goPrev = () =>
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const goNext = () =>
    setCurrent((prev) => (prev + 1) % slides.length);

  return (
    <section className="bg-white/90 rounded-3xl overflow-hidden shadow-[0_14px_30px_rgba(24,20,15,0.10)] border border-amber-50">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Our villas</h2>
          <p className="text-[11px] text-stone-600">
            Tap a villa to view details and availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={slides.length < 2}
            className="h-7 w-7 rounded-full border border-stone-200 flex items-center justify-center text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Previous villa"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={slides.length < 2}
            className="h-7 w-7 rounded-full border border-stone-200 flex items-center justify-center text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Next villa"
          >
            ›
          </button>
        </div>
      </div>

      {/* Loading / Error / Empty */}
      {isLoading && (
        <div className="px-4 pb-4">
          <div className="h-52 sm:h-60 md:h-64 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      )}

      {!isLoading && error && (
        <div className="px-4 pb-4 text-sm text-red-600">
          Error loading villas. Please try again.
        </div>
      )}

      {!isLoading && !error && slides.length === 0 && (
        <div className="px-4 pb-4 text-sm text-stone-600">
          No villas available yet.
        </div>
      )}

      {/* Carousel */}
      {!isLoading && !error && slides.length > 0 && active && (
        <div className="relative h-52 sm:h-60 md:h-64">
          <Link to={`/properties/${active.slug}`} className="block h-full">
            <img
              src={active.image}
              alt={active.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />

            <div className="absolute left-4 right-4 bottom-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200">
                Featured villa
              </p>
              <h3 className="text-sm sm:text-base font-semibold text-amber-50">
                {active.title}
              </h3>
              <span className="mt-1 inline-flex items-center text-[11px] text-amber-50/90 underline underline-offset-2">
                View details & availability
              </span>
            </div>
          </Link>

          {/* Dots */}
          <div className="absolute bottom-2 right-4 flex gap-1">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrent(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === current
                    ? "w-4 bg-amber-400"
                    : "w-2 bg-amber-100/70 hover:bg-amber-200"
                }`}
                aria-label={`Go to ${s.title}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
