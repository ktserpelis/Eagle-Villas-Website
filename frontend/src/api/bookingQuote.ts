import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export type BookingQuoteInput = {
  propertyId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  adults: number;
  children: number;
  babies: number;
  useCredit: boolean;
};

export type BookingQuoteResponse = {
  priceSummary: {
    currency: "eur";
    nights: number;
    segments: Array<{
      periodId: number | null;
      from: string;
      to: string;
      nights: number;
      nightlyPrice: number;
      segmentTotal: number;
    }>;
    baseTotalEur: number;
    weeklyDiscountAppliedBps: number | null;
    totalEur: number;

    grossTotalCents: number;
    creditsAppliedCents: number;
    cashDueNowCents: number;
    creditRefundable: boolean;
    refundPolicyAppliesTo: string;
  };
  creditsAppliedCents: number;
  payableCents: number;

  refundPolicy: {
    tiers: Array<{
      key: string;
      minDaysBefore: number;
      maxDaysBefore: number | null;
      label: string;
      description: string;
      refundBps: number;
      voucherBps: number;
    }>;
    daysBeforeCheckIn: number;
    applicableTier: {
      key: string;
      minDaysBefore: number;
      maxDaysBefore: number | null;
      label: string;
      description: string;
      refundBps: number;
      voucherBps: number;
    };
    appliesTo: "cash_paid_to_stripe_only";
  };
};


export function useBookingQuote(input: BookingQuoteInput | null) {
  return useQuery({
    queryKey: ["bookingQuote", input],
    queryFn: async () => {
      const res = await api.post<BookingQuoteResponse>("/bookings/quote", input);
      return res.data;
    },
    enabled: !!input,
  });
}
