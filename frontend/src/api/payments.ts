// src/api/payments.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Cancelling a booking:
 * - Backend decides how much is refunded immediately based on policy.
 * - Backend may issue a voucher (credit) for <15 day cancellations.
 */
export type CancelBookingPayload = {
  bookingId: number;
  reason?: string;
};

export type CancelBookingResponse = {
  bookingId: number;
  status: "cancelled";
  refund: {
    refundType: "stripe_refund" | "voucher" | "none";
    refundedCents: number;
    voucherCents: number;
    // ✅ With webhook-confirmed refunds, backend may return "pending"
    refundStatus: "pending" | "succeeded" | "failed" | "not_applicable";
  };
};

/**
 * Preview: cancellation outcome before the user confirms.
 * GET /api/payments/cancel-preview/:bookingId
 */
export type CancelBookingPreviewResponse = {
  bookingId: number;
  action: "cancel";
  currency: string;
  policy: {
    daysBefore: number;
    tier: "60_plus" | "30_to_59" | "15_to_29" | "lt_15";
    label: string;
    description: string;
    refundBps: number;
    voucherBps: number;
  };
  outcome: {
    refundType: "stripe_refund" | "voucher" | "none";
    stripeRefundCents: number;
    voucherCents: number;
  };
};

/**
 * Refund request (admin approval) endpoint:
 * POST /api/payments/refund-request/:bookingId
 */
export type RefundRequestPayload = {
  bookingId: number;
  reason?: string;
};

export type RefundRequestResponse = {
  bookingId: number;
  status: "pending_admin_approval";
  message?: string;
  requestId?: number;
};

/**
 * Preview: admin refund request outcome before the user confirms.
 * GET /api/payments/refund-request-preview/:bookingId
 */
export type RefundRequestPreviewResponse = {
  bookingId: number;
  action: "refund_request";
  currency: string;
  amount: {
    bookingTotalCents: number;
    refundableRemainingCents: number;
    requestedRefundCents: number;
  };
};

async function cancelBooking(
  payload: CancelBookingPayload
): Promise<CancelBookingResponse> {
  const { bookingId, ...body } = payload;
  const res = await api.post<CancelBookingResponse>(
    `/payments/cancel/${bookingId}`,
    body
  );
  return res.data;
}

async function requestRefund(
  payload: RefundRequestPayload
): Promise<RefundRequestResponse> {
  const { bookingId, ...body } = payload;
  const res = await api.post<RefundRequestResponse>(
    `/payments/refund-request/${bookingId}`,
    body
  );
  return res.data;
}

async function cancelPreview(
  bookingId: number
): Promise<CancelBookingPreviewResponse> {
  const res = await api.get<CancelBookingPreviewResponse>(
    `/payments/cancel-preview/${bookingId}`
  );
  return res.data;
}

async function refundRequestPreview(
  bookingId: number
): Promise<RefundRequestPreviewResponse> {
  const res = await api.get<RefundRequestPreviewResponse>(
    `/payments/refund-request-preview/${bookingId}`
  );
  return res.data;
}

/**
 * Mutation hook used from the booking card "Cancel booking" UI.
 */
export function useCancelBooking() {
  return useMutation({
    mutationFn: cancelBooking,
  });
}

/**
 * Mutation hook used when the user requests admin approval for a full refund.
 */
export function useRequestRefund() {
  return useMutation({
    mutationFn: requestRefund,
  });
}

/**
 * Mutation hook used to fetch cancellation preview (confirmation step).
 */
export function useCancelBookingPreview() {
  return useMutation({
    mutationFn: cancelPreview,
  });
}

/**
 * Mutation hook used to fetch refund-request preview (confirmation step).
 */
export function useRefundRequestPreview() {
  return useMutation({
    mutationFn: refundRequestPreview,
  });
}

