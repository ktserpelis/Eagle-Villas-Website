// src/api/reviews.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Reviews API (React Query hooks)
 *
 * Verified against backend route mounting:
 * - Customer routes mounted at:   /api/reviews        (app.use("/api/reviews", reviewsRouter))
 * - Admin routes mounted at:      /api/admin/reviews (app.use("/api/admin/reviews", adminReviewsRouter))
 * - Public property routes at:    /api               (app.use("/api", propertyReviewsRouter))
 *
 * Therefore, with an axios baseURL that includes "/api", this module uses:
 * - Customer: "/reviews", "/reviews/me", "/reviews/:id"
 * - Admin: "/admin/reviews", "/admin/reviews/:id"
 * - Public: "/properties/:propertyId/reviews"
 *
 * Note on admin property reviews:
 * - Backend includes a convenience route at:
 *     GET /api/admin/reviews/properties/:propertyId/reviews
 * - This frontend intentionally does NOT depend on it.
 *   We instead reuse GET /api/admin/reviews with the `propertyId` filter for stability.
 */

/* ============================================================
   TYPES
   ============================================================ */

export type ReviewUserLite = {
  id: number;
  name: string | null;
  /**
   * Admin endpoints include email in the user include.
   * Public endpoints usually do not. Keep optional to support both.
   */
  email?: string | null;
};

export type ReviewPropertyLite = {
  id: number;
  title: string;
  slug: string;
};

export type ReviewBookingLite = {
  id: number;
  startDate: string;
  endDate: string;
  status?: string;
};

export type Review = {
  id: number;

  propertyId: number;
  userId: number;
  bookingId: number;

  cleanliness: number;
  comfort: number;
  amenities: number;
  location: number;
  value: number;
  overall: number;

  comment: string | null;

  createdAt: string;
  updatedAt: string;

  // Optional includes depending on endpoint.
  user?: ReviewUserLite;
  property?: ReviewPropertyLite;
  booking?: ReviewBookingLite;
};

export type CreateReviewPayload = {
  bookingId: number;
  cleanliness: number;
  comfort: number;
  amenities: number;
  location: number;
  value: number;
  overall: number;
  comment?: string;
};

export type UpdateReviewPayload = Partial<Omit<CreateReviewPayload, "bookingId">> & {
  /**
   * Allow clearing comment by sending null.
   * Backend accepts null or empty string and normalizes to null.
   */
  comment?: string | null;
};

export type PropertyReviewsResponse = {
  count: number;
  averages: {
    overall: number | null;
    cleanliness: number | null;
    comfort: number | null;
    amenities: number | null;
    location: number | null;
    value: number | null;
  };
  reviews: Review[];
};

export type MyReviewsResponse = {
  reviews: Review[];
};

export type AdminReviewsListResponse = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  reviews: Review[];
};

