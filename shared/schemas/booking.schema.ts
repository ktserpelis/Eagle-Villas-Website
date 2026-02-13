// shared/booking/schemas.ts
import { z } from "zod";

/* ===========================
   BOOKING STATUSES
   =========================== */

export const bookingStatusEnum = z.enum(["pending", "confirmed", "cancelled"]);

/* ===========================
   BASE BOOKING SCHEMA
   =========================== */
const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;

const bookingBaseSchema = z.object({
  propertyId: z.coerce
    .number()
    .int("Property ID must be an integer")
    .positive("Property ID must be positive"),

  // frontend uses YYYY-MM-DD strings, backend can still parse to Date
  startDate: z.string().regex(ymdRegex, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(ymdRegex, "End date must be YYYY-MM-DD"),

  guestName: z.string().min(2, "Guest name must be at least 2 characters"),

  guestEmail: z.string().email("Invalid email"),

  guestPhone: z
  .string()
  .transform((s) => s.replace(/[^\d]/g, "")) // keep digits only
  .refine((s) => s.length >= 10 && s.length <= 15, "Please enter a valid phone number"),

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
});

/* ===========================
   CREATE BOOKING SCHEMA
   =========================== */

export const createBookingSchema = bookingBaseSchema
  .omit({ totalPrice: true, status: true })
  .superRefine((data, ctx) => {
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
    // countedGuests = adults + children must be >= 1
    const countedGuests = (data.adults ?? 0) + (data.children ?? 0);
    if (countedGuests < 1) {
      ctx.addIssue({
        code: "custom",
        message: "At least 1 guest (adult/child) is required",
        path: ["adults"],
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/* ===========================
   UPDATE BOOKING SCHEMA
   =========================== */

export const updateBookingSchema = bookingBaseSchema.partial();
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
