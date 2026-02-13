import { useMemo, useState } from "react";

/**
 * Beach configuration.
 * Each beach includes its own Google Maps embed URL.
 * These embed links are generated from Google Maps → Share → Embed.
 */
const beaches = [
  {
    id: "amousa",
    name: "Ammousa Beach",
    short: "A quiet cove with clear water — great for relaxed swims.",
    embed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d35272.306524175096!2d20.631275728731033!3d38.610674695800185!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135db9fb7349544f%3A0xe5fd49b935bd9a38!2sAmmoussa%20Beach!5e0!3m2!1sen!2sgr!4v1770987226577!5m2!1sen!2sgr",
  },
  {
    id: "afteli",
    name: "Afteli Beach",
    short: "Turquoise water in a small bay — arrive early for calm vibes.",
    embed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d41943.12258007048!2d20.64813325366503!3d38.615729247545296!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135db77bac2118bd%3A0x68a17aed1c9d20e!2sAfteli%20Beach!5e0!3m2!1sen!2sgr!4v1770988172225!5m2!1sen!2sgr",
  },
  {
    id: "mikros_gialos",
    name: "Mikros Gialos",
    short: "A sheltered bay with deep blue water and seaside tavernas nearby.",
    embed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3116.408439546376!2d20.693143975392555!3d38.63948791188154!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135db63397715941%3A0x6bd9e1ecff1c3aae!2sParalia%20Mikros%20Gialos!5e0!3m2!1sen!2sgr!4v1770988222364!5m2!1sen!2sgr",
  },
] as const;

type BeachId = (typeof beaches)[number]["id"];

export default function BeachesMapSection() {
  const [activeId, setActiveId] = useState<BeachId>("amousa");

  /**
   * The currently selected beach is the single source of truth for:
   * - The displayed embed map
   * - The active dot indicator
   * - The active state in the selector list
   */
  const active = useMemo(
    () => beaches.find((b) => b.id === activeId) ?? beaches[0],
    [activeId]
  );

  return (
    <section className="mt-12 sm:mt-14 md:mt-16">
      <div className="w-full flex flex-col md:flex-row md:items-stretch">
        {/* Text left */}
        <div className="w-full md:w-1/2 flex items-center">
          <div className="w-full max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-10 md:py-12 space-y-4 sm:space-y-5">
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-700">
              Beaches near Sivota
            </p>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.4rem] font-semibold text-stone-900 leading-tight">
              Three favourites for quick swims
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-stone-700">
              Small coves, clear water and sheltered bays — perfect for slow mornings
              and easy beach-hopping.
            </p>

            {/* Minimal beach selectors */}
            <div className="pt-2">
              <div className="space-y-2">
                {beaches.map((b) => {
                  const isActive = b.id === activeId;

                  return (
                    <button
                      key={b.id}
                      onClick={() => setActiveId(b.id)}
                      className="
                        group w-full text-left
                        rounded-2xl
                        px-3 py-3
                        transition-colors
                        hover:bg-stone-50/70
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70
                      "
                      aria-label={`Show ${b.name} on the map`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Minimal indicator for the active beach */}
                        <div className="pt-1">
                          <span
                            className={`
                              block h-2 w-2 rounded-full transition-all
                              ${
                                isActive
                                  ? "bg-amber-500"
                                  : "bg-stone-300 group-hover:bg-stone-400"
                              }
                            `}
                          />
                        </div>

                        <div className="min-w-0">
                          <div
                            className={`
                              text-sm sm:text-base font-semibold truncate
                              ${isActive ? "text-stone-900" : "text-stone-800"}
                            `}
                          >
                            {b.name}
                          </div>
                          <div className="mt-0.5 text-sm text-stone-600">
                            {b.short}
                          </div>
                        </div>
                      </div>

                      {/* Subtle divider to separate options without a boxed look */}
                      <div className="mt-3 h-px w-full bg-stone-200/70 group-last:hidden" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Map right */}
        <div className="w-full md:w-1/2">
          <div className="relative h-64 sm:h-80 md:h-[420px] lg:h-[480px] overflow-hidden rounded-3xl md:rounded-r-none md:rounded-l-[2.5rem]">
            {/* Embedded Google Map (no JS API required) */}
            <iframe
              src={active.embed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0"
              title={`${active.name} map`}
            />

            {/* Same overlay gradient as the rest of the site */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent" />

            {/* Dots remain manual selectors (no automatic rotation) */}
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {beaches.map((b) => {
                const isActive = b.id === activeId;
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveId(b.id)}
                    className={`h-1.5 rounded-full transition-all ${
                      isActive
                        ? "w-4 bg-amber-400"
                        : "w-2 bg-amber-100/80 hover:bg-amber-200"
                    }`}
                    aria-label={`Go to ${b.name}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}