import { useMemo, useState } from "react";
import { useAdminVouchersQuery, type AdminVoucher } from "../../api/vouchers";

/**
 * AdminVouchersSection
 *
 * Admin auditing UI for voucher allocation:
 * - shows vouchers issued by cancellations
 * - shows remaining balance and status
 * - helps support staff resolve disputes
 */
export default function AdminVouchersSection() {
  const { data, isLoading, error, refetch } = useAdminVouchersQuery();
  const [filter, setFilter] = useState<"all" | "active" | "used" | "expired" | "void" | "exhausted" | "revoked">(
    "all"
  );

  const vouchers = data?.vouchers ?? [];

  const filtered = useMemo(() => {
    if (filter === "all") return vouchers;
    return vouchers.filter((v) => v.status === filter);
  }, [vouchers, filter]);

  const totals = useMemo(() => {
    const issued = filtered.reduce((sum, v) => sum + v.issuedCents, 0);
    const remaining = filtered.reduce((sum, v) => sum + v.remainingCents, 0);
    return { count: filtered.length, issued, remaining };
  }, [filtered]);

  function euros(cents: number) {
    return `€${(cents / 100).toFixed(2)}`;
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Voucher allocation</h2>
          <p className="text-sm text-slate-500">
            Track voucher credit issued during cancellations (typically &lt;15 days before check-in).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="exhausted">Exhausted</option>
            <option value="expired">Expired</option>
            <option value="void">Void</option>
            <option value="revoked">Revoked</option>
          </select>

          <button
            onClick={() => refetch()}
            className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Vouchers: {totals.count}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Issued: {euros(totals.issued)}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Remaining: {euros(totals.remaining)}
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {(error as any)?.message ?? "Failed to load vouchers"}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500">No vouchers found.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">Voucher</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Original booking</th>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: AdminVoucher) => (
                <tr key={v.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-semibold text-slate-900">#{v.id}</td>

                  <td className="px-3 py-2">
                    <div className="text-slate-900 font-medium">{v.user?.name ?? "—"}</div>
                    <div className="text-slate-500 text-xs">{v.user?.email ?? "—"}</div>
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    {v.originalBookingId ? `#${v.originalBookingId}` : "—"}
                  </td>

                  <td className="px-3 py-2 font-semibold text-slate-900">{euros(v.issuedCents)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{euros(v.remainingCents)}</td>

                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {v.status}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-slate-600">
                    {new Date(v.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
