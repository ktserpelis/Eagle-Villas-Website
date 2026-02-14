// src/api/vouchers.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Voucher = store credit issued when a booking is cancelled <15 days before start.
 * Backend creates these automatically.
 */
export type CreditVoucher = {
  id: number;
  userId: number;
  originalBookingId: number | null;
  issuedCents: number;
  remainingCents: number;
  currency: "eur";
  status: "active" | "used" | "expired" | "void" | "exhausted" | "revoked";
  createdAt: string;
};

export type CustomerVouchersResponse = {
  vouchers: CreditVoucher[];
};

async function fetchCustomerVouchers(): Promise<CustomerVouchersResponse> {
  /**
   * NOTE:
   * The backend implementation in customer.routes.ts exposes:
   *   GET /api/customer/vouchers
   */
  const res = await api.get<CustomerVouchersResponse>("/api/customer/vouchers");
  return res.data;
}

/**
 * Fetch vouchers belonging to the logged-in customer.
 */
export function useCustomerVouchersQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["customer-vouchers"],
    queryFn: fetchCustomerVouchers,
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * ============================================================
 * ADMIN: VOUCHERS VISIBILITY
 * ============================================================
 */

export type AdminVoucher = CreditVoucher & {
  user: { id: number; name: string | null; email: string };
};

export type AdminVouchersResponse = {
  vouchers: AdminVoucher[];
};

async function fetchAdminVouchers(): Promise<AdminVouchersResponse> {
  const res = await api.get<AdminVouchersResponse>("/api/payments/admin/vouchers");
  return res.data;
}

/**
 * Fetch all vouchers for admin auditing.
 */
export function useAdminVouchersQuery() {
  return useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: fetchAdminVouchers,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}
