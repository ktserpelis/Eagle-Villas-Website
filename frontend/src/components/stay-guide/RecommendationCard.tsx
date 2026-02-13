import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  title: string;
  type: string;
  description: string;

  heroImage: string;
  images?: string[];

  href?: string;
  mapsHref?: string;
  mapsEmbedSrc?: string;

  locationLabel?: string;
  autoSlideMs?: number;
};

export default function RecommendationCard({
  title,
  type,
  description,
  heroImage,
  images = [],
  href,
  mapsHref,
  mapsEmbedSrc,
  locationLabel,
  autoSlideMs = 4500,
}: Props) {
  const slides = useMemo(() => {
    const all = [heroImage, ...images].filter(Boolean);
    return Array.from(new Set(all));
  }, [heroImage, images]);

  const [idx, setIdx] = useState(0);
  const isHoveringRef = useRef(false);

  const hasMany = slides.length > 1;

  // Auto slideshow (pause on hover)
  useEffect(() => {
    if (!hasMany) return;

    const t = window.setInterval(() => {
      if (!isHoveringRef.current) {
        setIdx((i) => (i + 1) % slides.length);
      }
    }, autoSlideMs);

    return () => window.clearInterval(t);
  }, [autoSlideMs, hasMany, slides.length]);

  return (
    <article className="rounded-3xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden border border-amber-200/70">
      {/* Hero Slideshow */}
      <div
        className="relative w-full aspect-[16/10] bg-slate-100"
        onMouseEnter={() => (isHoveringRef.current = true)}
        onMouseLeave={() => (isHoveringRef.current = false)}
      >
        {slides.length ? (
          <img
            key={slides[idx]}
            src={slides[idx]}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity"
            loading="lazy"
          />
        ) : null}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/0 to-black/0" />

        {/* Type pill */}
        <div className="absolute left-5 top-5">
          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 border border-amber-200/70 backdrop-blur">
            {type}
          </span>
        </div>

        {/* Dots */}
        {hasMany ? (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to image ${i + 1}`}
                className={[
                  "h-2.5 w-2.5 rounded-full border border-white/80 shadow-sm transition",
                  i === idx ? "bg-white" : "bg-white/35 hover:bg-white/60",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="px-8 py-7">
        <div className="min-w-0">
          <h3 className="text-[19px] md:text-[20px] font-semibold tracking-tight text-slate-900 truncate">
            {title}
          </h3>
          {locationLabel ? (
            <p className="mt-1 text-sm text-slate-600">{locationLabel}</p>
          ) : null}
        </div>

        <p className="mt-4 text-[15px] leading-7 text-slate-700">{description}</p>

        {/* Actions — white style */}
        {(href || mapsHref) ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold
                           bg-white text-slate-900 hover:bg-amber-50 transition
                           border border-amber-200/70 shadow-sm"
              >
                Visit
              </a>
            ) : null}

            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold
                           bg-white text-slate-900 hover:bg-amber-50 transition
                           border border-amber-200/70 shadow-sm"
              >
                Open in Maps
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Map */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-700">
              LOCATION
            </p>
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-4"
              >
                Open
              </a>
            ) : null}
          </div>

          <div className="mt-2 rounded-2xl overflow-hidden border border-amber-200/60 bg-slate-50">
            {mapsEmbedSrc ? (
              <iframe
                title={`${title} map`}
                src={mapsEmbedSrc}
                width="100%"
                height="240"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full"
              />
            ) : (
              <div className="p-4 text-sm text-slate-600">
                Map embed not available. {mapsHref ? "Use “Open in Maps” above." : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
