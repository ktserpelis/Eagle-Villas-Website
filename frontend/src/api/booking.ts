// src/api/booking.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Types used by the booking API.
 * These should match (or be compatible with) your backend responses.
 * If you already have shared booking types, you can replace these with imports.
 */
import type {
  Booking,
  CreateBookingPayload,
  CustomerBookingsResponse,
  CreateBookingResponse,
  PropertyCalendarResponse,
} from "./types.ts";

/**
 * Create a booking.
 *
 * Backend behavior:
 * - CUSTOMER: creates booking with status "pending" and returns Stripe Checkout URL
 * - ADMIN: creates booking with status "confirmed" and returns checkoutUrl = null
 */
async function createBooking(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const res = await api.post<CreateBookingResponse>("/api/bookings", payload);
  return res.data;
}

/**
 * React Query mutation hook for creating bookings.
 *
 * The caller is responsible for:
 * - redirecting to Stripe if checkoutUrl exists
 * - navigating to confirmation page for admin bookings
 */
export function useCreateBooking() {
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
  });
}

/* ============================================================
   CUSTOMER BOOKINGS – SINGLE BOOKING
   Used on the Stripe success page to poll until payment is confirmed
   ============================================================ */

/**
 * Fetch a single booking belonging to the logged-in customer.
 *
 * Backend route:
 * GET /api/customer/bookings/:id
 *
 * Security:
 * - Backend must ensure the booking belongs to req.user
 */
async function fetchCustomerBookingById(id: number): Promise<Booking> {
  const res = await api.get<Booking>(`/api/customer/bookings/${id}`);
  return res.data;
}

/**
 * React Query hook to fetch a single customer booking.
 *
 * Used to poll booking status after Stripe redirects the user back.
 */
export function useCustomerBookingByIdQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: ["customer-booking", id],
    queryFn: () => fetchCustomerBookingById(id),
    enabled: enabled && Number.isFinite(id),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch all bookings that belong to the currently authenticated customer.
 *
 * Backend guarantees:
 * - Only bookings owned by req.user are returned
 * - Each booking includes its property relation
 *
 * IMPORTANT:
 * - This function does NOT handle loading or errors for you
 * - Use this for imperative flows or non-React contexts
 */
async function fetchCustomerBookings(): Promise<CustomerBookingsResponse> {
  const res = await api.get<CustomerBookingsResponse>("/api/customer/bookings");
  return res.data;
}

/**
 * React Query hook that wraps fetchCustomerBookings.
 *
 * Why this exists:
 * - Centralizes caching under a stable query key
 * - Automatically deduplicates requests
 * - Allows easy refetch after mutations (e.g. cancel booking)
 *
 * Typical usage:
 * const { data, isLoading, isError, refetch } =
 *   useCustomerBookingsQuery(!!user);
 */
export function useCustomerBookingsQuery(enabled: boolean) {
  return useQuery({
    /**
     * Stable query key for all customer bookings.
     * Any mutation can invalidate or refetch this key.
     */
    queryKey: ["customer-bookings"],

    /**
     * The actual API call.
     * React Query calls this automatically when enabled === true.
     */
    queryFn: fetchCustomerBookings,

    /**
     * Prevents fetching when the user is not logged in.
     * This avoids unnecessary 401 errors and wasted requests.
     */
    enabled,

    /**
     * Cache tuning:
     * - staleTime: how long data is considered fresh
     * - refetchOnWindowFocus: avoid surprise refetches when tab refocuses
     */
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Customer/public property calendar:
 * availability blocks + nightly prices
 */
async function fetchPropertyCalendar(
  propertyId: number,
  from: string,
  to: string
): Promise<PropertyCalendarResponse> {
  const res = await api.get<PropertyCalendarResponse>(
    `/api/bookings/calendar/property/${propertyId}`,
    { params: { from, to } }
  );
  return res.data;
}

export function usePropertyCalendar(
  propertyId: number,
  from: string,
  to: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["property-calendar", propertyId, from, to],
    queryFn: () => fetchPropertyCalendar(propertyId, from, to),
    enabled: enabled && Number.isFinite(propertyId) && !!from && !!to,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

