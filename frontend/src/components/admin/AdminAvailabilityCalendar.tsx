import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useMemo, useState } from "react";

// If you already have types, keep them. Otherwise this is the shape expected:
type CalendarBlock = {
  source: "DIRECT" | "BOOKING_COM" | "MANUAL";
  id: number;
  startDate: string; // ISO
  endDate: string; // ISO (checkout exclusive)
  status?: string;
  guestsCount?: number;
  totalPrice?: number;

  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;

  summary?: string;
  reason?: string;
};

type BookingPeriod = {
  id: number;
  startDate: string; // ISO
  endDate: string; // ISO
  isOpen: boolean;
  standardNightlyPrice: number;

  // Booking.com-like weekly discount fields (bps)
  weeklyDiscountPercentBps?: number | null;
  weeklyThresholdNights: number;
  minNights: number;
  maxGuests: number;

  name?: string | null;
  notes?: string | null;
};

type Props = {
  blocks: CalendarBlock[] | undefined;
  periods: BookingPeriod[] | undefined;

  // ✅ add this: the property base price to show when no period covers the day
  fallbackNightlyPrice: number;
};

// ---------- helpers ----------
function dateInRange(day: Date, startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return day >= start && day < end; // checkout exclusive
}

function findPeriodForDay(periods: BookingPeriod[], day: Date) {
  return periods.find((p) => dateInRange(day, p.startDate, p.endDate));
}

