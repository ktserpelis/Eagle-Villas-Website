// src/routes/adminEmailTemplates.ts
import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { authMiddleware } from "../midleware/authMiddleware.js";
import { requireRole } from "../midleware/requireRole.js";
import { z } from "zod";

const router = Router();

/**
 * NOTE:
 * - key is the stable identifier for templates.
 * - If you ever need to rename keys, add a dedicated endpoint like:
 *   PATCH /email-templates/:key/rename
 */

const templateKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(64, "Key too long")
  .regex(/^[a-z0-9._-]+$/i, "Key must be alphanumeric and may include . _ -");

const createTemplateSchema = z.object({
  key: templateKeySchema,
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

const updateTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

// GET /api/admin/email-templates
router.get(
  "/email-templates",
  authMiddleware,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const templates = await prisma.emailTemplate.findMany({
        orderBy: { key: "asc" },
      });
      res.json({ templates });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load email templates" });
    }
  }
);

// GET /api/admin/email-templates/:key
router.get(
  "/email-templates/:key",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    const key = req.params.key;

    try {
      const template = await prisma.emailTemplate.findUnique({ where: { key } });
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ template });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load email template" });
    }
  }
);

// POST /api/admin/email-templates
router.post(
  "/email-templates",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ message: "Invalid template data", errors });
    }

    const { key, subject, body } = parsed.data;

    try {
      const created = await prisma.emailTemplate.create({
        data: { key, subject, body },
      });
      return res.status(201).json({ template: created });
    } catch (err: any) {
      console.error(err);

      // Prisma unique constraint violation
      if (err?.code === "P2002") {
        return res.status(409).json({
          message: "Template key already exists",
          errors: { key: ["Key must be unique"] },
        });
      }

      return res.status(500).json({ message: "Failed to create template" });
    }
  }
);

// PUT /api/admin/email-templates/:key
router.put(
  "/email-templates/:key",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    const key = req.params.key;

    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return res.status(400).json({ message: "Invalid template data", errors });
    }

    const { subject, body } = parsed.data;

    try {
      const updated = await prisma.emailTemplate.update({
        where: { key },
        data: { subject, body },
      });
      res.json({ template: updated });
    } catch (err: any) {
      console.error(err);

      // Not found
      if (err?.code === "P2025") {
        return res.status(404).json({ message: "Template not found" });
      }

      res.status(400).json({ message: "Failed to update template" });
    }
  }
);

// DELETE /api/admin/email-templates/:key
router.delete(
  "/email-templates/:key",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res) => {
    const key = req.params.key;

    try {
      await prisma.emailTemplate.delete({ where: { key } });
      res.json({ ok: true });
    } catch (err: any) {
      console.error(err);

      // Not found
      if (err?.code === "P2025") {
        return res.status(404).json({ message: "Template not found" });
      }

      res.status(500).json({ message: "Failed to delete template" });
    }
  }
);

export default router;
