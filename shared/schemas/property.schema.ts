import { z } from "zod";

export const timeHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");

export const propertyFeatureKeyEnum = z.enum([
  "WHEELCHAIR",
  "CRIB",
  "PETS_ALLOWED",
  "PARKING",
  "REFUND_POLICY",
  "WIFI",
  "POOL",
  "SEA_VIEW",
  "AIR_CONDITIONING",
  "BBQ",
  "HEATING",
  "WASHER",
  "KITCHEN",
  "WORKSPACE",
]);

const stringList = z.array(z.string().trim().min(1)).max(200);
const imageUrlOrPath = z
  .string()
  .trim()
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
    "Expected an absolute URL (https://...) or a site path starting with /"
  );

export const createPropertySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  maxGuests: z.number().int().positive(),
  pricePerNight: z.number().int().nonnegative(),

  images: z.array(imageUrlOrPath).optional(),

  bookingComIcalUrl: z.string().url().optional(),
  bookingComIcalEnabled: z.boolean().optional(),

  // ✅ optional content
  longDescription: z.string().min(1).optional(),
  checkInFrom: timeHHMM.optional(),
  checkInTo: timeHHMM.optional(),
  checkOutUntil: timeHHMM.optional(),

  // ✅ optional pricing rules
  weeklyDiscountBps: z.number().int().min(0).max(10000).optional(),
  cleaningFeeCents: z.number().int().min(0).optional(),
  minNights: z.number().int().min(1).optional(),

  // ✅ optional specs
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  areaSqm: z.number().int().min(0).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // ✅ new lists
  featureKeys: z.array(propertyFeatureKeyEnum).max(50).optional(),
  amenities: stringList.optional(),
  policies: stringList.optional(),

  // ✅ Postgres tags
  tags: stringList.optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

