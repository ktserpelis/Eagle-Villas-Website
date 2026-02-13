import VillasMap from "./VillasMap";

export default function PropertiesHero() {
  return (
    <section className="relative">
      {/* HERO */}
      <div className="relative w-full h-[62vh] min-h-[420px]">
        <img
          src="/images/homeherosplit/image00004.webp"
          alt="Eagle Villas"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/60" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-4 lg:px-8 pb-20">
            <div className="mx-auto max-w-7xl">
              {/* On desktop we reserve space so the map doesn't cover the text */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                <div className="lg:col-span-7">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/95">
                    Our Villas
                  </p>

                  {/* ✅ EXACT sizes you requested */}
                  <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-amber-50">
                    Our Luxury Villas in Sivota, Lefkas
                  </h1>
                  <p className="mt-3 text-sm sm:text-base text-amber-50/90 max-w-2xl">
                    Discover a refined collection of private villas designed for comfort, privacy, and unforgettable moments by the Ionian Sea.
                  </p>
                </div>

                {/* spacer column for the overlaid map */}
                <div className="hidden lg:block lg:col-span-5" />
              </div>
            </div>
          </div>
        </div>

        {/* ✅ EXACT wave snippet you provided */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0] pointer-events-none">
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

        {/* MAP (Desktop overlay on the RIGHT, above the hero) */}
        {/* MAP (Desktop overlay – bigger, lower, more left) */}
        {/* MAP (Desktop overlay – taller, slightly more right) */}
        <div className="hidden lg:block absolute right-28 top-36 z-20 w-[420px] xl:w-[460px]">
          <VillasMap />
        </div>
      </div>

      {/* MAP (Mobile/tablet: sits BELOW hero so the image stays the focus) */}
        <div className="lg:hidden px-4 mt-8 sm:mt-10">
          <VillasMap />
        </div>

        {/* spacing so next section doesn't collide with mobile map */}
        <div className="lg:hidden h-2" />
    </section>
  );
}
