import { z } from "zod";

export const upsertBookingComIcalSchema = z.object({
  icalUrl: z.string().url("Must be a valid URL"),
  isEnabled: z.boolean().optional(),
});
