// src/middleware/optionalAuthMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js"; // same verifyToken you use in authMiddleware

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return next(); // no auth → proceed as guest
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(); // bad header → treat as guest, don't error
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role };
  } catch {
    // invalid token → just ignore and treat as guest
  }

  return next();
}