export type AdminReviewsParams = {
  propertyId?: number;
  minOverall?: number;
  maxOverall?: number;
  q?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Latest reviews response for global widgets.
 * Mirrors the backend route payload.
 */
export type LatestReviewsResponse = {
  count: number;
  averages: { overall: number | null };
  reviews: Array<{
    id: number;
    createdAt: string;
    overall: number;
    comment: string | null;
    user: { id: number; name: string | null } | null;
    property: { id: number; slug: string; title: string } | null;
  }>;
};


/* ============================================================
   CUSTOMER
   ============================================================ */

/**
 * POST /api/reviews
 */
async function createReview(payload: CreateReviewPayload): Promise<{ review: Review }> {
  const res = await api.post<{ review: Review }>("/reviews", payload);
  return res.data;
}

/**
 * PATCH /api/reviews/:id
 */
async function updateReview(id: number, payload: UpdateReviewPayload): Promise<{ review: Review }> {
  const res = await api.patch<{ review: Review }>(`/reviews/${id}`, payload);
  return res.data;
}

/**
 * DELETE /api/reviews/:id
 */
async function deleteReview(id: number): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/reviews/${id}`);
  return res.data;
}

/**
 * GET /api/reviews/me
 */
async function fetchMyReviews(): Promise<MyReviewsResponse> {
  const res = await api.get<MyReviewsResponse>("/reviews/me");
  return res.data;
}

/**
 * Customer: fetch current user's reviews for dashboard/profile.
 */
export function useMyReviewsQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-reviews"],
    queryFn: fetchMyReviews,
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Optional alias to reduce churn in components that expect a more explicit name.
 */
export const useCustomerMyReviewsQuery = useMyReviewsQuery;

export function useCreateReview() {
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => createReview(payload),
  });
}

export function useUpdateReview() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateReviewPayload }) =>
      updateReview(id, payload),
  });
}

export function useDeleteReview() {
  return useMutation({
    mutationFn: (id: number) => deleteReview(id),
  });
}

/* ============================================================
   PUBLIC (PROPERTY PAGE)
   ============================================================ */

/**
 * GET /api/properties/:propertyId/reviews
 */
async function fetchPropertyReviews(propertyId: number): Promise<PropertyReviewsResponse> {
  const res = await api.get<PropertyReviewsResponse>(`/properties/${propertyId}/reviews`);
  return res.data;
}

/**
 * Public: fetch reviews + averages for a property page.
 */
export function usePropertyReviewsQuery(propertyId: number, enabled = true) {
  return useQuery({
    queryKey: ["property-reviews", propertyId],
    queryFn: () => fetchPropertyReviews(propertyId),
    enabled: enabled && Number.isFinite(propertyId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * GET /api/reviews/latest
 *
 * Fetch latest reviews across all properties for global UI surfaces.
 */
async function fetchLatestReviews(limit = 12): Promise<LatestReviewsResponse> {
  const res = await api.get<LatestReviewsResponse>(`/reviews/latest?limit=${limit}`);
  return res.data;
}

/**
 * Public: fetch latest reviews across all properties.
 * Used by homepage/hero widgets that are not tied to a single property.
 */
export function useLatestReviewsQuery(limit = 12, enabled = true) {
  return useQuery({
    queryKey: ["latest-reviews", limit],
    queryFn: () => fetchLatestReviews(limit),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/* ============================================================
   ADMIN
   ============================================================ */

/**
 * GET /api/admin/reviews
 */
async function fetchAdminReviews(params: AdminReviewsParams): Promise<AdminReviewsListResponse> {
  const res = await api.get<AdminReviewsListResponse>("/admin/reviews", { params });
  return res.data;
}

/**
 * Stable query key builder.
 * Avoid putting the params object directly into the query key, to prevent cache misses
 * when the caller recreates the object each render.
 */
function adminReviewsKey(params: AdminReviewsParams) {
  return [
    "admin-reviews",
    params.propertyId ?? null,
    params.minOverall ?? null,
    params.maxOverall ?? null,
    params.q ?? "",
    params.page ?? 1,
    params.pageSize ?? 25,
  ] as const;
}

export function useAdminReviewsQuery(params: AdminReviewsParams, enabled = true) {
  return useQuery({
    queryKey: adminReviewsKey(params),
    queryFn: () => fetchAdminReviews(params),
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Admin: reviews for a specific property (used by the admin property page).
 *
 * Backend provides a convenience endpoint:
 *   GET /api/admin/reviews/properties/:propertyId/reviews
 *
 * This frontend intentionally reuses:
 *   GET /api/admin/reviews?propertyId=...
 *
 * This keeps the UI stable even if the convenience route changes or is removed.
 */
export function useAdminPropertyReviewsQuery(
  propertyId: number,
  params: { page?: number; pageSize?: number } = {},
  enabled = true
) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 100;

  return useQuery({
    queryKey: ["admin-property-reviews", propertyId, page, pageSize],
    queryFn: () =>
      fetchAdminReviews({
        propertyId,
        page,
        pageSize,
      }),
    enabled: enabled && Number.isFinite(propertyId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * DELETE /api/admin/reviews/:id
 */
async function adminDeleteReview(id: number): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/admin/reviews/${id}`);
  return res.data;
}

export function useAdminDeleteReview() {
  return useMutation({
    mutationFn: (id: number) => adminDeleteReview(id),
  });
}
