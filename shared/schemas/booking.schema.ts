// shared/booking/schemas.ts
import { z } from "zod";

/* ===========================
   BOOKING STATUSES
   =========================== */

export const bookingStatusEnum = z.enum(["pending", "confirmed", "cancelled"]);

/* ===========================
   HELPERS
   =========================== */

const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");

/**
 * Keep phone validation logic in one place.
 * IMPORTANT: This runs inside superRefine so the base schema stays a "pure object"
 * (needed because Zod v4 forbids .omit() on schemas with refinements/effects).
 */
function validatePhone(raw: string, ctx: z.RefinementCtx) {
  const cleaned = digitsOnly(raw);
  if (cleaned.length < 10 || cleaned.length > 15) {
    ctx.addIssue({
      code: "custom",
      message: "Please enter a valid phone number",
      path: ["guestPhone"],
    });
  }
}

/* ===========================
   BASE BOOKING OBJECT (PURE)
   =========================== */
/**
 * ✅ PURE object schema: no transform/refine/superRefine.
 * This is the one we can safely .omit() / .pick() from in Zod v4.
 */
export const bookingBaseObjectSchema = z
  .object({
    propertyId: z.coerce
      .number()
      .int("Property ID must be an integer")
      .positive("Property ID must be positive"),

    // frontend uses YYYY-MM-DD strings, backend can still parse to Date
    startDate: z.string().regex(ymdRegex, "Start date must be YYYY-MM-DD"),
    endDate: z.string().regex(ymdRegex, "End date must be YYYY-MM-DD"),

    guestName: z.string().min(2, "Guest name must be at least 2 characters"),
    guestEmail: z.string().email("Invalid email"),

    // Keep as plain string here; validation happens in superRefine
    guestPhone: z.string(),

    adults: z.coerce.number().int().min(1, "At least 1 adult is required"),
    children: z.coerce.number().int().min(0, "Children cannot be negative"),
    babies: z.coerce.number().int().min(0, "Babies cannot be negative"),
    useCredit: z.coerce.boolean().optional().default(false),

    // only used on backend; omitted for create
    totalPrice: z.coerce
      .number()
      .int("Total price must be an integer")
      .positive("Total price must be positive"),

    // Optional in input; DB has default "pending"
    status: bookingStatusEnum.optional(),
  })
  .strict();

/* ===========================
   BASE BOOKING SCHEMA (WITH RULES)
   =========================== */
/**
 * ✅ Adds cross-field validation (dates/guests/phone) on top of the pure object.
 * Use this when you want the "full booking" validation logic.
 */
export const bookingBaseSchema = bookingBaseObjectSchema.superRefine((data, ctx) => {
  // Date logic
  const start = new Date(`${data.startDate}T00:00:00.000Z`);
  const end = new Date(`${data.endDate}T00:00:00.000Z`);

  if (isNaN(start.getTime())) {
    ctx.addIssue({ code: "custom", message: "Invalid start date", path: ["startDate"] });
  }

  if (isNaN(end.getTime())) {
    ctx.addIssue({ code: "custom", message: "Invalid end date", path: ["endDate"] });
  }

  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
    ctx.addIssue({ code: "custom", message: "End date must be after start date", path: ["endDate"] });
  }

  // Babies (<2) are NOT counted in guests.
  const countedGuests = (data.adults ?? 0) + (data.children ?? 0);
  if (countedGuests < 1) {
    ctx.addIssue({
      code: "custom",
      message: "At least 1 guest (adult/child) is required",
      path: ["adults"],
    });
  }

  // Phone logic (validate digits length)
  validatePhone(data.guestPhone, ctx);
});

/* ===========================
   CREATE BOOKING SCHEMA
   =========================== */
/**
 * ✅ Derive from the PURE object schema, then apply refinements.
 * This prevents the Zod v4 ".omit cannot be used on refined objects" crash.
 */
export const createBookingSchema = bookingBaseObjectSchema
  .omit({ totalPrice: true, status: true })
  .superRefine((data, ctx) => {
    // Reuse the same rules as base (minus the omitted fields)
    const start = new Date(`${data.startDate}T00:00:00.000Z`);
    const end = new Date(`${data.endDate}T00:00:00.000Z`);

    if (isNaN(start.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid start date", path: ["startDate"] });
    }

    if (isNaN(end.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid end date", path: ["endDate"] });
    }

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      ctx.addIssue({ code: "custom", message: "End date must be after start date", path: ["endDate"] });
    }

    const countedGuests = (data.adults ?? 0) + (data.children ?? 0);
    if (countedGuests < 1) {
      ctx.addIssue({
        code: "custom",
        message: "At least 1 guest (adult/child) is required",
        path: ["adults"],
      });
    }

    validatePhone(data.guestPhone, ctx);
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/* ===========================
   UPDATE BOOKING SCHEMA
   =========================== */

export const updateBookingSchema = bookingBaseObjectSchema.partial();
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

/* ===========================
   PHONE NORMALIZATION (optional helper)
   =========================== */
/**
 * If you want to normalize phone numbers before saving to DB:
 */
export const normalizeGuestPhone = (raw: string) => digitsOnly(raw);
