// src/pages/UserDashboard.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCustomerBookingsQuery } from "../api/booking";
import type { BookingWithProperty } from "../api/types";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import {
  DashboardHeader,
  AMBER_BTN,
} from "../components/dashboard/DashboardHeader";
import { BookingCard } from "../components/dashboard/BookingCard";
import { VouchersCard } from "../components/dashboard/VouchersCard";

/**
 * Booking tabs available in the dashboard.
 */
type TabKey = "upcoming" | "past" | "cancelled";

/**
 * Utility helper for conditional Tailwind class names.
 */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Pill-style tab button used to switch booking views.
 */
function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-2 text-xs sm:text-sm font-semibold ring-1 ring-inset transition whitespace-nowrap",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-700 ring-stone-200 hover:bg-stone-50"
      )}
    >
      {label}
    </button>
  );
}

/**
 * Small statistic card used in the summary panel.
 */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-slate-500 text-xs uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

/**
 * Skeleton loader shown while bookings are loading.
 */
function BookingSkeleton() {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden">
      <div className="grid sm:grid-cols-[140px_1fr]">
        <div className="h-32 sm:h-[140px] bg-stone-100 animate-pulse" />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="h-4 w-40 bg-stone-100 animate-pulse rounded" />
          <div className="h-3 w-28 bg-stone-100 animate-pulse rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="h-12 bg-stone-100 animate-pulse rounded-2xl" />
            <div className="h-12 bg-stone-100 animate-pulse rounded-2xl" />
            <div className="h-12 bg-stone-100 animate-pulse rounded-2xl" />
            <div className="h-12 bg-stone-100 animate-pulse rounded-2xl" />
          </div>
          <div className="h-10 bg-stone-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state displayed when a tab has no bookings.
 */
function EmptyState({ tab }: { tab: TabKey }) {
  const title =
    tab === "upcoming"
      ? "No upcoming bookings"
      : tab === "past"
      ? "No past bookings"
      : "No cancelled bookings";

  const description =
    tab === "upcoming"
      ? "Browse villas and lock in your next stay."
      : tab === "past"
      ? "Once you complete a stay, it will appear here."
      : "Cancelled bookings will appear here.";

  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 text-center">
      <p className="text-slate-900 font-semibold">{title}</p>
      <p className="text-slate-600 text-sm mt-1">{description}</p>
      <Link to="/villas" className={cn(AMBER_BTN, "mt-4")}>
        View villas
      </Link>
    </div>
  );
}

/**
 * UserDashboard
 *
 * Displays customer bookings, vouchers, and summary statistics.
 * Top padding is applied to prevent overlap with a fixed / sticky navbar.
 */
