import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { Prisma } from "@prisma/client";

// TODO: replace with your actual admin auth middleware
function requireAdmin(_req: any, _res: any, next: any) {
  next();
}

function newToken() {
  // Good enough for v1; you can switch to crypto.randomUUID() later
  return "sg_" + Math.random().toString(36).slice(2) + "_" + Math.random().toString(36).slice(2);
}

async function getOrCreateGuide() {
  const existing = await prisma.stayGuide.findFirst({
    orderBy: { id: "asc" },
  });

  if (existing) return existing;

  return prisma.stayGuide.create({
    data: {
      token: newToken(),
      title: "Stay Guide",
      intro: "Welcome! Here are our recommendations.",
      published: true,
    },
  });
}

export const adminStayGuideRouter = Router();
adminStayGuideRouter.use(requireAdmin);

/**
 * GET /api/admin/stay-guide
 * Returns the universal guide + sections + items (sorted).
 * Auto-creates a guide if none exists.
 */
adminStayGuideRouter.get("/", async (_req, res) => {
  const base = await getOrCreateGuide();

  const guide = await prisma.stayGuide.findUnique({
    where: { id: base.id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  res.json(guide);
});

/**
 * PATCH /api/admin/stay-guide
 * body: { title?, intro?, published?, revokedAt?, expiresAt? }
 */
adminStayGuideRouter.patch("/", async (req, res) => {
  const base = await getOrCreateGuide();

  const { title, intro, published, revokedAt, expiresAt } = req.body ?? {};

  const updated = await prisma.stayGuide.update({
    where: { id: base.id },
    data: {
      title: title !== undefined ? String(title) : undefined,
      intro: intro !== undefined ? (intro ? String(intro) : null) : undefined,
      published: published !== undefined ? Boolean(published) : undefined,
      revokedAt: revokedAt !== undefined ? (revokedAt ? new Date(revokedAt) : null) : undefined,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
    },
  });

  res.json(updated);
});

/**
 * POST /api/admin/stay-guide/regenerate-token
 */
adminStayGuideRouter.post("/regenerate-token", async (_req, res) => {
  const base = await getOrCreateGuide();

  const updated = await prisma.stayGuide.update({
    where: { id: base.id },
    data: { token: newToken(), revokedAt: null, expiresAt: null },
  });

  res.json(updated);
});

/**
 * POST /api/admin/stay-guide/sections
 * body: { title, sortOrder? }
 */
adminStayGuideRouter.post("/sections", async (req, res) => {
  const base = await getOrCreateGuide();
  const { title, sortOrder } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });

  const created = await prisma.stayGuideSection.create({
    data: {
      guideId: base.id,
      title: String(title),
      sortOrder: sortOrder === undefined ? 0 : Number(sortOrder),
    },
  });

  res.status(201).json(created);
});

/**
 * PATCH /api/admin/stay-guide/sections/:sectionId
 * body: { title?, sortOrder? }
 */
adminStayGuideRouter.patch("/sections/:sectionId", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  if (!sectionId) return res.status(400).json({ error: "Invalid sectionId" });

  const { title, sortOrder } = req.body ?? {};

  const updated = await prisma.stayGuideSection.update({
    where: { id: sectionId },
    data: {
      title: title !== undefined ? String(title) : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
    },
  });

  res.json(updated);
});

/**
 * DELETE /api/admin/stay-guide/sections/:sectionId
 */
adminStayGuideRouter.delete("/sections/:sectionId", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  if (!sectionId) return res.status(400).json({ error: "Invalid sectionId" });

  await prisma.stayGuideSection.delete({ where: { id: sectionId } });
  res.status(204).send();
});

/**
 * POST /api/admin/stay-guide/sections/:sectionId/items
 * body: {
 *  title, type, description, heroImageUrl,
 *  imageUrls?, href?, mapsHref?, mapsEmbedSrc?, locationLabel?, sortOrder?
 * }
 */
adminStayGuideRouter.post("/sections/:sectionId/items", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  if (!sectionId) return res.status(400).json({ error: "Invalid sectionId" });

  const {
    title,
    type,
    description,
    heroImageUrl,
    imageUrls,
    href,
    mapsHref,
    mapsEmbedSrc,
    locationLabel,
    sortOrder,
  } = req.body ?? {};

  if (!title || !type || !description || !heroImageUrl) {
    return res.status(400).json({ error: "title, type, description, heroImageUrl are required" });
  }

  const created = await prisma.stayGuideItem.create({
    data: {
      sectionId,
      title: String(title),
      type: String(type),
      description: String(description),
      heroImageUrl: String(heroImageUrl),
      imageUrls: Array.isArray(imageUrls) ? imageUrls : undefined,
      href: href ? String(href) : null,
      mapsHref: mapsHref ? String(mapsHref) : null,
      mapsEmbedSrc: mapsEmbedSrc ? String(mapsEmbedSrc) : null,
      locationLabel: locationLabel ? String(locationLabel) : null,
      sortOrder: sortOrder === undefined ? 0 : Number(sortOrder),
    },
  });

  res.status(201).json(created);
});

/**
 * PATCH /api/admin/stay-guide/items/:itemId
 */
adminStayGuideRouter.patch("/items/:itemId", async (req, res) => {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: "Invalid itemId" });

  const {
    title,
    type,
    description,
    heroImageUrl,
    imageUrls,
    href,
    mapsHref,
    mapsEmbedSrc,
    locationLabel,
    sortOrder,
  } = req.body ?? {};

  const updated = await prisma.stayGuideItem.update({
    where: { id: itemId },
    data: {
      title: title !== undefined ? String(title) : undefined,
      type: type !== undefined ? String(type) : undefined,
      description: description !== undefined ? String(description) : undefined,
      heroImageUrl: heroImageUrl !== undefined ? String(heroImageUrl) : undefined,
      imageUrls:
        imageUrls !== undefined
          ? Array.isArray(imageUrls)
            ? imageUrls
            : Prisma.JsonNull
          : undefined,

      href: href !== undefined ? (href ? String(href) : null) : undefined,
      mapsHref: mapsHref !== undefined ? (mapsHref ? String(mapsHref) : null) : undefined,
      mapsEmbedSrc: mapsEmbedSrc !== undefined ? (mapsEmbedSrc ? String(mapsEmbedSrc) : null) : undefined,
      locationLabel: locationLabel !== undefined ? (locationLabel ? String(locationLabel) : null) : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
    },
  });

  res.json(updated);
});

/**
 * DELETE /api/admin/stay-guide/items/:itemId
 */
adminStayGuideRouter.delete("/items/:itemId", async (req, res) => {
  const itemId = Number(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: "Invalid itemId" });

  await prisma.stayGuideItem.delete({ where: { id: itemId } });
  res.status(204).send();
});
