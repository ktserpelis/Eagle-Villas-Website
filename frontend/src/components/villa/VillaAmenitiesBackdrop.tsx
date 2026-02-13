type Props = {
  /**
   * Secondary image URL used for the right-side framed visual.
   * This should be sourced from the backend (recommended: property.images[0]?.url).
   */
  rightImage: string;

  /**
   * Backend-sourced title for the amenities section.
   */
  title: string;

  /**
   * Backend-sourced list of amenities.
   */
  amenities: string[];

  /**
   * Backend-sourced descriptive paragraph text.
   */
  description: string;
};

export default function VillaAmenitiesBackdrop({
  rightImage,
  title,
  amenities,
  description,
}: Props) {
  /**
   * Static background image:
   * Kept intentionally hardcoded so a fresh production DB does not require
   * additional image management for the backdrop.
   *
   * Store the file in /public/images and reference it via an absolute path.
   */
  const BACKGROUND_IMAGE = "/images/location/Screenshot 2025-01-28 184209.webp";

  return (
    <section className="relative w-full min-h-[75vh]">
      <div className="absolute inset-0">
        <img src={BACKGROUND_IMAGE} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-8 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 items-start">
          <div className="max-w-xl">
            <p className="text-xs sm:text-sm uppercase tracking-[0.26em] text-amber-200/95">
              Amenities
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold text-amber-50 leading-tight">
              {title}
            </h2>

            <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm sm:text-base text-amber-50/90">
              {amenities.map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full">
            <div className="rounded-[2rem] overflow-hidden border border-white/20 shadow-[0_22px_50px_rgba(0,0,0,0.35)] bg-white/10">
              <div className="relative h-[260px] sm:h-[340px] md:h-[420px]">
                <img src={rightImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-base sm:text-lg text-amber-50/90 max-w-5xl">
          {description}
        </p>
      </div>
    </section>
  );
}
