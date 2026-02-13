// src/components/villa/PropertyReviewsSection.tsx
import { useMemo } from "react";
import { Star } from "lucide-react";
import { usePropertyReviewsQuery } from "../../api/reviews";

type Props = {
  /**
   * Backend property identifier used to fetch verified reviews.
   */
  propertyId: number;

  /**
   * Compact header reduces typography scale when used in tighter layouts.
   */
  compactHeader?: boolean;

  /**
   * Limits how many review cards are rendered.
   * This keeps the DOM lighter and prevents long review lists from affecting scroll performance.
   * The container remains fixed-height; additional reviews are accessible via scrolling when rendered.
   */
  initialVisible?: number;
};

const GOLD = "#C9A24A";

/**
 * Clamps numeric rating values safely between 0 and 5.
 * Prevents rendering inconsistencies if backend ever sends out-of-range data.
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Formats ISO dates into Month + Year for compact review metadata display.
 */
function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/**
 * Star rating renderer.
 * Fully controlled visual output independent of backend formatting.
 */
function Stars({ value }: { value: number }) {
  const v = clamp(value, 0, 5);
  const full = Math.floor(v);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={15}
          className="stroke-[1.5]"
          style={{
            color: GOLD,
            fill: i < full ? GOLD : "transparent",
            opacity: i < full ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

export default function PropertyReviewsSection({
  propertyId,
  compactHeader = false,
  initialVisible,
}: Props) {
  /**
   * Backend query:
   * - count
   * - averages
   * - reviews[]
   */
  const { data, isLoading, isError } = usePropertyReviewsQuery(propertyId, true);

  const count = data?.count ?? 0;
  const averages = data?.averages;

  /**
   * Memoized overall rating prevents unnecessary recalculations.
   */
  const overall = useMemo(
    () => (averages?.overall == null ? null : averages.overall),
    [averages]
  );

  const reviews = data?.reviews ?? [];

  /**
   * Render limit:
   * - If provided, we cap how many review cards are mounted.
   * - If omitted, we render the full list (scroll container still prevents layout growth).
   */
  const visibleReviews = useMemo(() => {
    if (!Number.isFinite(initialVisible) || !initialVisible) return reviews;
    return reviews.slice(0, Math.max(1, initialVisible));
  }, [reviews, initialVisible]);

  return (
    /**
     * Fixed-height container.
     * Height is intentionally locked so review growth never expands the hero layout.
     * Scroll behavior is delegated strictly to inner content.
     */
    <section className="flex flex-col h-[280px] sm:h-[300px] md:h-[255px]">
      <div className="flex flex-col h-full rounded-2xl border border-amber-200/70 bg-white/90 p-4 shadow-sm">
        {/* Header (non-growing) */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <div
              className={[
                "font-semibold text-stone-900",
                compactHeader ? "text-sm" : "text-base",
              ].join(" ")}
            >
              Reviews
            </div>
            <div className="mt-0.5 text-xs text-stone-600">
              Verified stays only
            </div>
          </div>

          {count > 0 && overall != null && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">
                  {overall.toFixed(1)}
                </span>
                <Stars value={overall} />
              </div>
              <div className="text-[11px] text-stone-600">
                {count} review{count === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable review list */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          {isError ? (
            <div className="rounded-xl border border-amber-200/70 bg-white p-4 text-sm text-stone-700">
              Reviews unavailable.
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-black/10 animate-pulse" />
              <div className="h-20 rounded-xl bg-black/10 animate-pulse" />
            </div>
          ) : count === 0 ? (
            <div className="rounded-xl border border-amber-200/70 bg-white p-4">
              <div className="text-sm font-semibold text-stone-900">
                Be the first to review
              </div>
              <div className="mt-1 text-sm text-stone-600">
                Reviews appear after the first verified stays.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleReviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-amber-200/70 bg-white p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-stone-900">
                        {r.user?.name || "Guest"}
                      </div>
                      <div className="text-xs text-stone-600">
                        {formatDate(r.createdAt)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-stone-900">
                        {r.overall.toFixed(1)}
                      </div>
                      <Stars value={r.overall} />
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    {r.comment || "No written comment."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Spacer keeps visual balance and prevents edge compression */}
        <div className="mt-2 h-4 shrink-0" />
      </div>
    </section>
  );
}
