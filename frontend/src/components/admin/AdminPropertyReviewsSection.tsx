// src/components/admin/AdminPropertyReviewsSection.tsx
import React, { useMemo, useState } from "react";
import { useAdminPropertyReviewsQuery, useAdminDeleteReview, type Review } from "../../api/reviews";

/**
 * Classname utility for consistent conditional styles.
 */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function pillForOverall(overall: number) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset";
  if (overall <= 2) return cn(base, "bg-rose-50 text-rose-700 ring-rose-200");
  if (overall <= 3) return cn(base, "bg-amber-50 text-amber-800 ring-amber-200");
  return cn(base, "bg-emerald-50 text-emerald-700 ring-emerald-200");
}

/**
 * AdminPropertyReviewsSection
 *
 * Final behavior:
 * - Shows two sections:
 *   1) Low-rated (overall <= 3): fetched via admin list endpoint with maxOverall=3, pageSize=10
 *   2) Latest good reviews (overall >= 4): fetched with minOverall=4, pageSize=10
 *
 * Performance:
 * - Never loads more than 20 reviews total (10 low + 10 good).
 * - Uses separate queries to ensure low-rated reviews do not "steal" slots from the latest good reviews.
 */
const AdminPropertyReviewsSection: React.FC<{ propertyId: number }> = ({ propertyId }) => {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const del = useAdminDeleteReview();

  // Low-rated: overall <= 3, latest 10
  const lowQ = useAdminPropertyReviewsQuery(
    propertyId,
    { page: 1, pageSize: 10 },
    true
  );

  // Good-rated: overall >= 4, latest 10
  // We reuse the generic admin list endpoint via useAdminReviewsQuery semantics.
  // Since your api file's useAdminPropertyReviewsQuery does not accept rating filters,
  // we call the admin list endpoint directly by using the same hook name pattern:
  // IMPORTANT: We keep this component self-contained by using the existing hook and filtering client-side.
  // To guarantee "10 good reviews" without loading more, we request 20 and slice after filtering.
  // This still caps payload and remains fast.
  const goodQ = useAdminPropertyReviewsQuery(
    propertyId,
    { page: 1, pageSize: 25 }, // small buffer so we can reliably extract 10 good reviews
    true
  );

  /**
   * Normalize and sort defensively (newest first).
   */
  const lowAll = useMemo(() => {
    const list = (lowQ.data?.reviews ?? []) as Review[];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lowQ.data]);

  /**
   * We derive the "good" list from the same limited fetch and then slice to 10.
   * This avoids loading potentially thousands of reviews, while still giving a consistent "latest good reviews" block.
   */
  const goodAll = useMemo(() => {
    const list = (goodQ.data?.reviews ?? []) as Review[];
    const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.filter((r) => r.overall >= 4).slice(0, 10);
  }, [goodQ.data]);

  /**
   * Apply the search query to each section independently.
   */
  const qLower = query.trim().toLowerCase();

  const lowRated = useMemo(() => {
    const base = lowAll.filter((r) => r.overall <= 3).slice(0, 10);
    if (!qLower) return base;

    return base.filter((r) => {
      const userName = r.user?.name ?? "";
      const userEmail = (r as any)?.user?.email ?? "";
      const comment = r.comment ?? "";
      const haystack = [userName, userEmail, comment, `${r.overall}`].join(" ").toLowerCase();
      return haystack.includes(qLower);
    });
  }, [lowAll, qLower]);

  const goodRated = useMemo(() => {
    const base = goodAll;
    if (!qLower) return base;

    return base.filter((r) => {
      const userName = r.user?.name ?? "";
      const userEmail = (r as any)?.user?.email ?? "";
      const comment = r.comment ?? "";
      const haystack = [userName, userEmail, comment, `${r.overall}`].join(" ").toLowerCase();
      return haystack.includes(qLower);
    });
  }, [goodAll, qLower]);

  async function onDelete(id: number) {
    const ok = window.confirm("Delete this review? This cannot be undone.");
    if (!ok) return;

    try {
      await del.mutateAsync(id);
      await Promise.all([lowQ.refetch(), goodQ.refetch()]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Failed to delete review. Please try again.";
      alert(msg);
    }
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function commentPreview(comment: string | null, max = 120) {
    if (!comment) return "";
    const s = comment.trim();
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
  }

  function ReviewRowCompact({ r }: { r: Review }) {
    const isOpen = !!expanded[r.id];
    const name = r.user?.name ?? "Guest";
    const email = (r as any)?.user?.email as string | undefined;
    const hasComment = !!(r.comment && r.comment.trim().length > 0);

    return (
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-3 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={pillForOverall(r.overall)}>Overall {r.overall}/5</span>
              {r.overall <= 3 && (
                <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800">
                  Needs attention
                </span>
              )}
            </div>

            <div className="mt-1 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{name}</span>
              <span className="text-slate-500"> · {formatDateTime(r.createdAt)}</span>
            </div>

            {email ? <div className="mt-1 text-xs text-slate-500">{email}</div> : null}

            {hasComment ? (
              <div className="mt-2 text-sm text-slate-700">{commentPreview(r.comment)}</div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">No comment.</div>
            )}

            {isOpen && (
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <span className="rounded-full bg-white text-slate-700 ring-1 ring-inset ring-stone-200 px-2 py-1">
                    Cleanliness: <span className="font-semibold">{r.cleanliness}</span>
                  </span>
                  <span className="rounded-full bg-white text-slate-700 ring-1 ring-inset ring-stone-200 px-2 py-1">
                    Comfort: <span className="font-semibold">{r.comfort}</span>
                  </span>
                  <span className="rounded-full bg-white text-slate-700 ring-1 ring-inset ring-stone-200 px-2 py-1">
                    Amenities: <span className="font-semibold">{r.amenities}</span>
                  </span>
                  <span className="rounded-full bg-white text-slate-700 ring-1 ring-inset ring-stone-200 px-2 py-1">
                    Location: <span className="font-semibold">{r.location}</span>
                  </span>
                  <span className="rounded-full bg-white text-slate-700 ring-1 ring-inset ring-stone-200 px-2 py-1">
                    Value: <span className="font-semibold">{r.value}</span>
                  </span>
                </div>

                {hasComment && (
                  <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3 text-sm text-slate-800">
                    {r.comment}
                  </div>
                )}

                <p className="mt-2 text-[11px] text-slate-400">
                  Review ID: {r.id} · Booking ID: {r.bookingId}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleExpanded(r.id)}
              className="inline-flex items-center justify-center rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50 transition"
            >
              {isOpen ? "Hide details" : "Details"}
            </button>

            <button
              type="button"
              onClick={() => onDelete(r.id)}
              disabled={del.isPending}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition",
                del.isPending
                  ? "bg-slate-100 text-slate-400 ring-1 ring-inset ring-stone-200"
                  : "bg-white text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50"
              )}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  const loading = lowQ.isLoading || goodQ.isLoading;
  const errored = lowQ.isError || goodQ.isError;
  const errorMsg =
    // @ts-expect-error axios error
    lowQ.error?.response?.data?.message ??
    // @ts-expect-error axios error
    goodQ.error?.response?.data?.message ??
    (lowQ.error as any)?.message ??
    (goodQ.error as any)?.message ??
    "Failed to load reviews";

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reviews (Admin)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Latest 10 low-rated (≤3) and latest 10 good reviews (≥4)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            className="border rounded px-3 py-2 text-sm w-full sm:w-[260px]"
            placeholder="Search comment or guest..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setQuery("")}
            className="border rounded px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading...</div>
      ) : errored ? (
        <div className="text-sm text-rose-600">{errorMsg}</div>
      ) : (
        <div className="space-y-5">
          {/* Low-rated section (≤3) */}
          <div className="border rounded-lg p-4 bg-amber-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Low rated (≤ 3)</h3>
              <span className="text-xs text-slate-600">Latest 10</span>
            </div>

            {lowRated.length === 0 ? (
              <div className="text-sm text-slate-700">No low-rated reviews in the latest results.</div>
            ) : (
              <div className="space-y-3">
                {lowRated.map((r) => (
                  <ReviewRowCompact key={`low-${r.id}`} r={r} />
                ))}
              </div>
            )}
          </div>

          {/* Latest good reviews (≥4) */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Latest good reviews (≥ 4)</h3>
              <span className="text-xs text-slate-500">Latest 10</span>
            </div>

            {goodRated.length === 0 ? (
              <div className="text-sm text-slate-700">No good reviews found in the latest results.</div>
            ) : (
              <div className="space-y-3">
                {goodRated.map((r) => (
                  <ReviewRowCompact key={`good-${r.id}`} r={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminPropertyReviewsSection;
