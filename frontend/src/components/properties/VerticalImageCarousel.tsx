import { useEffect, useMemo, useState } from "react";

type Props = {
  images: string[];
  alt: string;
  className?: string;
};

export default function VerticalImageCarousel({ images, alt, className }: Props) {
  // ✅ interval variable (3s)
  const AUTO_MS = 4000;

  const baseSlides = useMemo(() => (images?.length ? images : []), [images]);
  const count = baseSlides.length;

  // Daisy-chain: clone first at end
  const slides = useMemo(() => {
    if (count <= 1) return baseSlides;
    return [...baseSlides, baseSlides[0]];
  }, [baseSlides, count]);

  const [index, setIndex] = useState(0);
  const [withTransition, setWithTransition] = useState(true);

  // Auto advance
  useEffect(() => {
    if (count <= 1) return;

    const id = window.setInterval(() => {
      setWithTransition(true);
      setIndex((i) => i + 1);
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [count, AUTO_MS]);

  // Snap after hitting clone
  useEffect(() => {
    if (count <= 1) return;

    if (index === count) {
      const t = window.setTimeout(() => {
        setWithTransition(false);
        setIndex(0);
        requestAnimationFrame(() => setWithTransition(true));
      }, 720);
      return () => window.clearTimeout(t);
    }
  }, [index, count]);

  if (count === 0) {
    return (
      <div
        className={`${className ?? ""} w-full h-full flex items-center justify-center text-sm text-stone-600`}
      >
        No image available
      </div>
    );
  }

  const stepPct = 100 / slides.length;
  const translatePct = index * stepPct;

  return (
    <div className={`${className ?? ""} w-full h-full relative`}>
      <div className="w-full h-full overflow-hidden">
        <div
          className="w-full"
          style={{
            height: `${slides.length * 100}%`,
            transform: `translateY(-${translatePct}%)`,
            transition: withTransition ? "transform 700ms ease-out" : "none",
          }}
        >
          {slides.map((src, i) => (
            <div key={`${src}-${i}`} style={{ height: `${100 / slides.length}%` }}>
              <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
