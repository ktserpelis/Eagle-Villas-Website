import { api } from "./client";

export type AdditionalBedRequestStatus = "pending" | "approved" | "rejected";

export type AdditionalBedRequest = {
  id: number;
  bookingId: number;
  userId: number;
  bedsRequested: number;
  customerMessage: string | null;
  adminMessage: string | null;
  status: AdditionalBedRequestStatus;
  decidedAt: string | null;
  createdAt: string;
  chargeType: "charge" | "no_charge" | null;
  amountCents: number | null;
  user?: { id: number; name: string | null; email: string };
  booking?: { id: number; property?: { id: number; title: string } | null };
};

export const requestAdditionalBed = (
  bookingId: number,
  data: { bedsRequested: number; message?: string }
) => api.post(`/payments/additional-bed-request/${bookingId}`, data);

/* ================= ADMIN ================= */

export const fetchAdditionalBedRequests = (status: AdditionalBedRequestStatus = "pending") =>
  api.get<{ additionalBedRequests: AdditionalBedRequest[] }>(
    `/payments/admin/additional-bed-requests?status=${status}`
  );

export const approveAdditionalBedRequest = (
  requestId: number,
  data:
    | { chargeType: "no_charge"; adminMessage?: string }
    | { chargeType: "charge"; amountCents: number; adminMessage?: string }
) =>
  api.post(`/payments/admin/additional-bed-requests/${requestId}/approve`, data);

export const rejectAdditionalBedRequest = (requestId: number, adminMessage?: string) =>
  api.post(`/payments/admin/additional-bed-requests/${requestId}/reject`, { adminMessage });
