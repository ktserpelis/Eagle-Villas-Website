// src/components/dashboard/VouchersCard.tsx
import { useMemo } from "react";
import { useCustomerVouchersQuery } from "../../api/vouchers.ts";
import { AMBER_BTN } from "./DashboardHeader";
import { Link } from "react-router-dom";

/**
 * Customer voucher UI:
 * - Displays active/used vouchers (depending on backend filtering)
 * - Shows remaining credit which can be applied to future bookings
 */
export function VouchersCard({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError, error, refetch } =
    useCustomerVouchersQuery(enabled);

  const vouchers = data?.vouchers ?? [];

  const totals = useMemo(() => {
    const active = vouchers.filter((v) => v.status === "active");
    const remainingCents = active.reduce((acc, v) => acc + v.remainingCents, 0);
    return { activeCount: active.length, remainingCents };
  }, [vouchers]);

  return (
    <div className="rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur-md shadow-[0_18px_55px_rgba(0,0,0,0.10)] overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-stone-200/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-slate-900 font-semibold">Vouchers</p>
            <p className="text-slate-600 text-sm mt-1">
              Credit you can use towards future bookings.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-full px-3 py-2 text-xs font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary row */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-slate-500 text-xs uppercase tracking-[0.18em]">
            Active vouchers
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totals.activeCount}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Remaining credit:{" "}
            <span className="font-semibold text-slate-900">
              €{(totals.remainingCents / 100).toFixed(2)}
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm text-slate-600">Loading vouchers...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-rose-700 font-semibold">Failed to load vouchers</p>
            <p className="text-rose-700/80 text-sm mt-1">
              {(error as any)?.message ?? "Unknown error"}
            </p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-slate-900 font-semibold">No vouchers yet.</p>
            <p className="text-slate-600 text-sm mt-1">
              If you cancel a booking close to arrival, you may receive credit.
            </p>
            <Link to="/villas" className={`${AMBER_BTN} mt-3`}>
              View villas
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vouchers.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-slate-900 font-semibold">
                      Voucher #{v.id}
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      Remaining:{" "}
                      <span className="font-semibold text-slate-900">
                        €{(v.remainingCents / 100).toFixed(2)}
                      </span>{" "}
                      / Issued: €{(v.issuedCents / 100).toFixed(2)}
                    </p>
                    {v.originalBookingId && (
                      <p className="text-xs text-slate-500 mt-1">
                        From booking #{v.originalBookingId}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-stone-50 text-slate-700 ring-1 ring-inset ring-stone-200">
                    {v.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-2">
                  Issued: {new Date(v.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          Vouchers can be applied at checkout when voucher redemption is enabled.
        </p>
      </div>
    </div>
  );
}
