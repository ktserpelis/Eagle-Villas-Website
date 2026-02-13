// src/components/villa/PropertyAvailabilityCalendar.tsx
import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import type { CalendarItemPublic } from "../../api/types";
import React from "react";

interface Props {
  items: CalendarItemPublic[] | undefined;

  // Daily prices by YYYY-MM-DD (period price). If missing -> fallback.
  dailyPrices?: Record<string, number>;

  // Standard/base price (Property.pricePerNight)
  defaultNightlyPrice: number;

  // Property.maxGuests
  maxGuests: number;

  selectedRange: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  propertySlug: string;

   // When provided (YYYY-MM-DD), calendar jumps to that month
  initialDate?: string;

   // ✅ NEW: availability by YYYY-MM-DD. true only if OPEN period covers that day.
  dailyOpen?: Record<string, boolean>;
}

// ---------- helpers ----------
function isoDateOnly(d: Date) {
  // YYYY-MM-DD in local time
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function PropertyAvailabilityCalendar({
  items,
  dailyPrices,
  defaultNightlyPrice,
  maxGuests,
  selectedRange,
  onChange,
  propertySlug,
  initialDate,
  dailyOpen,
}: Props) {
  const navigate = useNavigate();

  const calendarRef = React.useRef<FullCalendar | null>(null);

  // Jump calendar to the selected start date (or initialDate) whenever it changes
  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    // Prefer selectedRange.from (real selection), fallback to initialDate (query param)
    const target =
      selectedRange?.from ?? (initialDate ? new Date(`${initialDate}T00:00:00`) : null);

    if (!target) return;

    api.gotoDate(target);
  }, [selectedRange?.from, initialDate]);

  // mobile-ish layout tweaks (keeps your customer style)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const blocksSafe = items ?? [];

  const blockedRanges = useMemo(() => {
    // Convert to Date objects once
    return blocksSafe.map((b) => ({
      start: new Date(b.startDate), // inclusive
      end: new Date(b.endDate), // exclusive (checkout)
    }));
  }, [blocksSafe]);

  function isBlockedDay(day: Date) {
    // blocked if day >= start && day < end (checkout exclusive)
    return blockedRanges.some((r) => day >= r.start && day < r.end);
  }

  function isOpenDay(day: Date) {
    const key = isoDateOnly(day);
    return dailyOpen?.[key] === true;
  }

  function priceForDate(day: Date) {
    const key = isoDateOnly(day);
    if (!isOpenDay(day)) return null;
    return dailyPrices?.[key] ?? defaultNightlyPrice;
  }

  function isRangeAvailable(from: Date, to: Date) {
    // to is checkout day (exclusive); check nights from "from" to "to - 1"
    let cur = startOfDay(from);
    const end = startOfDay(to);

    while (cur < end) {
      if (isBlockedDay(cur)) return false;
      if (!isOpenDay(cur)) return false;
      cur = addDays(cur, 1);
    }
    return true;
  }

  // ---------- top summary ----------
  const checkIn = selectedRange?.from;
  const checkOut = selectedRange?.to;

  const summaryNightly = checkIn ? (priceForDate(checkIn) ?? defaultNightlyPrice) : defaultNightlyPrice;

  const summaryText =
    checkIn && checkOut
      ? `Selected: ${formatDay(checkIn)} → ${formatDay(checkOut)}`
      : checkIn
      ? `Check-in: ${formatDay(checkIn)}`
      : `Choose your check-in date`;

  const handleBookClick = () => {
    if (!selectedRange?.from || !selectedRange?.to) {
      alert("Please select check-in and check-out dates first.");
      return;
    }

    // Developer note:
    // BookingPage reads ?start=YYYY-MM-DD&end=YYYY-MM-DD from the querystring.
    const start = isoDateOnly(selectedRange.from);
    const end = isoDateOnly(selectedRange.to);

    navigate(
      `/properties/${encodeURIComponent(
        propertySlug
      )}/book?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
  };

  // ---------- click selection logic ----------
  const onDateClick = (arg: any) => {
    const clicked = startOfDay(arg.date);

    // disallow selecting blocked days
    if (isBlockedDay(clicked)) return;
    if (!isOpenDay(clicked)) return;

    // no selection yet -> set from
    if (!selectedRange?.from) {
      onChange({ from: clicked, to: undefined });
      return;
    }

    // only from selected
    if (selectedRange.from && !selectedRange.to) {
      // clicking same day again clears
      if (isSameDay(selectedRange.from, clicked)) {
        onChange(undefined);
        return;
      }

      // if user clicks an earlier day, treat it as new start
      if (clicked < startOfDay(selectedRange.from)) {
        onChange({ from: clicked, to: undefined });
        return;
      }

      // set to (checkout day is clicked day, exclusive)
      const from = startOfDay(selectedRange.from);
      const to = clicked;

      if (!isRangeAvailable(from, to)) {
        alert(
          "Some dates in that range are unavailable. Please choose different dates."
        );
        // Keep it simple: make clicked day the new start
        onChange({ from: clicked, to: undefined });
        return;
      }

      onChange({ from, to });
      return;
    }

    // range already selected -> start a new selection from clicked
    onChange({ from: clicked, to: undefined });
  };

  // ---------- day cell UI ----------
  const dayCellContent = (arg: any) => {
    const day: Date = arg.date;
    const price = priceForDate(day);

    // same idea as admin: html string
    return {
      html: `
        <div class="cust-dc">
          <div class="cust-dc-num">${arg.dayNumberText}</div>
          <div class="cust-dc-price">${price == null ? "" : `€${price}`}</div>
        </div>
      `,
    };
  };

  const dayCellClassNames = (arg: any) => {
    const day: Date = startOfDay(arg.date);
    const classes: string[] = [];

    const blocked = isBlockedDay(day);
    const open = isOpenDay(day);
    if (blocked || !open) classes.push("cust-closed");

    // selection highlighting
    const from = selectedRange?.from ? startOfDay(selectedRange.from) : null;
    const to = selectedRange?.to ? startOfDay(selectedRange.to) : null;

    if (from && isSameDay(day, from)) classes.push("cust-range-start");

    if (from && to) {
      if (day > from && day < to) classes.push("cust-range-mid");
      if (isSameDay(day, to)) classes.push("cust-range-end");
    }

    return classes;
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-200/70 bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-stone-900 truncate">
            {summaryText}
          </div>
          <div className="mt-0.5 text-xs text-stone-600">
            Sleeps{" "}
            <span className="font-semibold text-stone-800">{maxGuests}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs text-stone-600">Nightly price</div>
          <div className="text-base font-extrabold text-stone-900">
            €{summaryNightly}
          </div>
        </div>
      </div>

      <div className="cust-calendar">
        <FullCalendar
        ref={(el) => {
            // FullCalendar's ref type can be awkward; keep it simple & safe
            calendarRef.current = el as any;
          }}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          fixedWeekCount={false}
          showNonCurrentDates={true}
          dayMaxEventRows={0}
          events={[]} // customer calendar: no bars, only day cells
          eventDisplay="none"
          dateClick={onDateClick}
          dayCellContent={dayCellContent}
          dayCellClassNames={dayCellClassNames}
        />
      </div>

      <p className="mt-2 text-xs text-stone-500">
        Dates in gray are already booked.
      </p>

      <button
        type="button"
        onClick={handleBookClick}
        disabled={!selectedRange?.from || !selectedRange?.to}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold tracking-tight text-amber-950 shadow-md shadow-amber-900/10 hover:bg-amber-400 disabled:opacity-60 disabled:hover:bg-amber-500"
      >
        Book these dates
      </button>

      <style>{`
        /* --- Elegant customer calendar --- */
        .cust-calendar .fc {
          --fc-border-color: rgba(245, 158, 11, 0.24);
          --fc-page-bg-color: transparent;
          --fc-small-font-size: 0.7rem;
          color: rgb(87 83 78);
        }

        .cust-calendar .fc .fc-toolbar { margin-bottom: 6px; }
        .cust-calendar .fc .fc-toolbar-title {
          font-size: ${isMobile ? "13px" : "14px"};
          font-weight: 600;
          color: rgb(41 37 36);
        }

        .cust-calendar .fc .fc-button {
          border: 0;
          border-radius: 9999px;
          padding: 4px 8px;
          font-weight: 600;
          background: rgba(245, 158, 11, 0.16);
          color: rgb(120 53 15);
        }
        .cust-calendar .fc .fc-button:hover { background: rgba(245, 158, 11, 0.24); }

        .cust-calendar .fc .fc-col-header-cell-cushion {
          color: rgba(87, 83, 78, 0.75);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-size: 10px;
        }

        .cust-calendar .fc .fc-daygrid-day-frame {
          min-height: ${isMobile ? "52px" : "60px"};
          background: rgba(255, 255, 255, 0.65);
        }

        .cust-calendar .cust-dc {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 4px 6px 4px;
          line-height: 1;
        }

        .cust-calendar .cust-dc-num {
          font-weight: 600;
          font-size: ${isMobile ? "11px" : "12px"};
          color: rgb(68 64 60);
        }

        .cust-calendar .cust-dc-price {
          font-size: 9.5px;
          font-weight: 600;
          color: rgba(87, 83, 78, 0.75);
        }

        .cust-calendar .cust-closed { background: rgba(120, 113, 108, 0.12); }
        .cust-calendar .cust-closed .cust-dc-price { opacity: 0.35; }
        .cust-calendar .cust-closed .cust-dc-num {
          opacity: 0.55;
          text-decoration: line-through;
        }

        .cust-calendar .cust-range-start,
        .cust-calendar .cust-range-end { background: rgba(245, 158, 11, 0.36); }
        .cust-calendar .cust-range-mid { background: rgba(245, 158, 11, 0.20); }

        .cust-calendar .cust-range-start .cust-dc-num,
        .cust-calendar .cust-range-end .cust-dc-num {
          color: rgb(120 53 15);
          font-weight: 700;
        }

        .cust-calendar .cust-range-start {
          border-top-left-radius: 14px;
          border-bottom-left-radius: 14px;
        }
        .cust-calendar .cust-range-end {
          border-top-right-radius: 14px;
          border-bottom-right-radius: 14px;
        }

        .cust-calendar .fc .fc-daygrid-day-events { display: none; }
        .cust-calendar .fc .fc-scrollgrid {
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
