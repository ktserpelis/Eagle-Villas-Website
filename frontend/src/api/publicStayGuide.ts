import type { AdminStayGuide } from "./adminStayGuide";

export async function fetchPublicStayGuide(token: string): Promise<AdminStayGuide> {
  const res = await fetch(`/api/public/stay-guide/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Guide not found");
  return res.json();
}
