import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { requestAdditionalBed } from "../../api/additionalBedRequests.api";

export function RequestAdditionalBedModal({
  open,
  onClose,
  bookingId,
  onRequested,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: number;
  onRequested: () => void;
}) {
  const [bedsRequested, setBedsRequested] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function submit() {
    try {
      setLoading(true);
      await requestAdditionalBed(bookingId, {
        bedsRequested,
        message: message.trim() || undefined,
      });
      onRequested();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">
          Request additional bed
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          Send a request to the admin. They will approve or reject it.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Beds requested
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={bedsRequested}
              onChange={(e) => setBedsRequested(Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-60"
          >
            Submit request
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
