import { z } from "zod";

/*
  PURE OBJECT SCHEMA
  No superRefine, no transform, no refine.
  Safe for .omit() and .partial().
*/
export const bookingPeriodObjectSchema = z
  .object({
    propertyId: z.number().int().positive(),

    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),

    isOpen: z.boolean().optional().default(true),

    standardNightlyPrice: z.number().int().min(0),

    weeklyDiscountPercentBps: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .optional()
      .nullable(),

    weeklyThresholdNights: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(7),

    minNights: z.number().int().min(1).optional().default(1),
    maxGuests: z.number().int().min(1),

    name: z.string().max(80).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .strict();

/*
  CREATE SCHEMA
  Refinements are applied AFTER the base object.
*/
export const createBookingPeriodSchema =
  bookingPeriodObjectSchema.superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid start date",
        path: ["startDate"],
      });
    }

    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid end date",
        path: ["endDate"],
      });
    }

    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end <= start
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

/*
  UPDATE SCHEMA
  Omit and partial from PURE object,
  then apply refinement conditionally.
*/
export const updateBookingPeriodSchema = bookingPeriodObjectSchema
  .omit({ propertyId: true })
  .partial()
  .superRefine((data, ctx) => {
    if (typeof data.startDate === "string" && typeof data.endDate === "string") {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (Number.isNaN(start.getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid start date",
          path: ["startDate"],
        });
      }

      if (Number.isNaN(end.getTime())) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid end date",
          path: ["endDate"],
        });
      }

      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end <= start
      ) {
        ctx.addIssue({
          code: "custom",
          message: "End date must be after start date",
          path: ["endDate"],
        });
      }
    }
  });

export type CreateBookingPeriodInput =
  z.infer<typeof createBookingPeriodSchema>;

export type UpdateBookingPeriodInput =
  z.infer<typeof updateBookingPeriodSchema>;
