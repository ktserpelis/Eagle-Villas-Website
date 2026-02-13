// src/components/villa/VillaHero.tsx
import { Link } from "react-router-dom";

type Props = {
  title: string;
  subtitle: string;
  heroImage: string;
  pricePerNight: number;
  maxGuests: number;
  calendar: React.ReactNode;
  reviews?: React.ReactNode;

  onAmenities: () => void;
  onLocation: () => void;
  onGallery: () => void;
  bookHref: string;

  // keep these because PropertyPage passes them (no layout change on PC)
  backHref?: string;
  backLabel?: string;
};

export default function VillaHero({
  title,
  subtitle,
  heroImage,
  calendar,
  reviews,
  onAmenities,
  onLocation,
  onGallery,
  bookHref,
}: Props) {
  return (
    <section className="relative w-full h-[82vh] min-h-[620px] overflow-visible">
      <img src={heroImage} alt={title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/70" />

      <div className="absolute inset-0 z-10">
        <div className="w-full h-full px-4 lg:px-8 pt-16 pb-32 flex flex-col">
          {/* Title */}
          {/* ✅ MOBILE ONLY: push title down so it never overlaps navbar */}
          <div className="max-w-4xl mt-6 md:mt-0">
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-200/95">
              Villa
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold text-amber-50 leading-tight">
              {title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-amber-50/90 max-w-2xl">
              {subtitle}
            </p>
          </div>

          {/* Bottom interactive row */}
          <div className="mt-auto">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-start">
              {/* ✅ MOBILE ONLY: buttons above calendar */}
              {/* ✅ PC stays exactly same grid/spacing */}
              <div className="order-2 md:order-none relative -mb-0 md:-mb-28 sm:-mb-24">
                {/* on mobile: no negative margin so it won't overlap next section */}
                <div className="mt-6 md:mt-10">{calendar}</div>
              </div>

              <div className="order-1 md:order-none flex flex-col pt-4 md:pt-32 sm:pt-28 h-full">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onAmenities}
                    className="rounded-2xl bg-[#f0e1c6]/90 text-stone-900 font-bold tracking-tight text-sm sm:text-base py-3
           shadow-[0_18px_38px_rgba(0,0,0,0.25)]
           hover:bg-[#f7efdF] hover:-translate-y-0.5 transition-all"
                  >
                    Amenities
                  </button>

                  <button
                    type="button"
                    onClick={onLocation}
                    className="rounded-2xl bg-[#f0e1c6]/90 text-stone-900 font-bold tracking-tight text-sm sm:text-base py-3
           shadow-[0_18px_38px_rgba(0,0,0,0.25)]
           hover:bg-[#f7efdF] hover:-translate-y-0.5 transition-all"
                  >
                    Location
                  </button>

                  <button
                    type="button"
                    onClick={onGallery}
                    className="rounded-2xl bg-[#f0e1c6]/90 text-stone-900 font-bold tracking-tight text-sm sm:text-base py-3
           shadow-[0_18px_38px_rgba(0,0,0,0.25)]
           hover:bg-[#f7efdF] hover:-translate-y-0.5 transition-all"
                  >
                    Gallery
                  </button>

                  <Link
                    to={bookHref}
                    className="rounded-2xl bg-amber-500 text-amber-950 font-bold tracking-tight text-base sm:text-base py-3 text-center
           shadow-[0_18px_38px_rgba(0,0,0,0.25)]
           hover:bg-amber-400 hover:-translate-y-0.5 transition-all"
                  >
                    Book now
                  </Link>
                </div>


                {reviews ? (
                  <div className="mt-auto pt-3">
                    {reviews}
                  </div>
                ) : null}


              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0] pointer-events-none">
        <svg
          viewBox="0 0 1440 220"
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full h-24 sm:h-28 md:h-32"
          preserveAspectRatio="none"
        >
          <path
            d="M0,190 C480,230 960,40 1440,80 L1440,220 L0,220 Z"
            fill="#f5f5f4"
          />
        </svg>
      </div>
    </section>
  );
}
