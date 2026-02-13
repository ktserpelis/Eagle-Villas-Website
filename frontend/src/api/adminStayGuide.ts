export type AdminStayGuideItem = {
  id: number;
  sectionId: number;
  title: string;
  type: string;
  description: string;

  href: string | null;
  mapsHref: string | null;
  mapsEmbedSrc: string | null;

  heroImageUrl: string;
  imageUrls: string[] | null;

  locationLabel: string | null;
  sortOrder: number;
};

export type AdminStayGuideSection = {
  id: number;
  guideId: number;
  title: string;
  sortOrder: number;
  items: AdminStayGuideItem[];
};

export type AdminStayGuide = {
  id: number;
  token: string;
  title: string;
  intro: string | null;
  published: boolean;
  revokedAt: string | null;
  expiresAt: string | null;
  sections: AdminStayGuideSection[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  // 204 no content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export function getAdminStayGuide() {
  return api<AdminStayGuide>("/api/admin/stay-guide");
}

export function patchAdminStayGuide(input: Partial<Pick<AdminStayGuide, "title" | "intro" | "published" | "revokedAt" | "expiresAt">>) {
  return api<AdminStayGuide>("/api/admin/stay-guide", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function regenerateStayGuideToken() {
  return api<AdminStayGuide>("/api/admin/stay-guide/regenerate-token", {
    method: "POST",
  });
}

export function createSection(input: { title: string; sortOrder?: number }) {
  return api<AdminStayGuideSection>("/api/admin/stay-guide/sections", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchSection(sectionId: number, input: { title?: string; sortOrder?: number }) {
  return api<AdminStayGuideSection>(`/api/admin/stay-guide/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSection(sectionId: number) {
  return api<void>(`/api/admin/stay-guide/sections/${sectionId}`, { method: "DELETE" });
}

export function createItem(sectionId: number, input: {
  title: string;
  type: string;
  description: string;
  heroImageUrl: string;
  imageUrls?: string[];
  href?: string | null;
  mapsHref?: string | null;
  mapsEmbedSrc?: string | null;
  locationLabel?: string | null;
  sortOrder?: number;
}) {
  return api<AdminStayGuideItem>(`/api/admin/stay-guide/sections/${sectionId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchItem(itemId: number, input: Partial<{
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
}>) {
  return api<AdminStayGuideItem>(`/api/admin/stay-guide/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteItem(itemId: number) {
  return api<void>(`/api/admin/stay-guide/items/${itemId}`, { method: "DELETE" });
}
