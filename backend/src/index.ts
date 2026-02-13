/**
 * Application entry point.
 *
 * Responsibilities:
 * - Bootstraps Express
 * - Applies global middleware (security, parsing, logging)
 * - Mounts all API routes
 * - Mounts Stripe webhook with raw body support
 * - Starts background jobs (cron-like tasks)
 * - Starts Booking.com iCal sync loop
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { prisma } from "./prismaClient.js";
import { errorHandler } from "./midleware/errorHandler.js";

// Routes
import { propertyRouter } from "./routes/property.routes.js";
import { bookingRouter } from "./routes/booking.routes.js";
import { customerRouter } from "./routes/customer.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminEmailTemplatesRouter from "./routes/admin.email.routes.js";
import { adminPeriodsRouter } from "./routes/adminPeriods.routes.js";
import { adminExternalCalendarsRouter } from "./routes/admin.externalcalendar.route.js";
import { paymentsRouter } from "./routes/payment.routes.js";

// Jobs
import { syncBookingComForProperty } from "./services/bookingComIcalSync.js";
import { startExpirePendingBookingsJob } from "./jobs/expirePendingBookings.js";
import { adminReviewsRouter, propertyReviewsRouter, reviewsRouter } from "routes/review.routes.js";
import { publicStayGuideRouter } from "routes/public.stay-guide.routes.js";
import { adminStayGuideRouter } from "routes/admin.stayguide.routes.js";
import { refundsRouter } from "routes/payments.refunds.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

/* -------------------------------------------------------------------------- */
/*                               GLOBAL MIDDLEWARE                             */
/* -------------------------------------------------------------------------- */

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      callback(null, true);
    },
    credentials: true,
  })
);

/**
 * STRIPE WEBHOOK (RAW BODY) — MUST be BEFORE express.json()
 *
 * Stripe signature verification requires the raw request body (Buffer).
 * We mount the exact endpoint here so:
 * - the route is ALWAYS hit
 * - req.body is a Buffer (raw)
 * - we delegate to paymentsRouter, which contains the handler at POST /stripe/webhook
 */
app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => paymentsRouter(req, res, next)
);


/**
 *  Refund webhook BEFORE express.json()
 * - raw body required for Stripe signature verification
 * - IMPORTANT: only for this exact path
 */
app.post(
  "/api/payments/stripe/refund-webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Delegate to refundsRouter
    refundsRouter(req, res, next);
  }
);

/**
 * JSON parser for all NON-webhook routes
 */
app.use(express.json());

app.use(cookieParser());
app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use("/api", apiLimiter);

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                    */
/* -------------------------------------------------------------------------- */

app.use("/api/properties", propertyRouter);
app.use("/api/bookings", bookingRouter);

/**
 * Payments router
 * - Webhook uses raw body (above)
 * - Other payment routes use JSON
 */
app.use("/api/payments", paymentsRouter);
app.use("/api/payments", refundsRouter);

app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRouter);
app.use("/api/reviews", reviewsRouter);

app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminEmailTemplatesRouter);
app.use("/api/admin", adminExternalCalendarsRouter);
app.use("/api/admin", adminPeriodsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/admin/reviews", adminReviewsRouter);
app.use("/api", propertyReviewsRouter);
app.use("/api/public/stay-guide", publicStayGuideRouter);
app.use("/api/admin/stay-guide", adminStayGuideRouter);


/* -------------------------------------------------------------------------- */
/*                              ERROR HANDLING                                 */
/* -------------------------------------------------------------------------- */

app.use(errorHandler);

/* -------------------------------------------------------------------------- */
/*                               SERVER START                                  */
/* -------------------------------------------------------------------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
  startExpirePendingBookingsJob();
});

/* -------------------------------------------------------------------------- */
/*                     BOOKING.COM ICAL SYNC (EVERY 15 MIN)                    */
/* -------------------------------------------------------------------------- */

let syncRunning = false;

setInterval(async () => {
  if (syncRunning) return;
  syncRunning = true;

  try {
    const calendars = await prisma.externalCalendar.findMany({
      where: { provider: "BOOKING_COM", isEnabled: true },
      select: { propertyId: true },
    });

    for (const c of calendars) {
      try {
        await syncBookingComForProperty(c.propertyId);
      } catch (e) {
        console.error("iCal sync error", c.propertyId, e);
      }
    }
  } finally {
    syncRunning = false;
  }
}, 15 * 60 * 1000);
