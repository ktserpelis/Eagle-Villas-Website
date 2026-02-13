import { useEffect, useMemo, useState } from "react";
import {
  adminCreatePeriod,
  adminDeletePeriod,
  adminFetchAdminCalendar,
  adminFetchPeriods,
  adminPatchPeriod,
} from "../../api/adminPeriods";

import { useProperties } from "../../api/properties";

import AdminAvailabilityCalendar from "../../components/admin/AdminAvailabilityCalendar";
import AdminPeriodsToolbar from "../../components/admin/periods/AdminPeriodsToolBar.tsx";
import PeriodFormCard, { type PeriodFormState } from "../../components/admin/periods/PeriodFormCard.tsx";
import PeriodsListCard from "../../components/admin/periods/PeriodsListCard.tsx";
import ErrorBanner from "../../components/admin/periods/ErrorBanner";
import StatPills from "../../components/admin/periods/StatPills.tsx";

type Period = any;
type AdminCalendarPayload = { blocks: any[]; periods: Period[] };

export default function AdminPeriodsPage() {
  const [propertyId, setPropertyId] = useState(1);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-03-31");

  const [periods, setPeriods] = useState<Period[]>([]);
  const [calendar, setCalendar] = useState<AdminCalendarPayload | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<PeriodFormState>({
    startDate: "2026-01-10",
    endDate: "2026-01-20",
    isOpen: true,
    standardNightlyPrice: 200,
    weeklyDiscountPercentBps: 1000,
    weeklyThresholdNights: 7,
    minNights: 2,
    maxGuests: 6,
    name: "",
    notes: "",
  });

  const { data: propertiesData, isLoading: propertiesLoading } = useProperties();
  const properties = propertiesData ?? [];

  // ✅ selected property (includes pricePerNight)
  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === propertyId) ?? null;
  }, [properties, propertyId]);

  // ✅ fallback nightly price for calendar display (no period => show this)
  const fallbackNightlyPrice = selectedProperty?.pricePerNight ?? 0;

  // When properties load, make sure propertyId is valid
  useEffect(() => {
    if (properties.length > 0) {
      const exists = properties.some((p) => p.id === propertyId);
      if (!exists) setPropertyId(properties[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertiesData]);

  const createPayload = useMemo(() => ({ ...form, propertyId }), [form, propertyId]);

  const counts = useMemo(() => {
    const open = periods.filter((p) => p.isOpen).length;
    return { total: periods.length, open, closed: periods.length - open };
  }, [periods]);

  async function refresh() {
    setErr(null);
    try {
      const [p, c] = await Promise.all([
        adminFetchPeriods(propertyId),
        adminFetchAdminCalendar(propertyId, from, to),
      ]);
      setPeriods(p);
      setCalendar(c);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, from, to]);

  async function onCreate() {
    setBusy(true);
    setErr(null);
    try {
      await adminCreatePeriod(createPayload);
      await refresh();
      setForm((p) => ({ ...p, name: "", notes: "" }));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleOpen(p: Period) {
    setBusy(true);
    setErr(null);
    try {
      await adminPatchPeriod(p.id, { isOpen: !p.isOpen });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(p: Period) {
    const sure = window.confirm("Delete this period?");
    if (!sure) return;

    setBusy(true);
    setErr(null);
    try {
      await adminDeletePeriod(p.id);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    /**
     * Top padding (pt-20) prevents overlap with a fixed navbar.
     *
     * Assumes navbar height ≈ 64px (h-16).
     * If your navbar is taller/shorter:
     * - h-14 → pt-16
     * - h-16 → pt-20 (recommended)
     * - h-20 → pt-24
     */
    <section className="pt-20 bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Periods</h2>
        <p className="text-sm text-slate-500">
          Define availability + pricing rules. Bookings may span multiple periods.
        </p>
      </div>

      <AdminPeriodsToolbar
        properties={properties}
        propertyId={propertyId}
        setPropertyId={setPropertyId}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        busy={busy}
        loading={propertiesLoading}
        onRefresh={refresh}
      />

      {err ? <ErrorBanner message={err} /> : null}

      <StatPills total={counts.total} open={counts.open} closed={counts.closed} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-6">
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            Availability calendar
            {selectedProperty ? (
              <span className="ml-2 text-sm font-medium text-slate-500">
                (Default: €{fallbackNightlyPrice}/night)
              </span>
            ) : null}
          </h3>

          <AdminAvailabilityCalendar
            blocks={calendar?.blocks}
            periods={periods}
            fallbackNightlyPrice={fallbackNightlyPrice}
          />
        </div>

        <PeriodFormCard
          value={form}
          busy={busy}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={onCreate}
        />
      </div>

      <PeriodsListCard periods={periods} onToggleOpen={onToggleOpen} onDelete={onDelete} />
    </section>
  );
}