const UserDashboard: React.FC = () => {
  const { user } = useAuth();

  /**
   * Fetch bookings only when the user is authenticated.
   */
  const { data, isLoading, isError, error, refetch } =
    useCustomerBookingsQuery(!!user);

  const bookings: BookingWithProperty[] = data?.bookings ?? [];
  const [tab, setTab] = useState<TabKey>("upcoming");
  const now = Date.now();

  /**
   * Group bookings for display purposes.
   * Backend remains the source of truth for booking status.
   */
  const { upcoming, past, cancelled } = useMemo(() => {
    const upcoming: BookingWithProperty[] = [];
    const past: BookingWithProperty[] = [];
    const cancelled: BookingWithProperty[] = [];

    for (const booking of bookings) {
      const status = (booking.status || "").toLowerCase();
      const endDate = new Date(booking.endDate).getTime();
      const isPast = endDate < now;

      if (status === "cancelled" || status === "rejected") {
        cancelled.push(booking);
      } else if (isPast) {
        past.push(booking);
      } else {
        upcoming.push(booking);
      }
    }

    upcoming.sort(
      (a, b) => +new Date(a.startDate) - +new Date(b.startDate)
    );
    past.sort(
      (a, b) => +new Date(b.startDate) - +new Date(a.startDate)
    );
    cancelled.sort(
      (a, b) => +new Date(b.startDate) - +new Date(a.startDate)
    );

    return { upcoming, past, cancelled };
  }, [bookings, now]);

  const activeBookings =
    tab === "upcoming"
      ? upcoming
      : tab === "past"
      ? past
      : cancelled;

  /**
   * Summary statistics for the right column.
   */
  const totals = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(
      (b) => (b.status || "").toLowerCase() === "confirmed"
    ).length;
    const pending = bookings.filter(
      (b) => (b.status || "").toLowerCase() === "pending"
    ).length;

    return { total, confirmed, pending };
  }, [bookings]);

  const userLabel = user?.name || user?.email || "your account";

  return (
    <DashboardShell>
      {/* Prevent content from sitting under the navbar */}
      <div className="pt-20 sm:pt-24">
        <DashboardHeader userLabel={userLabel} onRefresh={refetch} />

        <div className="grid gap-6 lg:gap-8 xl:gap-10 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] items-start">
          {/* LEFT COLUMN — BOOKINGS */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md shadow-[0_18px_55px_rgba(0,0,0,0.10)] overflow-hidden">
              <div className="px-5 sm:px-6 py-5 border-b border-stone-200/70">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-slate-900 font-semibold">Bookings</p>
                    <p className="text-slate-600 text-sm">
                      Upcoming stays, previous visits, and cancellations.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">
                    <TabButton
                      active={tab === "upcoming"}
                      onClick={() => setTab("upcoming")}
                      label={`Upcoming (${upcoming.length})`}
                    />
                    <TabButton
                      active={tab === "past"}
                      onClick={() => setTab("past")}
                      label={`Past (${past.length})`}
                    />
                    <TabButton
                      active={tab === "cancelled"}
                      onClick={() => setTab("cancelled")}
                      label={`Cancelled (${cancelled.length})`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <BookingSkeleton />
                    <BookingSkeleton />
                    <BookingSkeleton />
                  </div>
                ) : isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <p className="text-rose-700 font-semibold">
                      Failed to load bookings
                    </p>
                    <p className="text-rose-700/80 text-sm mt-1">
                      {(error as any)?.message ?? "Unknown error"}
                    </p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                    <p className="text-slate-900 font-semibold">
                      No bookings linked to your account.
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      You may have booked as a guest, or you haven&apos;t booked
                      anything yet.
                    </p>
                    <Link to="/villas" className={cn(AMBER_BTN, "mt-4")}>
                      View villas
                    </Link>
                  </div>
                ) : activeBookings.length === 0 ? (
                  <EmptyState tab={tab} />
                ) : (
                  <div className="space-y-4">
                    {activeBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        /**
                         * Trigger a refresh when a booking is cancelled
                         * or otherwise modified.
                         */
                        onChanged={() => refetch()}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Help / Support card */}
            <div className="rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md px-5 sm:px-6 py-5 shadow-[0_14px_45px_rgba(0,0,0,0.08)]">
              <p className="text-slate-900 font-semibold">Need help?</p>
              <p className="text-slate-600 text-sm mt-1">
                For date changes or special requests, contact us and we’ll help
                personally.
              </p>
              <Link to="/contact" className={cn(AMBER_BTN, "mt-4")}>
                Contact Eagle Villas
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN — SUMMARY + VOUCHERS */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md shadow-[0_18px_55px_rgba(0,0,0,0.10)] overflow-hidden">
              <div className="px-5 sm:px-6 py-5 border-b border-stone-200/70">
                <p className="text-slate-900 font-semibold">Summary</p>
                <p className="text-slate-600 text-sm mt-1">
                  Quick snapshot of your reservations.
                </p>
              </div>

              <div className="p-4 sm:p-6 grid gap-4">
                <StatCard label="Total bookings" value={totals.total} />
                <StatCard label="Confirmed" value={totals.confirmed} />
                <StatCard label="Pending" value={totals.pending} />
              </div>
            </div>

            <VouchersCard enabled={!!user} />

            <div className="rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md shadow-[0_14px_45px_rgba(0,0,0,0.08)] p-5 sm:p-6">
              <p className="text-slate-900 font-semibold">
                Ready for your next escape?
              </p>
              <p className="text-slate-600 text-sm mt-1">
                Explore availability and book in minutes.
              </p>
              <Link to="/villas" className={cn(AMBER_BTN, "mt-4")}>
                View all villas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default UserDashboard;
