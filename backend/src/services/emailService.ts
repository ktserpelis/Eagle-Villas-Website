import nodemailer from "nodemailer";
import { prisma } from "../prismaClient.js";

// create transporter from env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,         // smtp.gmail.com
  port: Number(process.env.SMTP_PORT), // 465
  secure: false,                        // ✅ SSL (secure socket)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type TemplateVars = Record<string, string | number | null | undefined>;

function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (match, key) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export async function sendTemplateEmail(
  key: string,
  to: string,
  vars: TemplateVars
) {
  // 1. load template from DB
  const template = await prisma.emailTemplate.findUnique({
    where: { key },
  });

  if (!template) {
    throw new Error(`Email template not found for key: ${key}`);
  }

  const subject = renderTemplate(template.subject, vars);
  const body = renderTemplate(template.body, vars);

  // 2. send email
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
    to,
    subject,
    text: body,
    // if you want HTML, you can add html: bodyHtml
  });
}
