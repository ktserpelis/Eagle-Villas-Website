// src/api/admin.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  AdminPropertyListResponse,
  AdminBookingListResponse,
  AdminProperty,
} from "../api/types";
import type { CreatePropertyInput, UpdatePropertyInput } from "@shared/schemas/property.schema";

export const ADMIN_PROPERTIES_QUERY_KEY = ["admin", "properties"] as const;
export const ADMIN_BOOKINGS_QUERY_KEY = ["admin", "bookings"] as const;

/* ===========================
   FETCHERS
   =========================== */

async function fetchAdminProperties(): Promise<AdminPropertyListResponse> {
  const res = await api.get<AdminPropertyListResponse>("/admin/properties");
  return res.data;
}

async function fetchAdminBookings(
  params?: Record<string, any>
): Promise<AdminBookingListResponse & { nextCursorId?: number | null; blocksRequireRange?: boolean }> {
  const res = await api.get("/admin/bookings", { params });
  return res.data;
}

/* ===========================
   HOOKS: QUERIES
   =========================== */

export function useAdminPropertiesQuery() {
  return useQuery({
    queryKey: ADMIN_PROPERTIES_QUERY_KEY,
    queryFn: fetchAdminProperties,
  });
}

export function useAdminBookingsQuery(params?: Record<string, any>) {
  return useQuery({
    queryKey: [...ADMIN_BOOKINGS_QUERY_KEY, params ?? {}] as const,
    queryFn: () => fetchAdminBookings(params),
  });
}

/* ===========================
   HOOKS: MUTATIONS
   =========================== */

async function createProperty(
  data: CreatePropertyInput
): Promise<{ property: AdminProperty }> {
  const res = await api.post<{ property: AdminProperty }>(
    "/admin/properties",
    data
  );
  return res.data;
}

async function updateProperty(
  id: number,
  data: UpdatePropertyInput
): Promise<{ property: AdminProperty }> {
  const res = await api.put<{ property: AdminProperty }>(
    `/admin/properties/${id}`,
    data
  );
  return res.data;
}

async function deleteProperty(id: number): Promise<void> {
  await api.delete(`/admin/properties/${id}`);
}

export function useCreatePropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PROPERTIES_QUERY_KEY });
    },
  });
}

export function useUpdatePropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePropertyInput }) =>
      updateProperty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PROPERTIES_QUERY_KEY });
    },
  });
}

export function useDeletePropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PROPERTIES_QUERY_KEY });
    },
  });
}

export type AdminBookingsSearchResponse = {
  items: AdminBooking[];
  nextCursorId: number | null;
};

export type AdminBooking = {
  source: "DIRECT" | "BOOKING_COM" | "MANUAL";
  id: number;
  propertyId: number;
  userId: number | null;
  startDate: string;
  endDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestsCount: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  property: { id: number; title: string; city: string; country: string };
  user: { id: number; name: string | null; email: string | null } | null;

  priceBreakdown?: any;
  payment?: {
    provider: string;
    status: string;
    amountCents: number;
    refundedCents: number;
    creditsAppliedCents: number;
    currency: string;
  } | null;
  refundedTotalCents?: number;
  refunds?: { id: number; amountCents: number; status: string; createdAt: string }[];
};

