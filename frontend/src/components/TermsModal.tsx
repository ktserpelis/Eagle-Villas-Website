import { useEffect } from "react";

export function TermsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/55 p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close terms"
        onClick={onClose}
        className="absolute inset-0"
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-xl border border-stone-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-stone-200 bg-stone-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Terms & Conditions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6 text-sm text-slate-700 leading-relaxed space-y-5">
          {/* ✅ Replace the text below with your real terms anytime */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">1. Overview</h3>
            <p>
              These Terms & Conditions govern bookings made through Eagle Villas.
              By using this website and placing a booking, you agree to these terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Bookings & Payment
            </h3>
            <p>
              A booking is confirmed once payment (or deposit, if applicable) is received
              and you receive confirmation by email. Prices shown are in EUR unless stated otherwise.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Cancellations & Refunds
            </h3>
            <p>
              Cancellation and refund eligibility depends on the cancellation policy of your booking.
              Refund calculations are handled by the backend as the source of truth.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              4. House Rules & Damages
            </h3>
            <p>
              Guests must follow house rules provided in the property listing or during check-in.
              You may be responsible for damage, missing items, or excessive cleaning costs.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              5. Liability
            </h3>
            <p>
              To the maximum extent permitted by law, Eagle Villas is not liable for indirect or
              consequential losses. Nothing in these terms limits liability where unlawful.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              6. Privacy
            </h3>
            <p>
              Your personal data is handled according to our privacy practices. If you need a dedicated
              Privacy Policy page/modal too, we can add it the same way.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              7. Contact
            </h3>
            <p>
              Questions about these terms? Contact us at{" "}
              <span className="font-semibold">stay@eaglevillas.example</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
