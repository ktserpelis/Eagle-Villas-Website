import { useEffect, useMemo, useState } from "react";
import {
  fetchAdditionalBedRequests,
  approveAdditionalBedRequest,
  rejectAdditionalBedRequest,
} from "../../api/additionalBedRequests.api";

type Req = any;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAdditionalBedRequests() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );

  // Action drawer state
  const [active, setActive] = useState<Req | null>(null);
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [chargeType, setChargeType] = useState<"charge" | "no_charge">(
    "no_charge"
  );
  const [amountCents, setAmountCents] = useState<string>("");
  const [adminMessage, setAdminMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAdditionalBedRequests(status);
      setRequests(res.data.additionalBedRequests ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openApprove = (r: Req) => {
    setActive(r);
    setMode("approve");
    setChargeType("no_charge");
    setAmountCents("");
    setAdminMessage("");
  };

  const openReject = (r: Req) => {
    setActive(r);
    setMode("reject");
    setChargeType("no_charge");
    setAmountCents("");
    setAdminMessage("");
  };

  const closeDrawer = () => {
    if (submitting) return;
    setActive(null);
  };

  const canSubmit = useMemo(() => {
    if (!active) return false;
    if (mode === "reject") return true;
    if (chargeType === "no_charge") return true;
    const cents = Number(amountCents);
    return Number.isFinite(cents) && cents > 0;
  }, [active, mode, chargeType, amountCents]);

  const submit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      if (mode === "reject") {
        await rejectAdditionalBedRequest(
          active.id,
          adminMessage.trim() || undefined
        );
      } else {
        // ✅ FIX: only include amountCents when chargeType === "charge"
        const payload =
          chargeType === "charge"
            ? {
                chargeType: "charge" as const,
                amountCents: Number(amountCents),
                adminMessage: adminMessage.trim() || undefined,
              }
            : {
                chargeType: "no_charge" as const,
                adminMessage: adminMessage.trim() || undefined,
              };

        await approveAdditionalBedRequest(active.id, payload);
      }

      closeDrawer();
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white shadow-sm">
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Additional Bed Requests
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Approve with manual charge/no charge, or reject with a message.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-700">Status</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "pending" | "approved" | "rejected")
            }
            className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-slate-700">
            Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-slate-700">
            No requests found.
          </div>
        ) : (
          <div className="grid gap-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Request #{r.id} • Booking #{r.bookingId ?? r.booking?.id}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Created: {r.createdAt ? formatDate(r.createdAt) : "—"}
                      {r.decidedAt ? ` • Decided: ${formatDate(r.decidedAt)}` : ""}
                    </p>

                    <div className="mt-3 space-y-1 text-sm text-slate-800">
                      <p>
                        <span className="font-semibold">User:</span>{" "}
                        {r.user?.email ?? "—"}
                      </p>
                      <p>
                        <span className="font-semibold">Beds requested:</span>{" "}
                        {r.bedsRequested}
                      </p>
                      {r.booking?.property?.title && (
                        <p>
                          <span className="font-semibold">Property:</span>{" "}
                          {r.booking.property.title}
                        </p>
                      )}
                      {r.customerMessage && (
                        <p className="text-slate-700">
                          <span className="font-semibold">Message:</span>{" "}
                          {r.customerMessage}
                        </p>
                      )}

                      {r.status !== "pending" && (
                        <p className="text-slate-700">
                          <span className="font-semibold">Decision:</span>{" "}
                          {r.chargeType ?? "—"}
                          {r.amountCents ? ` • ${r.amountCents} cents` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openReject(r)}
                        className="rounded-full px-4 py-2 text-sm font-semibold bg-white text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => openApprove(r)}
                        className="rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer / Modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {mode === "approve" ? "Approve request" : "Reject request"}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Request #{active.id} • Booking #{active.bookingId ?? active.booking?.id}
                </p>
              </div>

              <button
                onClick={closeDrawer}
                disabled={submitting}
                className="rounded-full px-3 py-1.5 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {mode === "approve" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Charge type
                    </label>
                    <select
                      value={chargeType}
                      onChange={(e) =>
                        setChargeType(e.target.value as "charge" | "no_charge")
                      }
                      className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm"
                      disabled={submitting}
                    >
                      <option value="no_charge">No charge</option>
                      <option value="charge">Charge (manual)</option>
                    </select>
                  </div>

                  {chargeType === "charge" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Amount (cents)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={amountCents}
                        onChange={(e) => setAmountCents(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm"
                        placeholder="e.g. 1500"
                        disabled={submitting}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Manual payment: customer pays offline. This only records the decision.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Admin message (optional)
                </label>
                <textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  placeholder={
                    mode === "approve"
                      ? "e.g. Pay at reception on arrival"
                      : "e.g. Not available for this room type"
                  }
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeDrawer}
                disabled={submitting}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={submit}
                disabled={submitting || !canSubmit}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60",
                  mode === "approve"
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-rose-700 hover:bg-rose-600"
                )}
              >
                {submitting
                  ? "Saving..."
                  : mode === "approve"
                  ? "Approve"
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </section>
  );
}
