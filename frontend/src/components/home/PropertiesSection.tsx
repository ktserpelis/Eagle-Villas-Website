// src/components/home/PropertiesSection.tsx
import { Link } from "react-router-dom";
import { useProperties } from "../../api/properties";

export default function PropertiesSection() {
  const { data, isLoading, error } = useProperties();
  const properties = data ?? [];
  const featured = properties.slice(0, 4);

  const MOBILE_SECTION_WIDTH = "-mx-6"; // tweak if you want more/less full-bleed on mobile

  return (
    <section
      className={`mt-6 sm:mt-8 md:mt-10 px-4 sm:px-8 ${MOBILE_SECTION_WIDTH} md:mx-0`}
    >
      {/* Heading */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
        <div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
            Our Villas
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-semibold text-stone-900 leading-tight">
            Two-bedroom & premium villas
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-stone-700 mt-1">
            A small selection of our villas in Eagle Villas.
          </p>
        </div>

        {properties.length > 0 && (
          <Link
            to="/properties"
            className="text-sm sm:text-base font-semibold text-amber-800 hover:text-amber-600"
          >
            View all villas →
          </Link>
        )}
      </div>

      {isLoading && <p className="text-sm text-stone-600">Loading villas…</p>}

      {error && (
        <p className="text-sm text-red-600">
          Error loading properties. Please try again.
        </p>
      )}

      {!isLoading && !error && properties.length === 0 && (
        <p className="text-sm text-stone-500">
          No villas available yet. Please check back soon.
        </p>
      )}

      {!isLoading && !error && featured.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((p) => (
            // ✅ Not clickable card anymore (only the button Link navigates)
            <div key={p.id} className="group">
              <div
                className="relative rounded-[2rem] overflow-hidden bg-stone-900/80
                           min-h-[320px] sm:min-h-[360px] md:min-h-[520px] lg:min-h-[600px]"
              >
                {/* IMAGE */}
                <div className="absolute inset-0">
                  {p.images[0] ? (
                    <img
                      src={p.images[0].url}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-stone-200 bg-stone-800">
                      No image available
                    </div>
                  )}
                </div>

                {/* overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/40" />

                {/* DESKTOP TITLE PILL (title + max guests, bigger, not overly bold) */}
                <div className="hidden md:flex absolute top-6 left-1/2 -translate-x-1/2 flex-col items-center px-4">
                  <div className="rounded-full bg-amber-100/95 px-8 py-4 shadow-md shadow-stone-900/20 text-center">
                    <span className="block text-2xl lg:text-3xl font-semibold text-stone-900 leading-none tracking-tight">
                      {p.title}
                    </span>

                    <span className="block mt-1 text-sm lg:text-base font-medium text-stone-700">
                      Up to {p.maxGuests} guests
                    </span>
                  </div>
                </div>

                {/* BUTTON (only navigation) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <Link
                    to={`/properties/${p.slug}`}
                    className="inline-flex rounded-full bg-white px-10 py-3.5
                              text-base sm:text-lg lg:text-xl
                              font-bold tracking-tight
                              text-stone-900
                              shadow-[0_10px_22px_rgba(24,20,15,0.30)]
                              hover:bg-amber-50 transition-colors"
                    aria-label={`View villa ${p.title}`}
                  >
                    View Villa {p.title}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
