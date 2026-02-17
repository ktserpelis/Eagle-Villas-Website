import { api } from "./client";
import type { AdminStayGuide } from "./adminStayGuide";

export async function fetchPublicStayGuide(
  token: string
): Promise<AdminStayGuide> {
  const res = await api.get<AdminStayGuide>(
    `/api/public/stay-guide/${encodeURIComponent(token)}`
  );
  return res.data;
}
