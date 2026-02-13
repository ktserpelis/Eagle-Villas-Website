import { useMemo, useState } from "react";
import {
  useAdminApproveRefundRequest,
  useAdminRejectRefundRequest,
  useAdminRefundRequestsQuery,
  type AdminRefundRequest,
} from "../../api/payments";

/**
 * AdminRefundRequestsSection
 *
 * Admin tooling for:
 * - reviewing customer refund requests
 * - approving (Stripe refund remaining amount)
 * - rejecting (no refund)
 *
 * Notes:
 * - Approve refunds ONLY the remaining refundable Stripe amount.
 * - Requests are immutable after decision (approved/rejected).
 */
/**
 * AdminRefundRequestsSection
 *
 * Admin tooling for:
 * - reviewing customer refund requests
 * - approving (Stripe refund remaining amount)
 * - rejecting (no refund)
 *
 * Notes:
 * - Approve refunds ONLY the remaining refundable Stripe amount.
 * - Requests are immutable after decision (approved/rejected).
 */
export default function AdminRefundRequestsSection() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );

  const { data, isLoading, error, refetch } = useAdminRefundRequestsQuery(status);
  const approve = useAdminApproveRefundRequest();
  const reject = useAdminRejectRefundRequest();

  const busy = approve.isPending || reject.isPending;

  const rows = data?.refundRequests ?? [];

  const totals = useMemo(() => {
    const count = rows.length;
    const remaining = rows.reduce(
      (sum, r) => sum + (r.computed?.refundableRemainingCents ?? 0),
      0
    );
    return { count, remaining };
  }, [rows]);

  function euros(cents: number) {
    return `€${(cents / 100).toFixed(2)}`;
  }

  // ✅ ADDED: local non-blocking confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"approve" | "reject">("approve");
  const [active, setActive] = useState<AdminRefundRequest | null>(null);

  function openApproveConfirm(r: AdminRefundRequest) {
    setActive(r);
    setConfirmMode("approve");
    setConfirmOpen(true);
  }

  function openRejectConfirm(r: AdminRefundRequest) {
    setActive(r);
    setConfirmMode("reject");
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (busy) return;
    setConfirmOpen(false);
    setActive(null);
  }

  async function onConfirm() {
    if (!active) return;

    if (confirmMode === "approve") {
      await approve.mutateAsync(active.id);
    } else {
      await reject.mutateAsync(active.id);
    }

    closeConfirm();
    await refetch();
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Refund requests</h2>
          <p className="text-sm text-slate-500">
            Review customer requests for full refunds. Approvals refund the remaining Stripe amount.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={busy}
            className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Requests: {totals.count}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Total remaining refundable: {euros(totals.remaining)}
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {(error as any)?.message ?? "Failed to load refund requests"}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">No requests found.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">Request</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Booking</th>
                <th className="px-3 py-2">Stripe</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2 w-[220px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = r.booking?.payment;
                const remaining = r.computed?.refundableRemainingCents ?? 0;

                return (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-semibold text-slate-900">#{r.id}</td>

                    <td className="px-3 py-2">
                      <div className="text-slate-900 font-medium">{r.user?.name ?? "—"}</div>
                      <div className="text-slate-500 text-xs">{r.user?.email}</div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="text-slate-900 font-medium">
                        #{r.bookingId} · {r.booking?.property?.title ?? "Property"}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {r.booking?.status} · total €{r.booking?.totalPrice ?? 0}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      {p?.provider === "stripe" ? (
                        <div>
                          <div className="text-slate-900 font-medium">{p.status}</div>
                          <div className="text-slate-500 text-xs">
                            paid {euros(p.amountCents)} · refunded {euros(p.refundedCents)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {euros(remaining)}
                    </td>

                    <td className="px-3 py-2">
                      <span className="text-slate-700">{r.message ?? "—"}</span>
                    </td>

                    <td className="px-3 py-2">
                      {r.status !== "pending" ? (
                        <span className="text-slate-500">
                          {r.status}{" "}
                          {r.decidedAt
                            ? `· ${new Date(r.decidedAt).toLocaleString()}`
                            : ""}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openApproveConfirm(r)} // ✅ CHANGED
                            disabled={busy || remaining <= 0 || p?.provider !== "stripe"}
                            className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                            title={
                              remaining <= 0
                                ? "Nothing refundable remaining"
                                : p?.provider !== "stripe"
                                ? "No Stripe payment"
                                : "Approve and refund"
                            }
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => openRejectConfirm(r)} // ✅ CHANGED
                            disabled={busy}
                            className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ ADDED: non-blocking confirmation modal (replaces window.confirm) */}
      {confirmOpen && active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {confirmMode === "approve" ? "Approve refund request" : "Reject refund request"}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Request #{active.id} • Booking #{active.bookingId}
                </p>
              </div>

              <button
                onClick={closeConfirm}
                disabled={busy}
                className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
              >
                Close
              </button>
            </div>

            {confirmMode === "approve" ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                This will refund the remaining Stripe amount:{" "}
                <span className="font-semibold">
                  {euros(active.computed.refundableRemainingCents)}
                </span>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                This will reject the request (no refund).
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeConfirm}
                disabled={busy}
                className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={onConfirm}
                disabled={busy}
                className={
                  confirmMode === "approve"
                    ? "h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    : "h-9 rounded-lg bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                }
              >
                {busy ? "Working..." : confirmMode === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}