// src/pages/BookingPage.tsx
import { Link, useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useProperty } from "../api/properties";
import { BookingForm } from "../components/BookingForm";

/**
 * Developer helper:
 * Parse YYYY-MM-DD safely into a UTC Date (no timezone drift).
 * We use noon UTC to avoid DST edge-cases.
 */
function ymdToUtcDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatMoneyEUR(value: number) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value}€`;
  }
}

function nightsBetween(startYMD: string, endYMD: string) {
  const start = ymdToUtcDate(startYMD);
  const end = ymdToUtcDate(endYMD);
  if (!start || !end) return null;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const nights = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return nights > 0 ? nights : null;
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  // Read dates from query string (?start=YYYY-MM-DD&end=YYYY-MM-DD)
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const initialStartDate = searchParams.get("start") ?? "";
  const initialEndDate = searchParams.get("end") ?? "";

  // ✅ Correct hook usage: only call with a non-empty slug string
  const { data, isLoading, error } = useProperty(slug || "");

  if (!slug) return <div className="p-4">No property selected.</div>;
  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error)
    return <div className="p-4 text-red-500">Error loading property.</div>;
  if (!data) return <div className="p-4">Property not found.</div>;

  const p = data;

  // Developer note:
  // This "Estimated total" is ONLY a UX estimate using base pricePerNight.
  // The real total charged is computed on the backend when the booking is created.
  const nights = nightsBetween(initialStartDate, initialEndDate);
  const estimatedTotal =
    nights && typeof p.pricePerNight === "number" ? nights * p.pricePerNight : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pt-24">
      <Link
        to={`/properties/${p.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900"
      >
        <span aria-hidden>←</span> Back to {p.title}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-stone-900">
        Book {p.title}
      </h1>

      <p className="mt-1 text-sm text-stone-600">
        {p.city}, {p.country} • Sleeps {p.maxGuests} • {formatMoneyEUR(p.pricePerNight)}
        /night
      </p>

      {(initialStartDate && initialEndDate) && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            Your dates: {initialStartDate} → {initialEndDate}
          </p>
          <p className="mt-1 text-xs text-amber-900/80">
            Estimated total:{" "}
            <span className="font-semibold">
              {estimatedTotal ? formatMoneyEUR(estimatedTotal) : "—"}
            </span>
            {nights ? ` (${nights} night${nights === 1 ? "" : "s"})` : ""}
          </p>
        </div>
      )}

      {p.images?.[0]?.url && (
        <img
          src={p.images[0].url}
          alt={p.title}
          className="mt-4 w-full max-h-64 object-cover rounded-2xl"
          loading="lazy"
        />
      )}

      {/* ✅ YES: BookingForm is rendered right here */}
      <BookingForm
        propertyId={p.id}
        maxGuests={p.maxGuests}
        initialStartDate={initialStartDate}
        initialEndDate={initialEndDate}
      />
    </div>
  );
}
