import { Router } from "express";
import { contactSchema } from "@shared/schemas/contact.schema.js";
import { validateBody } from "../midleware/validateBody.js";
import { prisma } from "../prismaClient.js";
import { sendTemplateEmail } from "../services/emailService.js";

export const contactRouter = Router();

contactRouter.post(
  "/",
  validateBody(contactSchema),
  async (req, res, next) => {
    try {
      const { fullName, email, phone, message } = req.body;

      // 1) Save in DB
      const contact = await prisma.contactMessage.create({
        data: {
          fullName,
          email,
          phone: phone || null,
          message,
        },
      });

      // 2) Prepare vars for templates
      const vars = {
        fullName,
        email,
        phone: phone || "",
        message,
        createdAt: contact.createdAt.toISOString(),
      };

      // 3) Email admin (best-effort)
      const adminEmail = process.env.CONTACT_ADMIN_EMAIL || process.env.SMTP_USER;
      if (adminEmail) {
        sendTemplateEmail("contact_admin_notification", adminEmail, vars).catch(
          (err) => {
            console.warn("Failed to send admin contact email:", err);
          }
        );
      }

      // 4) Email guest confirmation (best-effort)
      sendTemplateEmail("contact_user_confirmation", email, vars).catch(
        (err) => {
          console.warn("Failed to send user contact email:", err);
        }
      );

      return res.status(200).json({
        message: "Message received",
      });
    } catch (err) {
      next(err);
    }
  }
);
