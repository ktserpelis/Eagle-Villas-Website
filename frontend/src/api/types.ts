// src/types/types.ts

/* ============================================================
   CORE DOMAIN TYPES
   ============================================================ */

// src/api/types.ts

export type PropertyImage = {
  id: number;
  propertyId: number;
  url: string;
  sortOrder: number;
};

export type PropertyPolicy = {
  id: number;
  propertyId: number;
  label: string;
  sortOrder?: number | null;
};

export type PropertyFeature = {
  id: number;
  propertyId: number;
  key: string; // PropertyFeatureKey on backend; keep string on frontend unless you mirror the enum
  sortOrder?: number | null;
};

export type PropertyAmenity = {
  id: number;
  propertyId: number;
  label: string;
  sortOrder?: number | null;
};

export type Property = {
  id: number;
  title: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  country: string;
  maxGuests: number;
  pricePerNight: number;

  // optional content
  longDescription?: string | null;
  checkInFrom?: string | null;   // "14:00"
  checkInTo?: string | null;     // "22:00"
  checkOutUntil?: string | null; // "11:00"

  // optional pricing rules
  weeklyDiscountBps?: number | null; // 0..10000
  cleaningFeeCents?: number | null;
  minNights?: number | null;

  // optional specs
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  latitude?: number | null;
  longitude?: number | null;

  // tags array
  tags: string[];

  // relations (include whichever your API returns; make optional to avoid TS breaks)
  images: PropertyImage[];
  features?: PropertyFeature[];
  amenities?: PropertyAmenity[];
  policies?: PropertyPolicy[];

  // timestamps
  createdAt: string; // ISO string from API
};


export type Booking = {
  id: number;
  propertyId: number;
  userId: number | null;

  startDate: string;
  endDate: string;

  guestName: string;
  guestEmail: string;
  guestPhone: string;

  guestsCount: number;
  totalPrice: number;

  status: string;
  createdAt: string;

  property?: Property;
};

/* ============================================================
   BOOKING CREATION (CUSTOMER / ADMIN)
   ============================================================ */

/**
 * Payload the frontend sends to POST /bookings
 *
 * IMPORTANT:
 * - Dates are DATE-ONLY strings ("YYYY-MM-DD") to avoid timezone drift.
 * - Babies do NOT count toward maxGuests; backend can compute guestsCount if needed.
 * - useCredit is optional; when omitted it should behave as false.
 */
export type CreateBookingPayload = {
  propertyId: number;

  // date-only (preferred) to avoid TZ/DST issues
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"

  // guest breakdown
  adults: number;
  children: number;
  babies: number;

  // optional credit usage
  useCredit?: boolean;

  // guest info
  guestName: string;
  guestEmail: string;
  guestPhone: string;

  note?: string;
};

/**
 * What the backend returns after creation:
 * - booking is the newly created booking record
 * - checkoutUrl is returned when Stripe checkout should begin
 */
export type CreateBookingResponse = {
  booking: Pick<
    Booking,
    | "id"
    | "propertyId"
    | "startDate"
    | "endDate"
    | "guestsCount"
    | "guestName"
    | "guestEmail"
    | "totalPrice"
    | "status"
  >;
  checkoutUrl: string | null;
};

/**
 * BookingWithProperty
 *
 * Dashboard and customer-facing booking UIs assume the related property
 * is included by the backend (title, city, images, slug, etc.).
 *
 * This type tightens the contract by requiring `property` to be present.
 * If an endpoint does not include `property`, it should use `Booking` instead.
 */
export type BookingWithProperty = Omit<Booking, "property"> & {
  property: Property;
};

/**
 * CustomerBookingsResponse
 *
 * Response shape for:
 * GET /api/customer/bookings
 *
 * The dashboard UI assumes each booking includes its `property` relation
 * (title, slug, city, images, etc.). For that reason, this response uses
 * BookingWithProperty instead of the looser Booking type.
 */
export type CustomerBookingsResponse = {
  bookings: BookingWithProperty[];
};


/* ============================================================
   ADMIN BOOKINGS (CALENDAR / DASHBOARD)
   ============================================================ */

export interface AdminPropertyImage {
  id: number;
  url: string;
  sortOrder: number;
}

export interface AdminProperty {
  id: number;
  title: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  country: string;
  pricePerNight: number;
  maxGuests: number;
  images: AdminPropertyImage[];
  createdAt: string;
}

export interface AdminPropertyListResponse {
  properties: AdminProperty[];
}

export type AdminBooking =
  | {
      source: "DIRECT";
      id: number;
      propertyId: number;
      userId: number | null;
      startDate: string;
      endDate: string;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      guestsCount: number;
      totalPrice: number;
      status: string;
      createdAt: string;
      property: {
        id: number;
        title: string;
        city: string;
        country: string;
      };
      user: {
        id: number;
        name: string | null;
        email: string;
      } | null;

      /**  booking pricing breakdown JSON (stored on Booking.priceBreakdown) */
      priceBreakdown?: any | null;

      /** payment snapshot (cash-only logic lives here) */
      payment?: {
        provider: string;
        status: string;
        amountCents: number;
        refundedCents: number;
        creditsAppliedCents: number;
        currency: string;
      } | null;

      /** computed cash refunded (prefer payment.refundedCents if present) */
      refundedTotalCents?: number;
    }
  | {
      source: "BOOKING_COM";
      id: number;
      propertyId: number;
      startDate: string;
      endDate: string;
      summary?: string | null;
      status: "confirmed";
      createdAt: string;
      property: {
        id: number;
        title: string;
        city: string;
        country: string;
      };
    }
  | {
      source: "MANUAL";
      id: number;
      propertyId: number;
      startDate: string;
      endDate: string;
      reason?: string | null;
      status: "blocked";
      createdAt: string;
      property: {
        id: number;
        title: string;
        city: string;
        country: string;
      };
    };


export type AdminBookingListResponse = {
  bookings: AdminBooking[];
};

/* ============================================================
   CALENDAR (PUBLIC / ADMIN)
   ============================================================ */

export type CalendarItemPublic =
  | { source: "DIRECT"; id: number; startDate: string; endDate: string; status: string }
  | { source: "BOOKING_COM"; id: number; startDate: string; endDate: string; summary?: string | null }
  | { source: "MANUAL"; id: number; startDate: string; endDate: string; reason?: string | null };

export type CalendarItemAdmin =
  | {
      source: "DIRECT";
      id: number;
      startDate: string;
      endDate: string;
      status: string;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      guestsCount: number;
      totalPrice: number;
      createdAt: string;
    }
  | { source: "BOOKING_COM"; id: number; startDate: string; endDate: string; summary?: string | null }
  | { source: "MANUAL"; id: number; startDate: string; endDate: string; reason?: string | null };

  export type PropertyCalendarResponse = {
  blocks: any[];
  dailyPrices: Record<string, number>;
  dailyOpen: Record<string, boolean>;
  defaultNightlyPrice: number;
  hasAnyPeriods: boolean;
};


/* ============================================================
   EMAIL TEMPLATES
   ============================================================ */

export type EmailTemplate = {
  id: number;
  key: string;
  subject: string;
  body: string;
  updatedAt: string;
};

export type EmailTemplatesResponse = {
  templates: EmailTemplate[];
};