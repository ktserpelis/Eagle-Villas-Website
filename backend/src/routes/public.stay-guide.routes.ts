import { Router } from "express";
import { prisma } from "../prismaClient.js";

export const publicStayGuideRouter = Router();

/**
 * GET /api/public/stay-guide/:token
 * Validates token + published + not revoked + not expired.
 * Returns guide + sections + items.
 */
publicStayGuideRouter.get("/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) return res.status(400).json({ error: "token is required" });

  const guide = await prisma.stayGuide.findFirst({
    where: { token },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!guide) return res.status(404).json({ error: "not found" });

  // Enforce access rules
  if (!guide.published) return res.status(404).json({ error: "not found" });
  if (guide.revokedAt) return res.status(410).json({ error: "revoked" });
  if (guide.expiresAt && new Date(guide.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: "expired" });
  }

  res.json(guide);
});
