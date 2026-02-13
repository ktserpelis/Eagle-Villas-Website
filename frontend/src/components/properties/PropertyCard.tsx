import { useNavigate } from "react-router-dom";
import VerticalImageCarousel from "./VerticalImageCarousel";
import { PropertyFeatureIcons } from "../PropertyFeatureRegistry";

type Props = {
  /**
   * Property payload used to render this card.
   * Replace `any` with your actual Property DTO when available
   * to enforce frontend/backend contract consistency.
   */
  property: any;
};

export default function PropertyCard({ property: p }: Props) {
  const navigate = useNavigate();

  /**
   * Canonical route built from backend-provided slug.
   * Only the CTA button performs navigation.
   */
  const to = `/properties/${p.slug}`;

  /**
   * Normalize backend image relation to a clean string[].
   * Prevents runtime issues if images are missing or malformed.
   */
  const images = (p.images ?? []).map((img: any) => img.url).filter(Boolean);

  /**
   * Normalize feature relation payload to a string[] of keys.
   * Keeps the icon system resilient if backend payload shape evolves.
   */
  const featureKeys = Array.isArray(p.features)
    ? p.features.map((f: any) => f?.key).filter(Boolean)
    : [];

  /**
   * Progressive enhancement using View Transitions API.
   * Falls back gracefully if unsupported.
   */
  const goWithTransition = (url: string) => {
    const startVT = document.startViewTransition?.(() => navigate(url));
    if (!startVT) navigate(url);
  };

  return (
    <div
      className="group rounded-[2rem] overflow-hidden
                 bg-[#d9bf93] border border-[#b58d4a]
                 shadow-[0_18px_40px_rgba(24,20,15,0.12)]
                 hover:shadow-[0_26px_60px_rgba(24,20,15,0.16)]
                 transition-shadow"
    >
      {/* Image Section */}
      <div className="relative h-[300px] sm:h-[360px] md:h-[420px] bg-stone-200 overflow-hidden">
        <VerticalImageCarousel
          images={images}
          alt={p.title}
          className="absolute inset-0"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/35 pointer-events-none" />

        {/* Price Pill (Backend-sourced price) */}
        <div className="absolute bottom-4 left-4 inline-flex items-baseline gap-2 rounded-full bg-amber-100/95 px-4 py-2 text-sm font-extrabold text-stone-900 shadow shadow-stone-900/20">
          €{p.pricePerNight}
          <span className="text-xs font-semibold text-stone-700">/ night</span>
        </div>
      </div>

      {/* Bottom Info Section */}
      <div className="bg-[#caa25b]/80 border-t border-[#a97a34]/70 px-6 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* 
              Title Typography aligned with previous component:
              - Larger scale
              - Semi-bold instead of extra-bold
              - Tighter tracking for premium feel
            */}
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 leading-tight">
              {p.title}
            </h2>

            <p className="mt-1 text-base sm:text-lg font-semibold text-stone-900/90">
              {p.city}, {p.country}
            </p>

            {/* Capacity line (backend-sourced only) */}
            <p className="mt-2 text-base sm:text-lg font-semibold text-stone-900">
              Max {p.maxGuests} guests
            </p>
          </div>

          {/* CTA Column */}
          <div className="pt-1 w-[220px] sm:w-[240px] flex flex-col items-end gap-5">
            {/* 
              Button typography aligned with previous component:
              - Larger scale
              - Bold but not extra-black
              - Clean tracking (no aggressive letter spacing)
            */}
            <button
              type="button"
              onClick={() => goWithTransition(to)}
              className="inline-flex items-center justify-center rounded-full
                         bg-[#f0e1c6] border border-[#a97a34]
                         px-7 sm:px-8 py-3.5
                         text-lg sm:text-xl font-bold tracking-tight text-stone-900
                         shadow-[0_10px_22px_rgba(24,20,15,0.18)]
                         transition-all duration-200
                         hover:bg-[#f7efdF] hover:shadow-[0_16px_34px_rgba(24,20,15,0.26)]
                         hover:-translate-y-0.5 hover:scale-[1.02]
                         active:translate-y-0 active:scale-[0.99]"
            >
              View villa <span className="ml-2">→</span>
            </button>

            {/* Feature Icons */}
            <div className="mt-3 flex justify-end">
              <div className="min-h-[36px] max-h-[72px] overflow-hidden">
                <PropertyFeatureIcons
                  featureKeys={featureKeys}
                  className="gap-3 justify-end flex-wrap"
                  iconClassName="w-5 h-5 text-black"
                  itemClassName="inline-flex items-center p-0 bg-transparent border-0 shadow-none text-black"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