export default function AdminAvailabilityCalendar({
  blocks,
  periods,
  fallbackNightlyPrice,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);

  const periodsSafe = periods ?? [];
  const blocksSafe = blocks ?? [];

  const selectedPeriod = useMemo(() => {
    if (!selectedDay) return null;
    return findPeriodForDay(periodsSafe, selectedDay) ?? null;
  }, [periodsSafe, selectedDay]);

  const selectedBlock = useMemo(() => {
    if (selectedBlockId == null) return null;
    return blocksSafe.find((b) => b.id === selectedBlockId) ?? null;
  }, [blocksSafe, selectedBlockId]);

  // Build FullCalendar "events" from blocks (these are your big booking lines)
  const events = useMemo(() => {
    return blocksSafe.map((b) => {
      const title =
        b.source === "DIRECT"
          ? b.guestName ?? "Direct booking"
          : b.source === "BOOKING_COM"
          ? b.summary ?? "Booking.com reservation"
          : b.reason ?? "Manual block";

      // FullCalendar expects end to be exclusive for allDay events -> perfect for your model
      return {
        id: `${b.source}-${b.id}`,
        title,
        start: b.startDate,
        end: b.endDate,
        allDay: true,
        extendedProps: b,
        classNames: [
          "ev",
          b.source === "DIRECT"
            ? "ev-direct"
            : b.source === "BOOKING_COM"
            ? "ev-bcom"
            : "ev-manual",
        ],
      };
    });
  }, [blocksSafe]);

  return (
    <div className="border rounded-lg p-5 bg-white">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ background: "#2563eb" }} />
          Site bookings
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ background: "#f97316" }} />
          Booking.com
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ background: "#6b7280" }} />
          Manual block
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ background: "#e5e7eb" }} />
          Closed (closed period)
        </span>
      </div>

      {/* Big Calendar */}
      <div className="admin-big-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          fixedWeekCount={false}
          showNonCurrentDates={true}
          dayMaxEventRows={3}
          events={events}
          eventDisplay="block"
          dateClick={(arg) => {
            setSelectedDay(arg.date);
            setSelectedBlockId(null);
          }}
          eventClick={(arg) => {
            const props = arg.event.extendedProps as CalendarBlock;
            setSelectedBlockId(props.id);
            setSelectedDay(new Date(arg.event.startStr));
          }}
          // Day cell: number + price under it
          dayCellContent={(arg) => {
            const day = arg.date;
            const p = findPeriodForDay(periodsSafe, day);

            // ✅ Updated behavior:
            // - If OPEN period: show period price
            // - If CLOSED period: show nothing (and mark closed)
            // - If NO period: show nothing (default CLOSED when no period)
            const priceText =
              p == null
                ? ""
                : p.isOpen
                ? `€${p.standardNightlyPrice}`
                : "";

            return {
              html: `
                <div class="dc">
                  <div class="dc-num">${arg.dayNumberText}</div>
                  <div class="dc-price">${priceText}</div>
                </div>
              `,
            };
          }}
          // Closed day styling:
          // ✅ CLOSED if there is NO period (default closed) OR period.isOpen=false
          dayCellClassNames={(arg) => {
            const p = findPeriodForDay(periodsSafe, arg.date);
            const isClosed = !p || !p.isOpen;
            return isClosed ? ["dc-closed"] : [];
          }}
        />
      </div>

      {/* Period summary below calendar (click a day) */}
      <div className="mt-5">
        <h4 className="text-lg font-bold mb-3 text-slate-900">
          {selectedDay ? `Selected: ${selectedDay.toDateString()}` : "Click a day to see period summary"}
        </h4>

        {!selectedDay && (
          <p className="text-base text-slate-500 font-medium">
            Click a day to see period pricing/rules. Click a booking line to see booking details.
          </p>
        )}

        {selectedDay && (
          <>
            {/* Period Summary */}
            <div className="mb-4 rounded-lg border p-4">
              <div className="text-sm font-bold text-slate-900">PERIOD</div>

              {selectedPeriod ? (
                <>
                  <div className="mt-1 text-base font-semibold">
                    {selectedPeriod.name ?? `Period #${selectedPeriod.id}`} ·{" "}
                    {selectedPeriod.isOpen ? "OPEN" : "CLOSED"}
                  </div>

                  <div className="mt-1 text-sm text-slate-600 font-medium">
                    {selectedPeriod.startDate.slice(0, 10)} → {selectedPeriod.endDate.slice(0, 10)}
                  </div>

                  <div className="mt-2 text-sm text-slate-700">
                    <div>
                      Nightly: <span className="font-semibold">€{selectedPeriod.standardNightlyPrice}</span>
                    </div>
                    <div>
                      Min nights (arrival): <span className="font-semibold">{selectedPeriod.minNights}</span>
                    </div>
                    <div>
                      Max guests: <span className="font-semibold">{selectedPeriod.maxGuests}</span>
                    </div>
                    <div>
                      Weekly discount:{" "}
                      <span className="font-semibold">
                        {selectedPeriod.weeklyDiscountPercentBps
                          ? `${(selectedPeriod.weeklyDiscountPercentBps / 100).toFixed(2)}% (≥ ${selectedPeriod.weeklyThresholdNights} nights)`
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {selectedPeriod.notes ? (
                    <div className="mt-2 text-sm text-slate-600">{selectedPeriod.notes}</div>
                  ) : null}
                </>
              ) : (
                <div className="mt-1 text-base font-semibold text-slate-700">
                  No period covers this day → Nightly:{" "}
                  <span className="font-semibold">€{fallbackNightlyPrice}</span>
                </div>
              )}
            </div>

            {/* Booking details if a line is clicked */}
            {selectedBlock ? (
              <div className="rounded-lg border p-4">
                <div className="text-sm font-bold text-slate-900">BOOKING / BLOCK</div>

                <div className="mt-1 text-base font-semibold">
                  {selectedBlock.source} · {selectedBlock.startDate.slice(0, 10)} →{" "}
                  {selectedBlock.endDate.slice(0, 10)}
                </div>

                {selectedBlock.source === "DIRECT" ? (
                  <>
                    <div className="mt-1 text-sm text-slate-700">
                      Guest: <span className="font-semibold">{selectedBlock.guestName}</span> ·{" "}
                      <span className="font-semibold">{selectedBlock.guestsCount}</span> guests
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {selectedBlock.guestEmail} · {selectedBlock.guestPhone}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Status: <span className="font-semibold">{selectedBlock.status}</span> · Total:{" "}
                      <span className="font-semibold">€{selectedBlock.totalPrice}</span>
                    </div>
                  </>
                ) : selectedBlock.source === "BOOKING_COM" ? (
                  <div className="mt-1 text-sm text-slate-700">
                    Summary: <span className="font-semibold">{selectedBlock.summary ?? "Reserved"}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-slate-700">
                    Reason: <span className="font-semibold">{selectedBlock.reason ?? "Blocked"}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-base text-slate-500 font-medium">
                Tip: click a booking line to view booking info.
              </p>
            )}
          </>
        )}
      </div>

      {/* Minimal CSS to achieve your visuals */}
      <style>{`
        /* Make the calendar big */
        .admin-big-calendar .fc .fc-scrollgrid,
        .admin-big-calendar .fc .fc-scrollgrid table {
          width: 100%;
        }

        .admin-big-calendar .fc .fc-daygrid-day-frame {
          min-height: 110px; /* bigger cells */
        }

        /* Day cell content layout */
        .admin-big-calendar .dc {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px 6px 0 6px;
        }
        .admin-big-calendar .dc-num {
          font-weight: 700;
          font-size: 14px;
        }
        .admin-big-calendar .dc-price {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          opacity: 0.85;
        }

        /* Closed day background (ONLY closed period now) */
        .admin-big-calendar .dc-closed {
          background: #f3f4f6; /* stone/gray */
        }
        .admin-big-calendar .dc-closed .dc-price {
          opacity: 0.4;
        }

        /* Event bars (your "big line through") */
        .admin-big-calendar .fc .ev {
          border: 0;
          border-radius: 8px;
          padding: 6px 8px;
          font-weight: 800;
          font-size: 12px;
          line-height: 1.1;
          cursor: pointer;
        }

        /* ✅ DIRECT bookings → GOLD */
        .admin-big-calendar .fc .ev-direct {
          background: linear-gradient(135deg, #facc15, #eab308);
          color: #1c1917;
        }

        /* ✅ BOOKING.COM → BLUE */
        .admin-big-calendar .fc .ev-bcom {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
        }

        /* ✅ MANUAL blocks → RED */
        .admin-big-calendar .fc .ev-manual {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
        }

        /* Colors by source */
        .admin-big-calendar .fc .ev-direct {
          background: #2563eb;
          color: white;
        }
        .admin-big-calendar .fc .ev-bcom {
          background: #f97316;
          color: white;
        }
        .admin-big-calendar .fc .ev-manual {
          background: #6b7280;
          color: white;
        }

        /* Make the bar look like a "line" */
        .admin-big-calendar .fc .fc-daygrid-event-harness {
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
