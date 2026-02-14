import { useEffect, useMemo, useState } from "react";
import { Star, Quote } from "lucide-react";
import { useLatestReviewsQuery } from "../api/reviews";

const GOLD = "#C9A24A";

/**
 * Compact view-model used by the mini widget.
 * Derived from the backend payload and shaped for predictable rendering.
 */
type MiniReview = {
  name?: string;
  rating: number;
  date?: string;
  text: string;
  propertyTitle?: string;
};

type Props = {
  /**
   * How many reviews to show at once (max 3).
   */
  visibleCount?: 1 | 2 | 3;

  /**
   * ms between carousel steps.
   */
  intervalMs?: number;

  /**
   * How many recent reviews to fetch from the backend.
   * Higher values improve variety, but cost slightly more payload.
   */
  fetchLimit?: number;
  hideIfEmpty?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Compact date formatting for small UI surfaces.
 */
function formatMiniDate(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function Stars({ value }: { value: number }) {
  const v = clamp(value, 0, 5);
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const isFull = i < full;
        const isHalf = !isFull && half && i === full;
        return (
          <Star
            key={i}
            size={14}
            className="stroke-[1.5]"
            style={{
              color: GOLD,
              fill: isFull || isHalf ? GOLD : "transparent",
              opacity: isFull || isHalf ? 1 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}

export default function HeroReviewsMini({
  visibleCount = 3,
  intervalMs = 4200,
  fetchLimit = 18,
  hideIfEmpty = false,
}: Props) {
  /**
   * Backend-sourced latest reviews across all properties.
   * The widget is intentionally decoupled from any single property page.
   */
  const { data, isLoading, isError } = useLatestReviewsQuery(fetchLimit, true);

  const rating = data?.averages?.overall ?? 0;
  const count = data?.count ?? 0;

  /**
   * Normalize backend review records into a stable display model.
   * This prevents the widget from breaking if optional fields are missing.
   */
  const list: MiniReview[] = useMemo(() => {
    const reviews = data?.reviews ?? [];
    return reviews
      .filter((r) => typeof r?.overall === "number")
      .map((r) => ({
        name: r?.user?.name ?? "Guest",
        rating: r.overall,
        date: formatMiniDate(r?.createdAt),
        text: r?.comment?.trim() ? r.comment : "No written comment.",
        propertyTitle: r?.property?.title ?? undefined,
      }));
  }, [data?.reviews]);

  const showCount = Math.min(3, Math.max(1, visibleCount));
  const canScroll = list.length > showCount;

  const [start, setStart] = useState(0);

  useEffect(() => {
    if (!canScroll) return;
    const id = window.setInterval(() => {
      setStart((s) => (s + 1) % list.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [canScroll, intervalMs, list.length]);

  const visible = useMemo(() => {
    const out: MiniReview[] = [];
    for (let i = 0; i < showCount; i++) {
      out.push(list[(start + i) % list.length]);
    }
    return out;
  }, [list, showCount, start]);

  // Hide entire widget if no reviews and hideIfEmpty is enabled
  if (hideIfEmpty && !isLoading && !isError && list.length === 0) {
    return null;
  }

  return (
    <div
      className="
        w-[250px] sm:w-[260px]
        rounded-3xl
        border border-white/30
        bg-white/10
        backdrop-blur-md
        px-4 py-6
        shadow-[0_18px_45px_rgba(0,0,0,0.35)]
        text-white
      "
    >
      {/* Header row: summary derived from backend response */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Stars value={rating} />
            <span className="text-base font-semibold text-white/95 tabular-nums">
              {rating ? rating.toFixed(1) : "—"}
            </span>
          </div>
          <div className="mt-1 text-sm text-white/80">
            {count} verified guest reviews
          </div>
        </div>

        <div
          className="shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold"
          style={{
            border: "1px solid rgba(255,255,255,0.28)",
            background: "rgba(0,0,0,0.12)",
          }}
        >
          Guests
        </div>
      </div>

      {/* Review cards */}
      <div className="mt-5 space-y-3">
        {isLoading ? (
          <>
            <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-2 h-[58px] animate-pulse" />
            <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-2 h-[58px] animate-pulse" />
            {showCount === 3 ? (
              <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-2 h-[58px] animate-pulse" />
            ) : null}
          </>
        ) : isError ? (
          <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-3 text-xs text-white/85">
            Reviews unavailable.
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-white/15 bg-black/10 px-3 py-3 text-xs text-white/85">
            No reviews yet.
          </div>
        ) : (
          visible.map((r, idx) => (
            <div
              key={`${start}-${idx}-${r.text.slice(0, 12)}`}
              className="rounded-2xl border border-white/15 bg-black/10 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <Quote size={14} style={{ color: GOLD, marginTop: 2 }} />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-white/90 truncate">
                      {r.name ?? "Guest"}
                      {r.date ? (
                        <span className="ml-2 text-[11px] font-medium text-white/65">
                          {r.date}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-white/70 tabular-nums">
                      {r.rating.toFixed(1)}
                    </div>
                  </div>

                  {r.propertyTitle ? (
                    <div className="mt-0.5 text-[11px] text-white/70 truncate">
                      {r.propertyTitle}
                    </div>
                  ) : null}

                  <div className="mt-1 text-xs text-white/85 leading-relaxed line-clamp-2">
                    {r.text}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dots indicator */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: Math.min(5, Math.max(1, list.length)) }).map((_, i) => {
          const active = i === (start % Math.min(5, Math.max(1, list.length)));
          return (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: active
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.35)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
