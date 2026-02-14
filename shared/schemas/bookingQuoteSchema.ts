import { z } from "zod";
import { bookingBaseObjectSchema } from "./booking.schema.js";

/**
 * Quote schema:
 * Same base fields as booking, but no guest contact fields required.
 */
export const bookingQuoteSchema = bookingBaseObjectSchema
  .omit({
    guestName: true,
    guestEmail: true,
    guestPhone: true,
    totalPrice: true,
    status: true,
  })
  .strict();

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
