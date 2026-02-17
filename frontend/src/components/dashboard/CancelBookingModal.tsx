// src/components/dashboard/CancelBookingModal.tsx
import { useMemo, useState, useEffect } from "react";
import {
  useCancelBooking,
  useCancelBookingPreview,
  useRefundRequestPreview,
  useRequestRefund,
} from "../../api/payments";
import { createPortal } from "react-dom";


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

  const closeAndReset = () => {
    setStep("edit");
    setReason("");
    setRequestFullRefund(false);
    setCancelPreview(null);
    setRefundPreview(null);
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  if (!open) return null;

  const continueToConfirm = () => {
    const actionIsAdminRequest = requestFullRefund;

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

  const confirmAndSubmit = () => {
    const bodyReason = reason || undefined;

    if (requestFullRefund) {
      refundReq.mutate(
        { bookingId, reason: bodyReason },
        {
          onSuccess: () => {
            onCancelled();
            closeAndReset();
          },
        }
      );
      return;
    }

    cancel.mutate(
      { bookingId, reason: bodyReason },
      {
        onSuccess: () => {
          onCancelled();
          closeAndReset();
        },
      }
    );
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isPending ? undefined : closeAndReset}
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-xl overflow-hidden">
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
                </div>
              </div>
            </div>
          )}

          {cancelData && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-emerald-800 font-semibold">Cancellation submitted</p>
            </div>
          )}

          {refundData && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-emerald-800 font-semibold">Refund request submitted</p>
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
              ? "Continue"
              : requestFullRefund
              ? "Confirm refund request"
              : "Confirm cancellation"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
