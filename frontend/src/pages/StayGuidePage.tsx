// src/pages/stay-guide/StayGuidePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import RecommendationCard from "../components/stay-guide/RecommendationCard";

/**
 * This page now loads REAL data from the backend public endpoint:
 *   GET /api/public/stay-guide/:token
 *
 * It expects the backend to return:
 * {
 *   id, token, title, intro, published, revokedAt, expiresAt,
 *   sections: [
 *     { id, title, sortOrder, items: [
 *        { id, title, type, description, heroImageUrl, imageUrls, href, mapsHref, mapsEmbedSrc, locationLabel, sortOrder }
 *     ]}
 *   ]
 * }
 */

type ApiStayGuideItem = {
  id: number;
  title: string;
  type: string;
  description: string;

  heroImageUrl: string;
  imageUrls: string[] | null;

  href: string | null;
  mapsHref: string | null;
  mapsEmbedSrc: string | null;

  locationLabel: string | null;
  sortOrder: number;
};

type ApiStayGuideSection = {
  id: number;
  title: string;
  sortOrder: number;
  items: ApiStayGuideItem[];
};

type ApiStayGuide = {
  id: number;
  token: string;
  title: string;
  intro: string | null;
  published: boolean;
  revokedAt: string | null;
  expiresAt: string | null;
  sections: ApiStayGuideSection[];
};

async function fetchPublicStayGuide(token: string): Promise<ApiStayGuide> {
  const res = await fetch(`/api/public/stay-guide/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    // 404 = not found / not published
    // 410 = expired/revoked (if you implemented it that way)
    throw new Error(String(res.status));
  }

  return (await res.json()) as ApiStayGuide;
}

export default function StayGuidePage() {
  const { token } = useParams();
  const [guide, setGuide] = useState<ApiStayGuide | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "notfound">("idle");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setGuide(null);
        setStatus("notfound");
        return;
      }

      setStatus("loading");
      try {
        const data = await fetchPublicStayGuide(token);
        if (cancelled) return;
        setGuide(data);
        setStatus("ok");
      } catch {
        if (cancelled) return;
        setGuide(null);
        setStatus("notfound");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sortedSections = useMemo(() => {
    if (!guide) return [];
    return [...(guide.sections ?? [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => ({
        ...s,
        items: [...(s.items ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      }));
  }, [guide]);

  if (status === "loading") {
    return (
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <header className="rounded-[28px] border border-amber-200/70 bg-white shadow-sm overflow-hidden">
          <div className="p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">
              PRIVATE GUEST GUIDE
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-[-0.01em] text-slate-900">
              Loading…
            </h1>
            <p className="mt-3 text-slate-700 leading-7">Please wait a moment.</p>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
        </header>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-8">
          {/* lightweight skeletons (no new components) */}
          <div className="rounded-3xl border border-amber-200/70 bg-white shadow-sm overflow-hidden">
            <div className="aspect-[16/10] bg-slate-100 animate-pulse" />
            <div className="p-7 space-y-3">
              <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-5/6 bg-slate-100 animate-pulse rounded" />
              <div className="h-56 w-full bg-slate-100 animate-pulse rounded-2xl" />
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200/70 bg-white shadow-sm overflow-hidden">
            <div className="aspect-[16/10] bg-slate-100 animate-pulse" />
            <div className="p-7 space-y-3">
              <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-5/6 bg-slate-100 animate-pulse rounded" />
              <div className="h-56 w-full bg-slate-100 animate-pulse rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!guide || status === "notfound") {
    return (
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <div className="rounded-3xl border border-amber-200/70 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Guide not found</h1>
          <p className="mt-2 text-slate-700">
            This QR link is invalid, expired, or the guide is unavailable. Please scan again or
            contact your host.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
      {/* Header */}
      <header className="rounded-[28px] border border-amber-200/70 bg-white shadow-sm overflow-hidden">
        <div className="p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">
            PRIVATE GUEST GUIDE
          </p>

          {/* Less bold page title */}
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-[-0.01em] text-slate-900">
            {guide.title}
          </h1>

          {guide.intro ? (
            <p className="mt-3 text-slate-700 leading-7">{guide.intro}</p>
          ) : null}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
      </header>

      {/* Sections */}
      <div className="mt-10 space-y-12">
        {sortedSections.map((section) => (
          <section key={section.id}>
            {/* More distinct category title (not heavy bold) */}
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-6 w-[3px] rounded-full bg-amber-200/80" />
                <h2 className="text-[18px] md:text-[19px] font-semibold tracking-[0.06em] text-slate-900 uppercase">
                  {section.title}
                </h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-amber-200/70 via-slate-200 to-transparent" />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-8">
              {section.items.map((item) => (
                <RecommendationCard
                  key={item.id}
                  title={item.title}
                  type={item.type}
                  description={item.description}
                  heroImage={item.heroImageUrl}
                  images={item.imageUrls ?? undefined}
                  href={item.href ?? undefined}
                  mapsHref={item.mapsHref ?? undefined}
                  mapsEmbedSrc={item.mapsEmbedSrc ?? undefined}
                  locationLabel={item.locationLabel ?? undefined}
                  autoSlideMs={5200}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
