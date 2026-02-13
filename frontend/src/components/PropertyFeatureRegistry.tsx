import { propertyFeatureKeyEnum, type CreatePropertyInput } from "@shared/schemas/property.schema";
import {
  Accessibility,
  Baby,
  PawPrint,
  Car,
  RefreshCcw,
  Wifi,
  Waves,
  Snowflake,
  Flame,
  Thermometer,
  Shirt,
  Utensils,
  Laptop,
  type LucideIcon,
} from "lucide-react";

/**
 * PropertyFeatureKey is derived from the shared schema so the frontend stays in lockstep
 * with backend validation and the database enum.
 */
export type PropertyFeatureKey = NonNullable<CreatePropertyInput["featureKeys"]>[number];

export type PropertyFeatureDef = {
  key: PropertyFeatureKey;
  label: string;
  Icon: LucideIcon;
};

/**
 * Canonical feature definitions.
 * Keys must match propertyFeatureKeyEnum exactly; the `satisfies` clause ensures the mapping is complete.
 */
const FEATURE_META = {
  WHEELCHAIR: { label: "Wheelchair access", Icon: Accessibility },
  CRIB: { label: "Crib", Icon: Baby },
  PETS_ALLOWED: { label: "Pets allowed", Icon: PawPrint },
  PARKING: { label: "Parking", Icon: Car },
  REFUND_POLICY: { label: "Refund policy", Icon: RefreshCcw },

  WIFI: { label: "Wi-Fi", Icon: Wifi },
  POOL: { label: "Pool", Icon: Waves },
  SEA_VIEW: { label: "Sea view", Icon: Waves },
  AIR_CONDITIONING: { label: "Air conditioning", Icon: Snowflake },
  BBQ: { label: "BBQ", Icon: Flame },
  HEATING: { label: "Heating", Icon: Thermometer },
  WASHER: { label: "Washer", Icon: Shirt },
  KITCHEN: { label: "Kitchen", Icon: Utensils },
  WORKSPACE: { label: "Workspace", Icon: Laptop },
} satisfies Record<PropertyFeatureKey, { label: string; Icon: LucideIcon }>;

/**
 * Ordered list of definitions following the enum order from the shared schema.
 * This provides consistent ordering everywhere (admin form, property card, hero, etc.).
 */
export const PROPERTY_FEATURE_DEFS: PropertyFeatureDef[] = (
  propertyFeatureKeyEnum.options as PropertyFeatureKey[]
).map((key) => ({
  key,
  label: FEATURE_META[key].label,
  Icon: FEATURE_META[key].Icon,
}));

/**
 * Utility: stable sort + dedupe keys using canonical order.
 */
export function normalizeFeatureKeys(
  keys: PropertyFeatureKey[] | undefined | null
): PropertyFeatureKey[] {
  if (!Array.isArray(keys) || !keys.length) return [];
  const unique = Array.from(new Set(keys));
  const order = new Map(PROPERTY_FEATURE_DEFS.map((d, idx) => [d.key, idx]));
  unique.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  return unique;
}

/**
 * Presentational component: renders icons for a list of feature keys (reusable in cards/pages).
 * Styling is intentionally minimal so callers can wrap/position as needed.
 */
export function PropertyFeatureIcons({
  featureKeys,
  className = "",
  iconClassName = "w-4 h-4",
  showLabels = false,
  itemClassName = "inline-flex items-center gap-2 px-2 py-1 rounded border border-slate-200 bg-white text-slate-700",
}: {
  featureKeys: PropertyFeatureKey[] | undefined | null;
  className?: string;
  iconClassName?: string;
  showLabels?: boolean;
  /**
   * Optional per-item styling override.
   * Default preserves the previous “chip” look to avoid breaking existing usage.
   */
  itemClassName?: string;
}) {
  const normalized = normalizeFeatureKeys(featureKeys);

  if (!normalized.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {normalized.map((key) => {
        const def = PROPERTY_FEATURE_DEFS.find((d) => d.key === key);
        if (!def) return null;
        const Icon = def.Icon;

        return (
          <span key={key} className={itemClassName} title={def.label}>
            <Icon className={iconClassName} />
            {showLabels ? <span className="text-xs">{def.label}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Admin-only component: icon grid for selecting feature keys.
 * This is used in the create/edit property form.
 */
export function PropertyFeaturePicker({
  value,
  onChange,
  className = "",
}: {
  value: PropertyFeatureKey[];
  onChange: (next: PropertyFeatureKey[]) => void;
  className?: string;
}) {
  const selected = new Set(value);

  function toggle(key: PropertyFeatureKey) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(normalizeFeatureKeys(Array.from(next)));
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 ${className}`}>
      {PROPERTY_FEATURE_DEFS.map(({ key, label, Icon }) => {
        const isOn = selected.has(key);

        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={[
              "flex items-center gap-2 px-3 py-2 rounded border text-left",
              "transition-colors",
              isOn
                ? "border-slate-900 bg-white text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
            aria-pressed={isOn}
          >
            <span
              className={[
                "inline-flex items-center justify-center w-6 h-6 rounded",
                isOn ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
            </span>

            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
