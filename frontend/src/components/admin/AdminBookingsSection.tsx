import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAdminBookingsQuery } from "../../api/admin";
import type { AdminBooking } from "../../api/types";

function formatRange(startDate: string, endDate: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function badgeClass(source: string, status?: string) {
  if (source === "BOOKING_COM") return "bg-orange-100 text-orange-700";
  if (source === "MANUAL") return "bg-slate-200 text-slate-700";
  if (status === "confirmed") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

/**
 * UI classification rules
 *
 * Requirement:
 * - Admin-created bookings are stored as DIRECT bookings in the DB, but we want to categorize them
 *   as MANUAL in this admin list UI so a client can filter "Manual" and see all admin-made holds.
 *
 * - However, admin-created bookings must still display the full DIRECT booking details when expanded,
 *   because they are real bookings (not manualBlock records) and contain guest/payment/price info.
 *
 * Therefore we separate:
 * - category: what the badge + filter shows (DIRECT | BOOKING_COM | MANUAL)
 * - kind: what details panel renders (BOOKING vs BLOCK)
 */
type DisplayCategory = "DIRECT" | "BOOKING_COM" | "MANUAL";
type DetailsKind = "BOOKING" | "BLOCK";

function isAdminDirectBooking(b: any) {
  return (b?.source ?? "DIRECT") === "DIRECT" && b?.payment?.provider === "admin";
}

function displayCategory(b: any): DisplayCategory {
  const s = (b?.source ?? "DIRECT") as string;

  if (s === "BOOKING_COM") return "BOOKING_COM";
  if (s === "MANUAL") return "MANUAL";

  // Admin-created DIRECT bookings are shown as MANUAL in this UI
  if (s === "DIRECT" && isAdminDirectBooking(b)) return "MANUAL";

  return "DIRECT";
}

function detailsKind(b: any): DetailsKind {
  // Admin direct bookings must still render the full booking details panel
  if (isAdminDirectBooking(b)) return "BOOKING";

  const s = (b?.source ?? "DIRECT") as string;
  if (s === "DIRECT") return "BOOKING";
  if (s === "BOOKING_COM") return "BOOKING";
  return "BLOCK";
}

function getStatus(b: any, category: DisplayCategory) {
  if (category === "DIRECT") return b?.status ?? "pending";
  if (category === "BOOKING_COM") return "confirmed";
  return "blocked";
}

function keyOf(b: any) {
  // Stable key based on DB identity, not UI category (category can be derived/mapped)
  const raw = (b?.source ?? "DIRECT") as string;
  return `${raw}:${b?.id ?? "unknown"}`;
}

function isOngoing(startISO: string, endISO: string) {
  const now = new Date();
  const start = new Date(startISO);
  const end = new Date(endISO);
  return start <= now && end > now;
}

function isUpcoming(startISO: string) {
  const now = new Date();
  return new Date(startISO) >= now;
}

function isPast(endISO: string) {
  const now = new Date();
  return new Date(endISO) <= now;
}

/**
 * Parse booking ID from input like:
 * - "123"
 * - "#123"
 */
function parseBookingId(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  const cleaned = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const AdminBookingsSection: React.FC = () => {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] =
    useState<"ALL" | "DIRECT" | "BOOKING_COM" | "MANUAL">("ALL");

  const [showPast, setShowPast] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Cursor pagination applies to DIRECT list.
  const [cursorId, setCursorId] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState<AdminBooking[]>([]);

  // Cancelled pagination applies to DIRECT cancelled list.
  const [cancelCursorId, setCancelCursorId] = useState<number | null>(null);
  const [cancelAccumulated, setCancelAccumulated] = useState<AdminBooking[]>([]);

  // Debounced query to avoid spamming API while typing.
  const debounceRef = useRef<number | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(query.trim());

      // Reset main list
      setCursorId(null);
      setAccumulated([]);
      setOpenKey(null);

      // Reset cancelled section (do not auto-fetch)
      setShowCancelled(false);
      setCancelCursorId(null);
      setCancelAccumulated([]);
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Reset pagination/accumulation when source changes.
  useEffect(() => {
    setCursorId(null);
    setAccumulated([]);
    setOpenKey(null);

    setShowCancelled(false);
    setCancelCursorId(null);
    setCancelAccumulated([]);
  }, [sourceFilter]);

  const bookingIdSearch = useMemo(() => parseBookingId(debouncedQuery), [debouncedQuery]);

  /**
   * Backend filtering:
   * - Keep using the requested source filter for the API call.
   * - MANUAL should return manual blocks (and any backend-defined manual items).
   *
   * UI filtering:
   * - We will map admin-created DIRECT bookings to MANUAL using displayCategory().
   * - This means the MANUAL filter can show both manual blocks and admin-created bookings,
   *   without changing backend schemas or booking/payment creation.
   */
  const mainQueryParams = useMemo(() => {
    return {
      source: sourceFilter,
      bookingId: bookingIdSearch ?? undefined,
      q: bookingIdSearch ? undefined : debouncedQuery || undefined,
      limit: 50,
      cursorId: cursorId ?? undefined,
    };
  }, [sourceFilter, bookingIdSearch, debouncedQuery, cursorId]);

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    isError: bookingsIsError,
    error: bookingsError,
  } = useAdminBookingsQuery(mainQueryParams);

  const nextCursorId = (bookingsData as any)?.nextCursorId ?? null;

  // Merge main pages
  useEffect(() => {
    const incoming: AdminBooking[] = (bookingsData?.bookings ?? []) as any;

    // bookingId search replaces entirely
    if (bookingIdSearch) {
      setAccumulated(incoming);
      return;
    }

    // first page replaces entirely
    if (cursorId === null) {
      setAccumulated(incoming);
      return;
    }

    // load more: append without duplicates
    setAccumulated((prev) => {
      const seen = new Set(prev.map((x) => keyOf(x)));
      const next = [...prev];
      for (const it of incoming) {
        const k = keyOf(it);
        if (!seen.has(k)) next.push(it);
      }
      return next;
    });
  }, [bookingsData?.bookings, bookingIdSearch, cursorId]);

  /**
   * UI filtering:
   * - When a dropdown filter is selected, filter by displayCategory() (UI category), not raw DB source.
   * - This allows admin-created DIRECT bookings to appear under MANUAL in this UI.
   */
  const bookings = useMemo(() => {
    if (sourceFilter === "ALL") return accumulated;
    return accumulated.filter((b) => displayCategory(b) === sourceFilter);
  }, [accumulated, sourceFilter]);

  // Cancelled query: only fetch when the section is opened.
  const canQueryCancelled =
    showCancelled &&
    !bookingIdSearch &&
    (sourceFilter === "ALL" || sourceFilter === "DIRECT");

  const {
    data: cancelledData,
    isLoading: cancelledLoading,
    isError: cancelledIsError,
    error: cancelledError,
  } = useAdminBookingsQuery(
    {
      source: "DIRECT",
      status: "cancelled",
      limit: 50,
      cursorId: cancelCursorId ?? undefined,

      // Optional: if you want cancelled to respect free-text search too:
      // q: debouncedQuery || undefined,
    },
  );

  const cancelledNextCursorId = (cancelledData as any)?.nextCursorId ?? null;

  // Merge cancelled pages
  useEffect(() => {
    if (!canQueryCancelled) return;

    const incoming: AdminBooking[] = (cancelledData?.bookings ?? []) as any;

    if (cancelCursorId === null) {
      setCancelAccumulated(incoming);
      return;
    }

    setCancelAccumulated((prev) => {
      const seen = new Set(prev.map((x) => keyOf(x)));
      const next = [...prev];
      for (const it of incoming) {
        const k = keyOf(it);
        if (!seen.has(k)) next.push(it);
      }
      return next;
    });
  }, [canQueryCancelled, cancelledData?.bookings, cancelCursorId]);

  const cancelledBookings = cancelAccumulated;

  // Split main list into Ongoing / Upcoming / Past
  // Cancelled bookings are not part of the main list (fetched separately on demand).
  const { ongoing, upcoming, past } = useMemo(() => {
    const arr = bookings.slice();

    const ongoingArr = arr
      .filter((b) => isOngoing(b.startDate, b.endDate))
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    const upcomingArr = arr
      .filter((b) => isUpcoming(b.startDate) && !isOngoing(b.startDate, b.endDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const pastArr = arr
      .filter((b) => isPast(b.endDate))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return { ongoing: ongoingArr, upcoming: upcomingArr, past: pastArr };
  }, [bookings]);

  const counts = useMemo(() => {
    const all = bookings as any[];
    const direct = all.filter((b) => displayCategory(b) === "DIRECT").length;
    const bcom = all.filter((b) => displayCategory(b) === "BOOKING_COM").length;
    const manual = all.filter((b) => displayCategory(b) === "MANUAL").length;

    const cancelledCount = (cancelledBookings as any[]).filter(
      (b) => displayCategory(b) === "DIRECT"
    ).length;

    return { total: all.length, direct, bcom, manual, cancelledLoaded: cancelledCount };
  }, [bookings, cancelledBookings]);

  function Row({ b }: { b: any }) {
    const category = displayCategory(b);
    const kind = detailsKind(b);
    const status = getStatus(b, category);
    const range = formatRange(b.startDate, b.endDate);
    const k = keyOf(b);
    const open = openKey === k;

    const propertyTitle = b?.property?.title ?? "—";
    const propertyLoc =
      b?.property?.city && b?.property?.country ? `${b.property.city}, ${b.property.country}` : "";

    /**
     * Row summary info:
     * - For any booking-like item (including admin-direct shown as MANUAL), show guest/email.
     * - For manual blocks, show reason.
     */
    let info = "—";
    if (kind === "BOOKING") {
      info = `${b?.guestName ?? ""}${b?.guestEmail ? ` · ${b.guestEmail}` : ""}`;
    } else if (category === "BOOKING_COM") {
      info = b?.summary ?? "Booking.com reservation";
    } else {
      info = b?.reason ?? "Manual block";
    }

    // Show totals for booking-like items (including admin-direct shown as MANUAL)
    const total = kind === "BOOKING" ? `€${b?.totalPrice ?? 0}` : "—";

    return (
      <div className="border rounded-lg bg-white">
        <button
          type="button"
          onClick={() => setOpenKey((prev) => (prev === k ? null : k))}
          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2"
          aria-expanded={open}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass(
                  category,
                  b?.status
                )}`}
              >
                {category}
              </span>

              <div className="font-semibold text-slate-900 truncate">
                {propertyTitle}
                {kind === "BOOKING" && (
                  <span className="ml-2 text-xs font-semibold text-slate-500">#{b.id}</span>
                )}
              </div>
            </div>

            {propertyLoc && <div className="text-xs text-slate-500">{propertyLoc}</div>}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{range}</span>
              <span className="ml-2 text-slate-500">{info}</span>
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="text-sm font-semibold text-slate-900">{total}</div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass(
                  category,
                  b?.status
                )}`}
              >
                {status}
              </span>
              <span className="text-slate-500 text-sm font-semibold select-none">
                {open ? "▲" : "▼"}
              </span>
            </div>
          </div>
        </button>

        {open && (
          <div className="px-3 pb-3">
            {kind === "BOOKING" ? (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded border bg-white p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Guest</div>
                  <div className="font-semibold text-slate-900">{b.guestName}</div>
                  <div className="text-slate-700">{b.guestEmail}</div>
                  <div className="text-slate-700">{b.guestPhone}</div>
                </div>

                <div className="rounded border bg-white p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Booking</div>

                  <div className="text-slate-700">
                    Booking ID: <span className="font-semibold text-slate-900">#{b.id}</span>
                  </div>

                  <div className="text-slate-700">
                    Guests: <span className="font-semibold text-slate-900">{b.guestsCount}</span>
                  </div>

                  <div className="text-slate-700">
                    Status: <span className="font-semibold text-slate-900">{b.status}</span>
                  </div>

                  <div className="text-slate-700">
                    Total (gross):{" "}
                    <span className="font-semibold text-slate-900">€{b.totalPrice}</span>
                  </div>

                  <div className="text-slate-700">
                    Created:{" "}
                    <span className="font-semibold text-slate-900">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded border bg-white p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Payment & Refund</div>

                    <div className="text-slate-700">
                      Cash paid (Stripe):{" "}
                      <span className="font-semibold text-slate-900">
                        €{(((b.payment?.amountCents ?? 0) as number) / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-slate-700">
                      Cash refunded:{" "}
                      <span className="font-semibold text-slate-900">
                        €{(
                          ((b.refundedTotalCents ?? b.payment?.refundedCents ?? 0) as number) / 100
                        ).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-slate-700">
                      Credits used:{" "}
                      <span className="font-semibold text-slate-900">
                        €{(((b.payment?.creditsAppliedCents ?? 0) as number) / 100).toFixed(2)}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">(non-refundable)</span>
                    </div>

                    <div className="text-xs text-slate-500 mt-2">
                      Refunds are based on cash paid to Stripe only.
                    </div>
                  </div>

                  <div className="rounded border bg-white p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Stay summary</div>

                    <div className="text-slate-700">
                      Nights:{" "}
                      <span className="font-semibold text-slate-900">
                        {Math.max(
                          0,
                          Math.round(
                            (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
                              86400000
                          )
                        )}
                      </span>
                    </div>

                    <div className="text-slate-700">
                      Guests (counted):{" "}
                      <span className="font-semibold text-slate-900">{b.guestsCount}</span>
                    </div>

                    <div className="text-slate-700">
                      Total (gross):{" "}
                      <span className="font-semibold text-slate-900">€{b.totalPrice}</span>
                    </div>

                    <div className="text-xs text-slate-500 mt-2">
                      Nights are calculated from start/end dates (date-only).
                    </div>
                  </div>
                </div>
              </div>
            ) : category === "BOOKING_COM" ? (
              <div className="mt-2 rounded border bg-white p-3 text-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">Booking.com</div>
                <div className="font-semibold text-slate-900">{b.summary ?? "Reserved"}</div>
                <div className="text-slate-700">Note: iCal usually doesn’t include guest contact details.</div>
              </div>
            ) : (
              <div className="mt-2 rounded border bg-white p-3 text-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">Manual Block</div>
                <div className="font-semibold text-slate-900">{b.reason ?? "Blocked"}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Cursor pagination is meaningful only when DIRECT bookings are part of the main result.
  const canLoadMoreMain =
    !bookingIdSearch &&
    (sourceFilter === "DIRECT" || sourceFilter === "ALL") &&
    Boolean(nextCursorId);

  // Cancelled pagination only when cancelled is open and the cancelled query is enabled.
  const canLoadMoreCancelled = canQueryCancelled && Boolean(cancelledNextCursorId);

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Bookings</h2>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            className="border rounded px-3 py-2 text-sm w-full sm:w-[300px]"
            placeholder='Search: "#123" or "123" (ID), or guest/email/property...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className="border rounded px-3 py-2 text-sm"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
          >
            <option value="ALL">All sources</option>
            <option value="DIRECT">Site (DIRECT)</option>
            <option value="BOOKING_COM">Booking.com</option>
            <option value="MANUAL">Manual</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSourceFilter("ALL");
              setOpenKey(null);

              setCursorId(null);
              setAccumulated([]);

              setShowCancelled(false);
              setCancelCursorId(null);
              setCancelAccumulated([]);
            }}
            className="border rounded px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
          Loaded: {counts.total}
        </span>
        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
          Direct: {counts.direct}
        </span>
        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
          Booking.com: {counts.bcom}
        </span>
        <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-semibold">
          Manual: {counts.manual}
        </span>
        {showCancelled && (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
            Cancelled loaded: {counts.cancelledLoaded}
          </span>
        )}
      </div>

      {bookingsLoading ? (
        <div className="text-sm text-slate-600">Loading...</div>
      ) : bookingsIsError ? (
        <div className="text-sm text-red-600">
          {/* @ts-expect-error axios error */}
          {bookingsError?.response?.data?.message ??
            (bookingsError as any)?.message ??
            "Failed to load bookings"}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-sm text-slate-600">No bookings match your filters.</div>
      ) : (
        <div className="space-y-5">
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Ongoing</h3>
              <span className="text-xs text-slate-500">Currently active</span>
            </div>
            {ongoing.length === 0 ? (
              <div className="text-sm text-slate-600">No ongoing bookings/blocks.</div>
            ) : (
              <div className="space-y-2">
                {ongoing.map((b) => (
                  <Row key={`ongoing-${keyOf(b)}`} b={b} />
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Upcoming</h3>
              <span className="text-xs text-slate-500">Soonest first</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="text-sm text-slate-600">No upcoming bookings/blocks.</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((b) => (
                  <Row key={`upcoming-${keyOf(b)}`} b={b} />
                ))}
              </div>
            )}
          </div>

          {/* Cancelled (collapsed, paginated, fetched only when opened) */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Cancelled</h3>

              <button
                type="button"
                onClick={() => {
                  setShowCancelled((v) => {
                    const next = !v;
                    setOpenKey(null);

                    if (next) {
                      setCancelCursorId(null);
                      setCancelAccumulated([]);
                    }

                    return next;
                  });
                }}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                {showCancelled ? "Hide" : "Show"}
              </button>
            </div>

            {!showCancelled ? null : cancelledLoading ? (
              <div className="text-sm text-slate-600">Loading cancelled…</div>
            ) : cancelledIsError ? (
              <div className="text-sm text-red-600">
                {/* @ts-expect-error axios error */}
                {cancelledError?.response?.data?.message ??
                  (cancelledError as any)?.message ??
                  "Failed to load cancelled bookings"}
              </div>
            ) : cancelledBookings.length === 0 ? (
              <div className="text-sm text-slate-600">No cancelled bookings found.</div>
            ) : (
              <>
                <div className="space-y-2">
                  {cancelledBookings.map((b) => (
                    <Row key={`cancelled-${keyOf(b)}`} b={b} />
                  ))}
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    disabled={!canLoadMoreCancelled}
                    onClick={() => {
                      if (!cancelledNextCursorId) return;
                      setCancelCursorId(cancelledNextCursorId);
                    }}
                    className={`border rounded px-4 py-2 text-sm font-semibold ${
                      canLoadMoreCancelled ? "hover:bg-slate-50" : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {canLoadMoreCancelled ? "Load more cancelled" : "No more cancelled results"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Past</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPast((v) => !v);
                  setOpenKey(null);
                }}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                {showPast ? "Hide" : `Show (${past.length})`}
              </button>
            </div>

            {!showPast ? null : past.length === 0 ? (
              <div className="text-sm text-slate-600">No past bookings/blocks.</div>
            ) : (
              <div className="space-y-2">
                {past.slice(0, 30).map((b) => (
                  <Row key={`past-${keyOf(b)}`} b={b} />
                ))}
                {past.length > 30 && (
                  <div className="text-xs text-slate-500">
                    Showing first 30 past items. Use search (#id) to find older bookings.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={!canLoadMoreMain}
              onClick={() => {
                if (!nextCursorId) return;
                setCursorId(nextCursorId);
              }}
              className={`border rounded px-4 py-2 text-sm font-semibold ${
                canLoadMoreMain ? "hover:bg-slate-50" : "opacity-50 cursor-not-allowed"
              }`}
            >
              {canLoadMoreMain ? "Load more" : "No more results"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminBookingsSection;