// src/components/BookingForm.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createBookingSchema } from "@shared/schemas/booking.schema"; 
import { useCreateBooking } from "../api/booking";
import { getApiErrorMessage } from "../api/apiError";

/**
 * Props required to create a booking.
 * These are provided by BookingPage, which reads them from the URL query:
 * /properties/:slug/book?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
type BookingFormProps = {
  propertyId: number;
  maxGuests: number;
  initialStartDate?: string; // YYYY-MM-DD
  initialEndDate?: string; // YYYY-MM-DD
};

/**
 * Client-side validation errors (Zod flatten result).
 */
type FieldErrors = {
  startDate?: string;
  endDate?: string;

  adults?: string;
  children?: string;
  babies?: string;

  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;

  useCredit?: string;
};

export function BookingForm({
  propertyId,
  maxGuests,
  initialStartDate,
  initialEndDate,
}: BookingFormProps) {
  const navigate = useNavigate();

  /* -----------------------------
     Local form state
     ----------------------------- */
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");

  // Guest breakdown
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);

  // Optional credit usage
  const [useCredit, setUseCredit] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [note, setNote] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * If BookingPage query params change (e.g. user navigates again),
   * keep the form in sync.
   */
  useEffect(() => {
    setStartDate(initialStartDate ?? "");
  }, [initialStartDate]);

  useEffect(() => {
    setEndDate(initialEndDate ?? "");
  }, [initialEndDate]);

  const { isPending, isError, error } = useCreateBooking();

  const apiErrorMessage = useMemo(() => {
    if (!isError) return null;
    return getApiErrorMessage(error, "Could not create booking.");
  }, [isError, error]);

  // Treat 401 and 403 as auth errors (you saw 403 in logs)
  const isLoginError = useMemo(() => {
    const anyErr = error as any;
    const status = anyErr?.response?.status;
    return status === 401 || status === 403;
  }, [error]);

  /**
   * Submit handler:
   * 1) UI-level max guests: adults + children must be 1..maxGuests (babies don't count)
   * 2) Validate with shared Zod schema (expects date-only strings and coerces numbers)
   * 3) Call backend. Backend returns { booking, checkoutUrl, ... }
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    // UI-level max guest constraint: babies do NOT count
    const countedGuests = adults + children;
    if (countedGuests < 1 || countedGuests > maxGuests) {
      setFieldErrors((prev) => ({
        ...prev,
        adults: `Guests (adults + children) must be between 1 and ${maxGuests}. Babies don’t count.`,
      }));
      return;
    }

    /**
     * Validate input using shared schema.
     * - Schema expects YYYY-MM-DD
     * - adults/children/babies are coerced (safe)
     * - guestPhone is normalized by schema transform (digits only)
     */
    const result = createBookingSchema.safeParse({
      propertyId,
      startDate,
      endDate,
      guestName,
      guestEmail,
      guestPhone,
      adults,
      children,
      babies,
      useCredit,
    });

    if (!result.success) {
      const flattened = result.error.flatten();

      // superRefine errors can show up here
      const general = flattened.formErrors?.[0];
      if (general) setFormError(general);

      setFieldErrors({
        startDate: flattened.fieldErrors.startDate?.[0],
        endDate: flattened.fieldErrors.endDate?.[0],

        adults: flattened.fieldErrors.adults?.[0],
        children: flattened.fieldErrors.children?.[0],
        babies: flattened.fieldErrors.babies?.[0],

        guestName: flattened.fieldErrors.guestName?.[0],
        guestEmail: flattened.fieldErrors.guestEmail?.[0],
        guestPhone: flattened.fieldErrors.guestPhone?.[0],

        useCredit: flattened.fieldErrors.useCredit?.[0],
      });

      // Useful while testing
      // eslint-disable-next-line no-console
      console.log("BOOKING VALIDATION FAILED", flattened);
      return;
    }

    /**
     * Summary step:
     * - Do NOT create the booking here.
     * - We send the validated draft to /booking/summary,
     *   where the backend quote endpoint provides authoritative totals.
     */
    navigate("/booking/summary", {
      state: {
        draft: {
          slug: (window.location.pathname.split("/properties/")[1] || "").split("/")[0], // pragmatic slug extraction
          propertyId: result.data.propertyId,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          adults: result.data.adults,
          children: result.data.children,
          babies: result.data.babies,
          guestName: result.data.guestName,
          guestEmail: result.data.guestEmail,
          guestPhone: result.data.guestPhone,
          useCredit: result.data.useCredit,
          note: note.trim() || undefined,
        },
      },
    });
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Complete your booking
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            You will be redirected to Stripe to pay securely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-900">
                Check-in
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              />
              <FieldError msg={fieldErrors.startDate} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-900">
                Check-out
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              />
              <FieldError msg={fieldErrors.endDate} />
            </label>
          </div>

          {/* Guests breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-900">
                Adults
              </span>
              <input
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              />
              <FieldError msg={fieldErrors.adults} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-900">
                Children
              </span>
              <input
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              />
              <FieldError msg={fieldErrors.children} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-900">
                Babies (&lt;2)
              </span>
              <input
                type="number"
                min={0}
                value={babies}
                onChange={(e) => setBabies(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              />
              <FieldError msg={fieldErrors.babies} />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            Max guests: {maxGuests} (adults + children). Babies are allowed and
            don’t count.
          </p>

          {/* Optional credit usage */}
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="checkbox"
              checked={useCredit}
              onChange={(e) => setUseCredit(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-900">
              Use available credit (if any)
            </span>
          </label>
          <FieldError msg={fieldErrors.useCredit} />

          {/* Guest details */}
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">
              Full name
            </span>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              placeholder="Your name"
            />
            <FieldError msg={fieldErrors.guestName} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-900">Email</span>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              placeholder="you@email.com"
            />
            <FieldError msg={fieldErrors.guestEmail} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-900">Phone</span>
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              placeholder="+30 ..."
            />
            <FieldError msg={fieldErrors.guestPhone} />
          </label>

          {/* Optional note */}
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">
              Note (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-300"
              rows={3}
              placeholder="Any special requests?"
            />
          </label>

          {/* Form-level validation error (from superRefine) */}
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-base font-semibold text-amber-950 shadow-md shadow-amber-900/15 hover:bg-amber-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creating secure checkout..." : "Continue to payment"}
          </button>

          {/* API errors */}
          {apiErrorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{apiErrorMessage}</p>
              {isLoginError && (
                <p className="mt-1 text-sm text-red-700">
                  Please{" "}
                  <Link to="/login" className="font-semibold underline">
                    login
                  </Link>{" "}
                  to book and pay.
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