/**
 * ============================================================
 * ADMIN: REFUND REQUEST MODERATION
 * ============================================================
 *
 * These API calls are used ONLY in the admin dashboard.
 * They do not replace or change any existing customer calls above.
 *
 * Backend routes:
 * - GET  /api/payments/admin/refund-requests?status=pending|approved|rejected
 * - POST /api/payments/admin/refund-requests/:id/approve
 * - POST /api/payments/admin/refund-requests/:id/reject
 */

export type AdminRefundRequest = {
  id: number;
  bookingId: number;
  userId: number;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  decidedAt: string | null;
  createdAt: string;

  user: {
    id: number;
    name: string | null;
    email: string;
  };

  booking: {
    id: number;
    status: string;
    startDate: string;
    endDate: string;
    totalPrice: number;

    property: { id: number; title: string } | null;

    payment: {
      provider: string;
      status: string;
      amountCents: number;
      currency: string;
      refundedCents: number;
      stripePaymentIntentId?: string | null;
    } | null;

    cancellation: {
      id: number;
      cancelledAt: string;
      policyRefundCents: number;
      voucherIssuedCents: number;
      reason: string | null;
    } | null;
  };

  computed: {
    refundableRemainingCents: number;
  };
};

export type AdminRefundRequestsResponse = {
  refundRequests: AdminRefundRequest[];
};

async function adminFetchRefundRequests(
  status: "pending" | "approved" | "rejected"
): Promise<AdminRefundRequestsResponse> {
  const res = await api.get<AdminRefundRequestsResponse>(
    "/payments/admin/refund-requests",
    { params: { status } }
  );
  return res.data;
}

/**
 * Admin query: fetch refund requests for moderation.
 */
export function useAdminRefundRequestsQuery(
  status: "pending" | "approved" | "rejected"
) {
  return useQuery({
    queryKey: ["admin-refund-requests", status],
    queryFn: () => adminFetchRefundRequests(status),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export type AdminApproveRefundResponse = {
  status: "approved";
  refundedCents: number;
  // ✅ With webhook-confirmed refunds, backend may return "pending"
  refundStatus?: "pending" | "succeeded" | "failed" | "not_applicable";
};

async function adminApproveRefundRequest(
  id: number
): Promise<AdminApproveRefundResponse> {
  const res = await api.post<AdminApproveRefundResponse>(
    `/payments/admin/refund-requests/${id}/approve`
  );
  return res.data;
}

/**
 * Admin mutation: approve a refund request.
 * Backend submits Stripe refund (idempotent) and webhook confirms final status.
 */
export function useAdminApproveRefundRequest() {
  return useMutation({
    mutationFn: adminApproveRefundRequest,
  });
}

export type AdminRejectRefundResponse = {
  status: "rejected";
};

async function adminRejectRefundRequest(
  id: number
): Promise<AdminRejectRefundResponse> {
  const res = await api.post<AdminRejectRefundResponse>(
    `/payments/admin/refund-requests/${id}/reject`
  );
  return res.data;
}

/**
 * Admin mutation: reject a refund request.
 * No money is refunded and booking status is unchanged.
 */
export function useAdminRejectRefundRequest() {
  return useMutation({
    mutationFn: adminRejectRefundRequest,
  });
}

export type BookingRefundStatusResponse = {
  bookingId: number;
  bookingStatus: string;
  currency: string;
  cancellation: {
    voucherIssuedCents: number;
    policyRefundCents: number;
  } | null;
  refund: {
    id: number;
    source: "policy_cancel" | "admin_request";
    status: "pending" | "succeeded" | "failed" | "canceled";
    amountCents: number;
    currency: string;
    createdAt: string;
    failureReason: string | null;
  } | null;
};

async function fetchBookingRefundStatus(
  bookingId: number
): Promise<BookingRefundStatusResponse> {
  const res = await api.get<BookingRefundStatusResponse>(
    `/payments/refund-status/${bookingId}`
  );
  return res.data;
}

export function useBookingRefundStatusQuery(bookingId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["booking-refund-status", bookingId],
    queryFn: () => fetchBookingRefundStatus(bookingId),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}
