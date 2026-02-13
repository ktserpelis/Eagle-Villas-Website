import { z } from "zod";
import { createBookingSchema } from "./booking.schema.js";

/**
 * Quote schema:
 * Uses the same base rules as booking creation (dates, guests, credit),
 * but does not require guest contact fields because no booking is created yet.
 */
export const bookingQuoteSchema = createBookingSchema
  .omit({
    guestName: true,
    guestEmail: true,
    guestPhone: true,
  })
  .strict();

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
