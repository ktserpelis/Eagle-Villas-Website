import { useProperties } from "../api/properties";
import PropertiesHero from "../components/properties/PropertiesHero.tsx";
import PropertyGrid from "../components/properties/PropertyGrid.tsx";

export default function PropertiesPage() {
  const { data, isLoading, error } = useProperties();
  const properties = data ?? [];

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-100 px-4">
        <p className="text-sm text-stone-700">Loading villas…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-100 px-4">
        <p className="text-sm text-red-600">Error loading properties.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-stone-100 via-stone-100 to-stone-200">
      <PropertiesHero />

      {/* ✅ Added extra top spacing on mobile to prevent hero/map overlap */}
      <div className="w-full px-4 lg:px-8 pt-14 pb-10 md:py-14">
        {properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-10 text-center text-base text-stone-600">
            No villas are available yet. Please check back soon.
          </div>
        ) : (
          <PropertyGrid properties={properties} />
        )}
      </div>
    </div>
  );
}
