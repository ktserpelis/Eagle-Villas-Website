// src/api/adminPeriods.ts
import { api } from "./client";

type AdminCalendarPayload = {
  blocks: any[];
  periods: any[];
};

// Helper to make backend error messages readable
function extractErrorMessage(err: any): string {
  // Axios error shape
  const msg =
    err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;

  return msg ?? "Request failed";
}

/**
 * GET /api/admin/calendar/property/:propertyId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { blocks, periods }
 */
export async function adminFetchAdminCalendar(propertyId: number, from: string, to: string) {
  try {
    const res = await api.get<AdminCalendarPayload>(
      `/api/admin/calendar/property/${propertyId}`,
      { params: { from, to } }
    );
    return res.data;
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * GET /api/admin/properties/:propertyId/periods
 */
export async function adminFetchPeriods(propertyId: number) {
  try {
    const res = await api.get(`/api/admin/properties/${propertyId}/periods`);
    return res.data;
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * POST /api/admin/periods
 */
export async function adminCreatePeriod(body: any) {
  try {
    const res = await api.post(`/api/admin/periods`, body);
    return res.data;
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * PATCH /api/admin/periods/:periodId
 */
export async function adminPatchPeriod(periodId: number, body: any) {
  try {
    const res = await api.patch(`/api/admin/periods/${periodId}`, body);
    return res.data;
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * DELETE /api/admin/periods/:periodId
 */
export async function adminDeletePeriod(periodId: number) {
  try {
    await api.delete(`/api/admin/periods/${periodId}`);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}
