// src/components/dashboard/ReviewModal.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCreateReview, type Review } from "../../api/reviews";

/**
 * ReviewModal
 *
 * Requirements implemented:
 * - Uses a portal to render into document.body so it always overlays the entire app
 *   (prevents "modal only inside component" issues caused by parent stacking contexts).
 * - Freezes the whole screen by locking body scroll while open.
 * - Supports two modes:
 *   - View mode: shows an existing review (read-only)
 *   - Create mode: allows submitting a new review
 *
 * Structure intentionally matches the RequestAdditionalBedModal pattern.
 */
export function ReviewModal({
  open,
  onClose,
  bookingId,
  villaTitle,
  onSubmitted,
  existingReview,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: number;
  villaTitle: string;
  onSubmitted: () => void;
  existingReview?: Review | null;
}) {
  const createReview = useCreateReview();

  const isViewMode = !!existingReview;

  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const [ratings, setRatings] = useState({
    cleanliness: 5,
    comfort: 5,
    amenities: 5,
    location: 5,
    value: 5,
    overall: 5,
  });

  /**
   * Keep fields in sync when switching between "view review" and "leave review".
   */
  useEffect(() => {
    if (!open) return;

    if (!existingReview) {
      setRatings({
        cleanliness: 5,
        comfort: 5,
        amenities: 5,
        location: 5,
        value: 5,
        overall: 5,
      });
      setComment("");
      return;
    }

    setRatings({
      cleanliness: existingReview.cleanliness,
      comfort: existingReview.comfort,
      amenities: existingReview.amenities,
      location: existingReview.location,
      value: existingReview.value,
      overall: existingReview.overall,
    });
    setComment(existingReview.comment ?? "");
  }, [existingReview, open]);

  /**
   * Freeze the whole screen while modal is open (no page scroll).
   * Also prevents layout shift by compensating for scrollbar width.
   */
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open, onClose]);

  function clamp(n: number) {
    return Math.max(1, Math.min(5, Math.round(n)));
  }

  function setRating<K extends keyof typeof ratings>(key: K, value: number) {
    setRatings((prev) => ({ ...prev, [key]: clamp(value) }));
  }

  async function submit() {
    if (isViewMode) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      await createReview.mutateAsync({
        bookingId,
        cleanliness: ratings.cleanliness,
        comfort: ratings.comfort,
        amenities: ratings.amenities,
        location: ratings.location,
        value: ratings.value,
        overall: ratings.overall,
        comment: comment.trim() || undefined,
      });

      onSubmitted();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
      onMouseDown={onClose} // click outside closes
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h3 className="text-lg font-semibold text-slate-900">
          {isViewMode ? "Your review" : "Leave a review"}
        </h3>

        <p className="mt-1 text-sm text-slate-600">{villaTitle}</p>

        <p className="mt-2 text-xs text-slate-500">
          {isViewMode
            ? "This is the review you submitted for this booking."
            : "Please rate your stay. Reviews can be submitted only after checkout for confirmed bookings."}
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3">
            <RatingRow
              label="Cleanliness"
              value={ratings.cleanliness}
              onChange={(v) => setRating("cleanliness", v)}
              disabled={isViewMode}
            />
            <RatingRow
              label="Comfort"
              value={ratings.comfort}
              onChange={(v) => setRating("comfort", v)}
              disabled={isViewMode}
            />
            <RatingRow
              label="Amenities"
              value={ratings.amenities}
              onChange={(v) => setRating("amenities", v)}
              disabled={isViewMode}
            />
            <RatingRow
              label="Location"
              value={ratings.location}
              onChange={(v) => setRating("location", v)}
              disabled={isViewMode}
            />
            <RatingRow
              label="Value"
              value={ratings.value}
              onChange={(v) => setRating("value", v)}
              disabled={isViewMode}
            />

            <div className="pt-2 border-t border-stone-200" />

            <RatingRow
              label="Overall"
              value={ratings.overall}
              onChange={(v) => setRating("overall", v)}
              disabled={isViewMode}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              disabled={isViewMode}
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-70"
              placeholder="Share anything that would help future guests..."
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Booking ID: {bookingId}
            {existingReview?.createdAt
              ? ` · Submitted: ${new Date(existingReview.createdAt).toLocaleString()}`
              : ""}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading || createReview.isPending}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-white text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition disabled:opacity-60"
          >
            {isViewMode ? "Close" : "Cancel"}
          </button>

          <button
            onClick={submit}
            disabled={loading || createReview.isPending}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-60"
          >
            {isViewMode ? "Done" : loading || createReview.isPending ? "Submitting..." : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal is the key fix that guarantees full-screen overlay behavior.
  return createPortal(modal, document.body);
}

function RatingRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={1}
          max={5}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-40"
        />
        <span className="w-8 text-right text-sm font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  );
}
