// backend/src/controllers/authController.ts

import { Request, Response } from "express";
import * as authService from "../services/authService.js";
import { prisma } from "../prismaClient.js";
import { loginSchema, registerBodySchema } from "@shared/schemas/auth.schema.js";
import { sendTemplateEmail } from "../services/emailService.js";

/**
 * REGISTER
 *
 * Flow:
 * 1. Validate input using shared Zod schema
 * 2. Create user via authService
 * 3. Send welcome email (non-blocking)
 * 4. Return sanitized user + JWT token
 *
 * Email sending is intentionally non-blocking so that
 * registration does not fail if SMTP has an issue.
 */
export async function register(req: Request, res: Response) {
  try {
    // Validate request body
    const parsed = registerBodySchema.safeParse(req.body);

    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      return res.status(400).json({
        message: "Invalid registration data",
        errors: fieldErrors,
      });
    }

    const { name, email, password } = parsed.data;

    // Normalize empty string name to undefined so DB stores null
    const normalizedName =
      name && name.trim().length > 0 ? name.trim() : undefined;

    // Create user and generate token
    const { user, token } = await authService.register({
      name: normalizedName,
      email,
      password,
    });

    // Send welcome email using DB template (non-blocking)
    sendTemplateEmail("welcome", user.email, {
      name: user.name ?? "there",
    }).catch((err: unknown) => {
      if (err instanceof Error) {
        console.error("Welcome email failed:", err.message);
      } else {
        console.error("Welcome email failed:", err);
      }
    });

    // Return response
    return res.status(201).json({
      message: "User registered",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(400).json({ message: "Registration failed" });
  }
}

/**
 * LOGIN
 *
 * 1. Validate input
 * 2. Authenticate via authService
 * 3. Return sanitized user + JWT
 */
export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      return res.status(400).json({
        message: "Invalid login data",
        errors: fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const { user, token } = await authService.login({ email, password });

    return res.json({
      message: "Logged in",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(400).json({ message: "Login failed" });
  }
}

/**
 * LOGOUT
 *
 * Stateless JWT logout.
 * Client simply discards the token.
 */
export async function logout(_req: Request, res: Response) {
  return res.json({ message: "Logged out" });
}

/**
 * ME
 *
 * Returns authenticated user's basic profile data.
 */
export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch {
    return res.status(500).json({ message: "Failed to load user" });
  }
}
