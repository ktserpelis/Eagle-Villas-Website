// src/components/dashboard/CancelBookingModal.tsx
import { useMemo, useState } from "react";
import {
  useCancelBooking,
  useCancelBookingPreview,
  useRefundRequestPreview,
  useRequestRefund,
} from "../../api/payments";

/**
 * Two-step modal for booking cancellation & special refund requests.
 *
 * Design goals:
 * - "Cancel booking" and "Admin refund request" are TWO different actions
 * - Always show a confirmation step with computed amounts before committing
 * - Backend remains the source of truth for amounts and policy tier selection
 */
export function CancelBookingModal({
  open,
  onClose,
  bookingId,
  onCancelled,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: number;
  onCancelled: () => void;
}) {
  type Step = "edit" | "confirm";

  const [step, setStep] = useState<Step>("edit");
  const [reason, setReason] = useState("");
  const [requestFullRefund, setRequestFullRefund] = useState(false);

  // Preview data (computed by backend)
  const [cancelPreview, setCancelPreview] = useState<null | {
    currency: string;
    policy: {
      daysBefore: number;
      label: string;
      description: string;
      refundBps: number;
      voucherBps: number;
    };
    outcome: {
      refundType: "stripe_refund" | "voucher" | "none";
      stripeRefundCents: number;
      voucherCents: number;
    };
  }>(null);

  const [refundPreview, setRefundPreview] = useState<null | {
    currency: string;
    amount: {
      bookingTotalCents: number;
      refundableRemainingCents: number;
      requestedRefundCents: number;
    };
  }>(null);

  const cancel = useCancelBooking();
  const refundReq = useRequestRefund();

  const cancelPrev = useCancelBookingPreview();
  const refundPrev = useRefundRequestPreview();

  const isPending =
    cancel.isPending || refundReq.isPending || cancelPrev.isPending || refundPrev.isPending;

  const error = cancel.error ?? refundReq.error ?? cancelPrev.error ?? refundPrev.error;
  const isError = cancel.isError || refundReq.isError || cancelPrev.isError || refundPrev.isError;

  const cancelData = cancel.data;
  const refundData = refundReq.data;

  const message = useMemo(() => {
    if (!isError) return null;
    return (error as any)?.response?.data?.message ?? (error as any)?.message ?? "Failed";
  }, [isError, error]);

  const formatEuros = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  /**
   * Reset all modal state when closing.
   * This avoids stale preview data between different bookings.
   */
  const closeAndReset = () => {
    setStep("edit");
    setReason("");
    setRequestFullRefund(false);
    setCancelPreview(null);
    setRefundPreview(null);
    onClose();
  };

  if (!open) return null;

  /**
   * Step 1 -> Step 2:
   * Fetch a backend preview so the user can confirm amounts + policy tier.
   */
  const continueToConfirm = () => {
    const actionIsAdminRequest = requestFullRefund;

    // Clear any previous preview from the other flow
    setCancelPreview(null);
    setRefundPreview(null);

    if (actionIsAdminRequest) {
      refundPrev.mutate(bookingId, {
        onSuccess: (data) => {
          setRefundPreview({
            currency: data.currency,
            amount: data.amount,
          });
          setStep("confirm");
        },
      });
      return;
    }

    cancelPrev.mutate(bookingId, {
      onSuccess: (data) => {
        setCancelPreview({
          currency: data.currency,
          policy: data.policy,
          outcome: data.outcome,
        });
        setStep("confirm");
      },
    });
  };

  /**
   * Final submit (after user confirmed preview step).
   * - If requestFullRefund: create a pending request for admin review (no cancellation)
   * - Otherwise: cancel immediately and trigger automatic refund/voucher per policy
   */
  const confirmAndSubmit = () => {
    const bodyReason = reason || undefined;

    // ✅ Admin refund request (does not cancel)
    if (requestFullRefund) {
      refundReq.mutate(
        { bookingId, reason: bodyReason },
        {
          onSuccess: () => {
            onCancelled(); // refresh dashboard state
            closeAndReset();
          },
        }
      );
      return;
    }

    // ✅ Cancellation (policy-driven refund/voucher)
    cancel.mutate(
      { bookingId, reason: bodyReason },
      {
        onSuccess: () => {
          onCancelled(); // refresh dashboard state
          closeAndReset();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isPending ? undefined : closeAndReset}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <p className="text-slate-900 font-semibold text-lg">
              {requestFullRefund ? `Refund request for booking #${bookingId}` : `Cancel booking #${bookingId}`}
            </p>

            <p className="text-slate-600 text-sm mt-1">
              {requestFullRefund
                ? "This sends a special request to admin. The booking is not cancelled automatically."
                : "Refunds and voucher credit are calculated automatically based on your cancellation policy."}
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* =========================
                Step 1: Edit
               ========================= */}
            {step === "edit" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Reason (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                    placeholder="Tell us why you are cancelling/requesting a refund (optional)"
                  />
                </div>

                {/* Action selector (kept as checkbox to match your current UI) */}
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={requestFullRefund}
                    onChange={(e) => setRequestFullRefund(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Request full refund approval from admin
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      This is a special request. If approved, the admin can refund 100% even outside policy rules.
                    </p>
                  </div>
                </label>
              </>
            )}

            {/* =========================
                Step 2: Confirm (Preview)
               ========================= */}
            {step === "confirm" && !requestFullRefund && cancelPreview && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-900 font-semibold text-sm">
                    Refund preview (calculated from cancellation policy)
                  </p>
                  <p className="text-slate-700 text-sm mt-2">
                    Policy tier: <span className="font-semibold">{cancelPreview.policy.label}</span>
                  </p>
                  <p className="text-slate-600 text-xs mt-1">
                    {cancelPreview.policy.description}
                  </p>

                  <div className="mt-3 text-sm text-slate-800">
                    <p>
                      Cash refund:{" "}
                      <span className="font-semibold">
                        {formatEuros(cancelPreview.outcome.stripeRefundCents)}
                      </span>
                    </p>
                    <p className="mt-1">
                      Voucher credit:{" "}
                      <span className="font-semibold">
                        {formatEuros(cancelPreview.outcome.voucherCents)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-amber-900 font-semibold text-sm">What happens next</p>
                  <p className="text-amber-900/80 text-sm mt-1">
                    If you confirm, the booking will be cancelled immediately.
                    {cancelPreview.outcome.stripeRefundCents > 0
                      ? " Your money will be refunded automatically to the original payment method."
                      : " No cash refund will be issued based on your policy tier."}
                    {cancelPreview.outcome.voucherCents > 0
                      ? " Voucher credit will be added to your account for future bookings."
                      : ""}
                  </p>
                </div>
              </div>
            )}

            {step === "confirm" && requestFullRefund && refundPreview && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-900 font-semibold text-sm">
                    Admin refund request preview
                  </p>

                  <div className="mt-3 text-sm text-slate-800">
                    <p>
                      Requested refund amount:{" "}
                      <span className="font-semibold">
                        {formatEuros(refundPreview.amount.requestedRefundCents)}
                      </span>
                    </p>

                    {/* This is returned so the UI can be accurate if partial refunds happened previously */}
                    {refundPreview.amount.refundableRemainingCents !==
                      refundPreview.amount.requestedRefundCents && (
                      <p className="text-slate-600 text-xs mt-2">
                        Note: The remaining refundable Stripe amount is{" "}
                        {formatEuros(refundPreview.amount.refundableRemainingCents)}.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-amber-900 font-semibold text-sm">What happens next</p>
                  <p className="text-amber-900/80 text-sm mt-1">
                    If you confirm, we will notify the admin that you are requesting a full refund for this booking.
                    This does not cancel the booking automatically. The admin will review and decide.
                  </p>
                </div>
              </div>
            )}

            {/* ✅ Success UI: cancellation */}
            {cancelData && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-emerald-800 font-semibold">Cancellation submitted</p>
                <p className="text-emerald-800/80 text-sm mt-1">
                  Refund type: {cancelData.refund.refundType} · Refunded:{" "}
                  {formatEuros(cancelData.refund.refundedCents)} · Voucher:{" "}
                  {formatEuros(cancelData.refund.voucherCents)}
                </p>
              </div>
            )}

            {/* ✅ Success UI: refund request */}
            {refundData && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-emerald-800 font-semibold">Refund request submitted</p>
                <p className="text-emerald-800/80 text-sm mt-1">
                  {refundData.message ?? "Your request was sent to admin for review."}
                </p>
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-rose-700 font-semibold">
                  {requestFullRefund ? "Refund request failed" : "Cancellation failed"}
                </p>
                <p className="text-rose-700/80 text-sm mt-1">{message}</p>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              onClick={closeAndReset}
              disabled={isPending}
              className="rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition disabled:opacity-70"
            >
              Close
            </button>

            {/* Back button only in confirm step */}
            {step === "confirm" && (
              <button
                onClick={() => setStep("edit")}
                disabled={isPending}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition disabled:opacity-70"
              >
                Back
              </button>
            )}

            <button
              onClick={step === "edit" ? continueToConfirm : confirmAndSubmit}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-amber-950 shadow-md shadow-amber-900/15 hover:bg-amber-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isPending
                ? step === "edit"
                  ? "Loading..."
                  : requestFullRefund
                  ? "Requesting..."
                  : "Cancelling..."
                : step === "edit"
                ? requestFullRefund
                  ? "Continue"
                  : "Continue"
                : requestFullRefund
                ? "Confirm refund request"
                : "Confirm cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
