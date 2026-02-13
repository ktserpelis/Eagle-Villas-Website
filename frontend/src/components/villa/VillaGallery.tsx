// src/components/villa/VillaGallery.tsx
import { useEffect, useRef, useState } from "react";

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return { ref, inView };
}

type Props = {
  images: string[];
};

export default function VillaGallery({ images }: Props) {
  // ✅ Lightbox state (does not change existing gallery styling)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openAt = (idx: number) => {
    setActiveIndex(idx);
    setLightboxOpen(true);
  };

  const close = () => setLightboxOpen(false);

  const prev = () => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  };

  const next = () => {
    setActiveIndex((i) => (i + 1) % images.length);
  };

  // ✅ Keyboard navigation + ESC + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, images.length]);

  if (!images.length) return null;

  return (
    <section className="mt-14 md:mt-20 w-full px-4 lg:px-8 pb-16">
      <div className="mb-6">
        <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
          Gallery
        </p>
        <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold text-stone-900">
          A closer look
        </h2>
        <p className="mt-3 text-sm sm:text-base md:text-lg text-stone-700 max-w-2xl">
          Scroll to explore the villa — soft light, natural textures, and sea views.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src, idx) => (
          <RevealImage key={`${src}-${idx}`} src={src} onOpen={() => openAt(idx)} />
        ))}
      </div>

      {/* ✅ Lightbox overlay (black, X, arrows, centered image) */}
      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[9999] bg-black"
          // iOS/Safari click safety
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
        >
          {/* Backdrop (click to close) - behind controls */}
          <div
            className="absolute inset-0 z-[1]"
            onClick={close}
            role="button"
            tabIndex={-1}
            aria-label="Close lightbox"
          />

          {/* Controls & image layer */}
          <div className="relative z-[2] h-full w-full">
            {/* Close X */}
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute right-6 top-6 text-white/80 hover:text-white text-3xl leading-none cursor-pointer"
              style={{ pointerEvents: "auto" }}
            >
              ×
            </button>

            {/* Left arrow */}
            {images.length > 1 ? (
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-5xl leading-none cursor-pointer select-none"
                style={{ pointerEvents: "auto" }}
              >
                ‹
              </button>
            ) : null}

            {/* Right arrow */}
            {images.length > 1 ? (
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-5xl leading-none cursor-pointer select-none"
                style={{ pointerEvents: "auto" }}
              >
                ›
              </button>
            ) : null}

            {/* Centered image (click does NOT close) */}
            <div className="h-full w-full flex items-center justify-center px-6 py-8">
              <img
                src={images[activeIndex]}
                alt=""
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RevealImage({ src, onOpen }: { src: string; onOpen: () => void }) {
  const { ref, inView } = useInView<HTMLDivElement>({
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.15,
  });

  return (
    <div
      ref={ref}
      className={[
        "rounded-[1.6rem] overflow-hidden bg-stone-200 border border-stone-200 shadow-[0_18px_40px_rgba(24,20,15,0.08)]",
        "transition-all duration-700 ease-out",
        inView
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-[0.98]",
      ].join(" ")}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      <div className="relative h-56 sm:h-64 md:h-72">
        <img src={src} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-transparent" />
      </div>
    </div>
  );
}
