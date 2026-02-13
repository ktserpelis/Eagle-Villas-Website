// src/components/admin/AdminPropertiesSection.tsx
import React, { useState } from "react";

import {
  useAdminPropertiesQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useDeletePropertyMutation,
} from "../../api/admin";

import {
  PropertyFeaturePicker,
  normalizeFeatureKeys,
  type PropertyFeatureKey,
} from "../PropertyFeatureRegistry";

import type { AdminProperty } from "../../api/types";
import {
  createPropertySchema,
  updatePropertySchema,
  type CreatePropertyInput,
  type UpdatePropertyInput,
} from "@shared/schemas/property.schema";

type PropertyFormMode = "create" | "edit";
type FieldErrors = Record<string, string>;

const AdminPropertiesSection: React.FC = () => {
  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    isError: propertiesIsError,
    error: propertiesError,
  } = useAdminPropertiesQuery();

  const properties = propertiesData?.properties ?? [];

  const createPropertyMutation = useCreatePropertyMutation();
  const updatePropertyMutation = useUpdatePropertyMutation();
  const deletePropertyMutation = useDeletePropertyMutation();

  const [mode, setMode] = useState<PropertyFormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Core fields (required by the create schema)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [pricePerNight, setPricePerNight] = useState<number | "">("");
  const [maxGuests, setMaxGuests] = useState<number | "">("");
  const [imagesInput, setImagesInput] = useState("");

  /**
   * Extended property model fields (optional on backend).
   *
   * Notes:
   * - We still keep them controlled for a stable UX and predictable payload.
   * - On submit we convert empty values to `undefined` to match backend's optional semantics.
   */
  const [longDescription, setLongDescription] = useState("");
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const [checkOutUntil, setCheckOutUntil] = useState("");
  const [weeklyDiscountBps, setWeeklyDiscountBps] = useState<number | "">("");
  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [bathrooms, setBathrooms] = useState<number | "">("");
  const [areaSqm, setAreaSqm] = useState<number | "">("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [minNights, setMinNights] = useState<number | "">("");
  const [cleaningFeeCents, setCleaningFeeCents] = useState<number | "">("");
  /**
   * Feature keys are selected via icon toggles (not free text).
   * This guarantees keys match the backend enum and prevents invalid submissions.
   */
  const [featureKeys, setFeatureKeys] = useState<PropertyFeatureKey[]>([]);
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [policiesInput, setPoliciesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // ✅ NEW (optional Booking.com iCal)
  const [bookingComIcalUrl, setBookingComIcalUrl] = useState("");
  const [bookingComIcalEnabled, setBookingComIcalEnabled] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /**
   * Utility: parse textarea lists (one item per line).
   * We trim and drop empty lines to keep payload clean and deterministic.
   */
  const parseLines = (value: string) =>
    value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  /**
   * Utility: convert controlled numeric inputs into numbers or undefined.
   * Keeps backend patch semantics consistent:
   * - `undefined` => do not set / do not update.
   */
  const numOrUndefined = (v: number | "") => (v === "" ? undefined : Number(v));

  function resetForm() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setAddress("");
    setCity("");
    setCountry("");
    setPricePerNight("");
    setMaxGuests("");
    setImagesInput("");

    // Extended model fields
    setLongDescription("");
    setCheckInFrom("");
    setCheckInTo("");
    setCheckOutUntil("");
    setWeeklyDiscountBps("");
    setBedrooms("");
    setBathrooms("");
    setAreaSqm("");
    setLatitude("");
    setLongitude("");
    setMinNights("");
    setCleaningFeeCents("");
    setFeatureKeys([]);
    setAmenitiesInput("");
    setPoliciesInput("");
    setTagsInput("");

    // ✅ reset optional iCal inputs
    setBookingComIcalUrl("");
    setBookingComIcalEnabled(true);

    setFormError(null);
    setFieldErrors({});
  }

  function populateFormForEdit(property: AdminProperty) {
    setMode("edit");
    setEditingId(property.id);
    setTitle(property.title);
    setDescription(property.description);
    setAddress(property.address);
    setCity(property.city);
    setCountry(property.country);
    setPricePerNight(property.pricePerNight);
    setMaxGuests(property.maxGuests);
    setImagesInput(property.images.map((img) => img.url).join("\n"));

    /**
     * Extended fields are not guaranteed to exist in older payloads/types.
     * We use a safe `any` view here to avoid breaking the admin UI.
     */
    const p: any = property;
    setLongDescription(p.longDescription ?? "");
    setCheckInFrom(p.checkInFrom ?? "");
    setCheckInTo(p.checkInTo ?? "");
    setCheckOutUntil(p.checkOutUntil ?? "");
    setWeeklyDiscountBps(typeof p.weeklyDiscountBps === "number" ? p.weeklyDiscountBps : "");
    setBedrooms(typeof p.bedrooms === "number" ? p.bedrooms : "");
    setBathrooms(typeof p.bathrooms === "number" ? p.bathrooms : "");
    setAreaSqm(typeof p.areaSqm === "number" ? p.areaSqm : "");
    setLatitude(typeof p.latitude === "number" ? p.latitude : "");
    setLongitude(typeof p.longitude === "number" ? p.longitude : "");
    setMinNights(typeof p.minNights === "number" ? p.minNights : "");
    setCleaningFeeCents(typeof p.cleaningFeeCents === "number" ? p.cleaningFeeCents : "");
    /**
     * Features come from relation payload as [{ key: "WIFI" }, ...].
     * We normalize to ensure stable ordering and no duplicates.
     */
    const existingFeatureKeys: PropertyFeatureKey[] = Array.isArray(p.features)
      ? p.features.map((f: any) => f?.key).filter(Boolean)
      : [];
    setFeatureKeys(normalizeFeatureKeys(existingFeatureKeys));
    setAmenitiesInput(
      Array.isArray(p.amenities) ? p.amenities.map((a: any) => a.label).join("\n") : ""
    );
    setPoliciesInput(
      Array.isArray(p.policies) ? p.policies.map((x: any) => x.label).join("\n") : ""
    );
    setTagsInput(Array.isArray(p.tags) ? p.tags.map((t: any) => t.label).join("\n") : "");

    // ✅ you said you don't need to show existing iCal on edit
    setBookingComIcalUrl("");
    setBookingComIcalEnabled(true);

    setFormError(null);
    setFieldErrors({});
  }

  async function handleDeleteProperty(id: number) {
    const sure = window.confirm("Are you sure you want to delete this property?");
    if (!sure) return;

    try {
      await deletePropertyMutation.mutateAsync(id);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message ?? "Failed to delete property");
    }
  }

  const handleSubmitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const images = parseLines(imagesInput);
    const amenities = parseLines(amenitiesInput);
    const policies = parseLines(policiesInput);
    const tags = parseLines(tagsInput);

    /**
     * IMPORTANT:
     * - We only include optional fields when they are meaningfully provided.
     * - This keeps create/update aligned with the backend route that uses conditional spreads.
     */
    const rawInput: any = {
      title,
      description,
      address,
      city,
      country,
      pricePerNight: numOrUndefined(pricePerNight),
      maxGuests: numOrUndefined(maxGuests),
      images,

      // Optional scalars
      longDescription: longDescription.trim() ? longDescription.trim() : undefined,
      checkInFrom: checkInFrom.trim() ? checkInFrom.trim() : undefined,
      checkInTo: checkInTo.trim() ? checkInTo.trim() : undefined,
      checkOutUntil: checkOutUntil.trim() ? checkOutUntil.trim() : undefined,
      weeklyDiscountBps: numOrUndefined(weeklyDiscountBps),
      bedrooms: numOrUndefined(bedrooms),
      bathrooms: numOrUndefined(bathrooms),
      areaSqm: numOrUndefined(areaSqm),
      latitude: numOrUndefined(latitude),
      longitude: numOrUndefined(longitude),
      minNights: numOrUndefined(minNights),
      cleaningFeeCents: numOrUndefined(cleaningFeeCents),

      // Optional lists (only send if there is at least one value)
      featureKeys: featureKeys.length ? featureKeys : undefined,
      amenities: amenities.length ? amenities : undefined,
      policies: policies.length ? policies : undefined,
      tags: tags.length ? tags : undefined,

      // ✅ NEW (optional)
      bookingComIcalUrl: bookingComIcalUrl.trim() ? bookingComIcalUrl.trim() : undefined,
      bookingComIcalEnabled,
    };

    const schema = mode === "create" ? createPropertySchema : updatePropertySchema;
    const result = schema.safeParse(rawInput);

    if (!result.success) {
      const flattened = result.error.flatten();
      const fe: FieldErrors = {};

      // Flattened fieldErrors is a typed object; Object.entries avoids unsafe string indexing.
      for (const [key, messages] of Object.entries(flattened.fieldErrors) as Array<
        [string, string[] | undefined]
      >) {
        const msg = messages?.[0];
        if (msg) fe[key] = msg;
      }

      setFieldErrors(fe);
      return;
    }

    const data = result.data;

    try {
      if (mode === "create") {
        // In create mode we validate with createPropertySchema, so this is safe.
        await createPropertyMutation.mutateAsync(data as CreatePropertyInput);
      } else if (mode === "edit" && editingId != null) {
        // In edit mode we validate with updatePropertySchema, so this is safe.
        await updatePropertyMutation.mutateAsync({
          id: editingId,
          data: data as UpdatePropertyInput,
        });
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      setFormError(err?.response?.data?.message ?? "Failed to save property");

      const backendErrors = err?.response?.data?.errors;
      if (backendErrors && typeof backendErrors === "object") {
        const fe: FieldErrors = {};

        for (const [key, msgs] of Object.entries(backendErrors) as Array<
          [string, string[] | string | undefined]
        >) {
          if (Array.isArray(msgs) && msgs[0]) fe[key] = msgs[0];
          else if (typeof msgs === "string") fe[key] = msgs;
        }

        setFieldErrors(fe);
      }
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Properties</h2>
        <button
          type="button"
          onClick={resetForm}
          className="text-sm px-3 py-1 rounded border border-slate-300 hover:bg-slate-100"
        >
          New property
        </button>
      </div>

      {/* Property form */}
      <form
        onSubmit={handleSubmitProperty}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-slate-50"
      >
        {formError && (
          <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {formError}
          </div>
        )}

        {/* Validation errors (e.g. Zod) should be visible even if there is no formError. */}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="md:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
            <div className="font-semibold">Please fix the following:</div>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              {Object.entries(fieldErrors).map(([key, msg]) => (
                <li key={key}>
                  <span className="font-semibold">{key}:</span> {msg}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {fieldErrors.title && <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {fieldErrors.address && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.address}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          {fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          {fieldErrors.country && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.country}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price per night</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={pricePerNight}
            onChange={(e) => setPricePerNight(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {fieldErrors.pricePerNight && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.pricePerNight}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max guests</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={maxGuests}
            onChange={(e) => setMaxGuests(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {fieldErrors.maxGuests && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.maxGuests}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {fieldErrors.description && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Image URLs (one per line)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={imagesInput}
            onChange={(e) => setImagesInput(e.target.value)}
          />
          {fieldErrors.images && <p className="text-xs text-red-600 mt-1">{fieldErrors.images}</p>}
        </div>

        {/* Extended property model fields */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Long description (optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={4}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
          {(fieldErrors as any).longDescription && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).longDescription}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Check-in from (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. 15:00"
            value={checkInFrom}
            onChange={(e) => setCheckInFrom(e.target.value)}
          />
          {(fieldErrors as any).checkInFrom && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).checkInFrom}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Check-in to (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. 22:00"
            value={checkInTo}
            onChange={(e) => setCheckInTo(e.target.value)}
          />
          {(fieldErrors as any).checkInTo && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).checkInTo}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Check-out until (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. 11:00"
            value={checkOutUntil}
            onChange={(e) => setCheckOutUntil(e.target.value)}
          />
          {(fieldErrors as any).checkOutUntil && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).checkOutUntil}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Weekly discount (bps, optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. 500 = 5%"
            value={weeklyDiscountBps}
            onChange={(e) =>
              setWeeklyDiscountBps(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          {(fieldErrors as any).weeklyDiscountBps && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).weeklyDiscountBps}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bedrooms (optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {(fieldErrors as any).bedrooms && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).bedrooms}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bathrooms (optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {(fieldErrors as any).bathrooms && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).bathrooms}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Area (sqm, optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {(fieldErrors as any).areaSqm && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).areaSqm}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Min nights (optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={minNights}
            onChange={(e) => setMinNights(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {(fieldErrors as any).minNights && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).minNights}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cleaning fee (cents, optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={cleaningFeeCents}
            onChange={(e) =>
              setCleaningFeeCents(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          {(fieldErrors as any).cleaningFeeCents && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).cleaningFeeCents}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Latitude (optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {(fieldErrors as any).latitude && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).latitude}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Longitude (optional)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {(fieldErrors as any).longitude && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).longitude}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Features (optional)</label>

          <PropertyFeaturePicker value={featureKeys} onChange={setFeatureKeys} />

          {(fieldErrors as any).featureKeys && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).featureKeys}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Amenities (one per line, optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
            value={amenitiesInput}
            onChange={(e) => setAmenitiesInput(e.target.value)}
          />
          {(fieldErrors as any).amenities && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).amenities}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Policies (one per line, optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
            value={policiesInput}
            onChange={(e) => setPoliciesInput(e.target.value)}
          />
          {(fieldErrors as any).policies && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).policies}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Tags (one per line, optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          {(fieldErrors as any).tags && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).tags}</p>
          )}
        </div>

        {/* ✅ NEW: Booking.com iCal (optional) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Booking.com iCal URL (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Paste the Booking.com export .ics link"
            value={bookingComIcalUrl}
            onChange={(e) => setBookingComIcalUrl(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">Leave empty if you will set this up later.</p>

          <label className="mt-2 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bookingComIcalEnabled}
              onChange={(e) => setBookingComIcalEnabled(e.target.checked)}
            />
            Enable Booking.com sync
          </label>

          {/* these keys will exist after you add fields to your Zod schema */}
          {(fieldErrors as any).bookingComIcalUrl && (
            <p className="text-xs text-red-600 mt-1">{(fieldErrors as any).bookingComIcalUrl}</p>
          )}
        </div>

        <div className="md:col-span-2 flex gap-2 justify-end">
          {mode === "edit" && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
            className="px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {createPropertyMutation.isPending || updatePropertyMutation.isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
              ? "Create property"
              : "Save changes"}
          </button>
        </div>
      </form>

      {/* Properties table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 text-sm font-semibold">Existing properties</div>

        {propertiesLoading ? (
          <div className="p-4 text-sm text-slate-600">Loading...</div>
        ) : propertiesIsError ? (
          <div className="p-4 text-sm text-red-600">
            {/* @ts-expect-error axios error */}
            {propertiesError?.response?.data?.message ??
              (propertiesError as any)?.message ??
              "Failed to load properties"}
          </div>
        ) : properties.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No properties yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Location</th>
                  <th className="text-left px-3 py-2">Price</th>
                  <th className="text-left px-3 py-2">Guests</th>
                  <th className="text-left px-3 py-2">Images</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-slate-500">slug: {p.slug}</div>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      {p.city}, {p.country}
                      <div className="text-xs text-slate-500">{p.address}</div>
                    </td>
                    <td className="px-3 py-2">€{p.pricePerNight}</td>
                    <td className="px-3 py-2">{p.maxGuests}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {p.images.length} image{p.images.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => populateFormForEdit(p)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProperty(p.id)}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                        disabled={deletePropertyMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminPropertiesSection;
