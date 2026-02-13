// src/components/dashboard/DashboardHeader.tsx
import { Link } from "react-router-dom";

/**
 * Reusing your exact button styles so the dashboard remains consistent.
 */
export const AMBER_BTN =
  "inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2 text-base sm:text-lg font-semibold text-amber-950 shadow-md shadow-amber-900/15 hover:bg-amber-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors";

export const SECONDARY_BTN =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition";

export function DashboardHeader({
  userLabel,
  onRefresh,
}: {
  userLabel: string;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-8 text-left md:text-left">
      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/95">
        Your account
      </p>
      <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-amber-50">
        My Bookings
      </h1>

      <p className="mt-3 text-sm sm:text-base text-amber-50/90 max-w-2xl">
        Logged in as{" "}
        <span className="font-semibold text-amber-50">{userLabel}</span>. Only
        bookings made while logged in will show here.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-2">
        <button onClick={onRefresh} className={SECONDARY_BTN}>
          Refresh
        </button>
        <Link to="/villas" className={AMBER_BTN}>
          Browse villas
        </Link>
      </div>
    </div>
  );
}
