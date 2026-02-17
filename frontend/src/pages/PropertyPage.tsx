// src/pages/PropertyPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { DateRange } from "react-day-picker";

import { useProperty } from "../api/properties";
import { usePropertyCalendar } from "../api/booking";
import { PropertyAvailabilityCalendar } from "../components/villa/PropertyAvailabilityCalendar";

import VillaHero from "@/components/villa/VillaHero";
import VillaAmenitiesBackdrop from "@/components/villa/VillaAmenitiesBackdrop";
import VillaLocationTeaser from "@/components/villa/VillaLocationTeaser";
import VillaGallery from "@/components/villa/VillaGallery";
import PropertyReviewsSection from "@/components/villa/PropertyReviewsSection";

export default function PropertyPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useProperty(slug || "");
  const propertyId = data?.id ?? 0;

  const location = useLocation();
  const calendarWrapRef = useRef<HTMLDivElement>(null);
  const calendarWrapRefDesktop = useRef<HTMLDivElement>(null);

  const parseYmdToLocalDate = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

  const todayYMD = () => ymdLocal(new Date());

  const addMonthsYMD = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return ymdLocal(d);
  };


  const calendarFrom = todayYMD();
  const calendarTo = addMonthsYMD(12);

  const {
    data: calendar,
    isLoading: calendarLoading,
    error: calendarError,
  } = usePropertyCalendar(propertyId, calendarFrom, calendarTo, propertyId > 0);

  useEffect(() => {
  if (!calendar) return;
  const openCount = Object.values(calendar.dailyOpen ?? {}).filter(Boolean).length;
  console.log("hasAnyPeriods:", calendar.hasAnyPeriods, "openDays:", openCount);
  console.log("sample open keys:", Object.entries(calendar.dailyOpen ?? {}).filter(([,v]) => v).slice(0, 5));
  console.log("PROPERTY:", { slug, id: p.id, title: p.title });
}, [calendar]);

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [initialCalendarDate, setInitialCalendarDate] = useState<string | undefined>(undefined);

  const amenitiesRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: { current: HTMLElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const images = useMemo(() => {
    return (data?.images ?? [])
      .slice()
      .sort((a: any, b: any) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
      .map((img: any) => img?.url)
      .filter(Boolean);
  }, [data?.images]);

  const amenities = useMemo(() => {
    return (data?.amenities ?? [])
      .slice()
      .sort((a: any, b: any) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
      .map((a: any) => a?.label)
      .filter(Boolean);
  }, [data?.amenities]);

  const heroImage = "/images/homehero/image00022.webp";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const start = params.get("start");
    const end = params.get("end");

    if (!start && !end) return;

    const from = start ? parseYmdToLocalDate(start) : null;
    const to = end ? parseYmdToLocalDate(end) : null;

    if (start) setInitialCalendarDate(start);

    if (from) {
      if (to && to > from) setSelectedRange({ from, to });
      else setSelectedRange({ from, to: undefined });

      requestAnimationFrame(() => {
        calendarWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        calendarWrapRefDesktop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.search]);

  if (!slug) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-100 px-4">
        <p className="text-sm text-stone-700">No property selected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-100 px-4">
        <p className="text-sm text-stone-700">Loading property…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-100 px-4">
        <p className="text-sm text-red-600">Error loading property.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-stone-100 px-4">
        <p className="text-sm text-stone-700">Property not found.</p>
      </div>
    );
  }

  const p = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-stone-100 via-stone-100 to-stone-200">
      <VillaHero
        title={p.title}
        subtitle={`${p.city}, ${p.country}`}
        heroImage={heroImage}
        pricePerNight={p.pricePerNight}
        maxGuests={p.maxGuests}
        backHref="/properties"
        backLabel="Back to all villas"
        reviews={
          <>
            {/* Mobile: calendar ABOVE reviews */}
            <div className="lg:hidden">
              <div ref={calendarWrapRef} className="mt-4 overflow-hidden">
                {!calendarLoading && !calendarError && (
                  <PropertyAvailabilityCalendar
                    items={calendar?.blocks}
                    dailyOpen={calendar?.dailyOpen} 
                    dailyPrices={calendar?.dailyPrices}
                    defaultNightlyPrice={p.pricePerNight}
                    maxGuests={p.maxGuests}
                    selectedRange={selectedRange}
                    onChange={setSelectedRange}
                    propertySlug={slug}
                    initialDate={initialCalendarDate}
                  />
                )}
              </div>

              <div className="mt-6">
                <PropertyReviewsSection propertyId={propertyId} compactHeader initialVisible={2} />
              </div>
            </div>

            {/* Desktop: reviews unchanged */}
            <div className="hidden lg:block">
              <PropertyReviewsSection propertyId={propertyId} compactHeader initialVisible={2} />
            </div>
          </>
        }
        calendar={
          <div className="hidden lg:block">
            <div ref={calendarWrapRefDesktop} className="mt-4 overflow-hidden">
              {!calendarLoading && !calendarError && (
                <PropertyAvailabilityCalendar
                  items={calendar?.blocks}
                  dailyOpen={calendar?.dailyOpen}
                  dailyPrices={calendar?.dailyPrices}
                  defaultNightlyPrice={p.pricePerNight}
                  maxGuests={p.maxGuests}
                  selectedRange={selectedRange}
                  onChange={setSelectedRange}
                  propertySlug={slug}
                  initialDate={initialCalendarDate}
                />
              )}
            </div>
          </div>
        }
        onAmenities={() => scrollTo(amenitiesRef)}
        onLocation={() => scrollTo(locationRef)}
        onGallery={() => scrollTo(galleryRef)}
        bookHref={`/properties/${p.slug}/book`}
      />

      {/* Increased spacing between reviews/calendar and amenities */}
      <div className="h-[28rem] sm:h-36 md:h-40" />

      <div ref={amenitiesRef} className="mt-24 sm:mt-12 md:mt-16">
        <VillaAmenitiesBackdrop
          /*
          Right-side image is backend-sourced via the property image list.
          We use the first sorted image URL to ensure consistent ordering across environments.
          Fallback is a static public asset to prevent broken UI if the property has no images.
        */
          rightImage={images[0] ?? "/images/fallback.webp"}
          title="Warm, earthy living — made for slow island days."
          amenities={amenities}
          description={p.description}
        />
      </div>

      <div ref={locationRef} className="mt-16 sm:mt-20 md:mt-24">
        <VillaLocationTeaser/>
      </div>

      <div ref={galleryRef} className="mt-16 sm:mt-20 md:mt-24">
        <VillaGallery images={images.length ? images : [heroImage]} />
      </div>

      <div className="h-14 md:h-20" />
    </div>
  );
}
