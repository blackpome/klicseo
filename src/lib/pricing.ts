// Single source of truth for service pricing across the home page Pricing
// section, the booking wizard's package step, and the confirmation step.
//
// Price grid (per vehicle tier):
//   Daily Monthly | Weekly Thrice | Manual + Interior add-on | Machine | Ceramic Sealant | Interior Detailing
// matches the spec sheet provided by the business.

export type PriceTier = "hatchback" | "sedan" | "compactSUV" | "suv" | "xuv";

export const tierLabel: Record<PriceTier, string> = {
  hatchback:  "Hatchback",
  sedan:      "Sedan",
  compactSUV: "Compact SUV",
  suv:        "SUV",
  xuv:        "XUV / Large",
};

// vehicleType strings produced by StepVehicle → price tier
const TIER_BY_VEHICLE_TYPE: Record<string, PriceTier> = {
  "Hatchback":         "hatchback",
  "Sedan":             "sedan",
  "Compact SUV":       "compactSUV",
  "SUV":               "suv",
  "XUV & Large SUV":   "xuv",
};

export function tierForVehicleType(type: string): PriceTier {
  return TIER_BY_VEHICLE_TYPE[type] ?? "sedan";
}

export type ServiceCategory = "CarWash" | "CarDetailing" | "OneTimeCarWash";

export type ServiceOptionId =
  | "Monthly"
  | "WeeklyThrice"
  | "OneTimeManual"
  | "OneTimeMachine"
  | "CeramicSealant"
  | "InteriorDetailing";

export interface ServiceOptionDef {
  id:        ServiceOptionId;
  label:     string;
  shortLabel: string;
  blurb:     string;
  recurring: "monthly" | "one-time";
  category:  ServiceCategory;
  price:     Record<PriceTier, number>;
  // Optional add-on charged in addition to `price` (only OneTimeManual today).
  addOn?: {
    id:    string;
    label: string;
    price: Record<PriceTier, number>;
  };
}

export const SERVICE_OPTIONS: Record<ServiceOptionId, ServiceOptionDef> = {
  Monthly: {
    id: "Monthly",
    label: "Daily — Monthly",
    shortLabel: "Daily (Monthly)",
    blurb: "Mon – Sat, full month subscription",
    recurring: "monthly",
    category: "CarWash",
    price: { hatchback: 1000, sedan: 1099, compactSUV: 1199, suv: 1399, xuv: 1599 },
  },
  WeeklyThrice: {
    id: "WeeklyThrice",
    label: "Weekly Thrice",
    shortLabel: "Weekly Thrice",
    blurb: "3× per week, full month subscription",
    recurring: "monthly",
    category: "CarWash",
    price: { hatchback: 649, sedan: 699, compactSUV: 749, suv: 849, xuv: 949 },
  },
  OneTimeManual: {
    id: "OneTimeManual",
    label: "One-Time Manual Wash",
    shortLabel: "Manual",
    blurb: "Single hand-wash visit",
    recurring: "one-time",
    category: "OneTimeCarWash",
    price: { hatchback: 249, sedan: 349, compactSUV: 399, suv: 499, xuv: 595 },
    addOn: {
      id: "InteriorClean",
      label: "Add interior cleaning",
      price: { hatchback: 149, sedan: 249, compactSUV: 299, suv: 399, xuv: 499 },
    },
  },
  OneTimeMachine: {
    id: "OneTimeMachine",
    label: "One-Time Machine Wash",
    shortLabel: "Machine",
    blurb: "Pressure-wash visit",
    recurring: "one-time",
    category: "OneTimeCarWash",
    price: { hatchback: 399, sedan: 399, compactSUV: 499, suv: 599, xuv: 699 },
    addOn: {
      id: "InteriorClean",
      label: "Add interior cleaning",
      price: { hatchback: 149, sedan: 249, compactSUV: 299, suv: 399, xuv: 499 },
    },
  },
  CeramicSealant: {
    id: "CeramicSealant",
    label: "Ceramic Sealant Coating",
    shortLabel: "Ceramic Sealant",
    blurb: "Long-lasting paint protection",
    recurring: "one-time",
    category: "CarDetailing",
    price: { hatchback: 4999, sedan: 5999, compactSUV: 6999, suv: 7999, xuv: 8999 },
    addOn: {
      id: "InteriorDetailing",
      label: "Add interior detailing",
      price: { hatchback: 1999, sedan: 2299, compactSUV: 2499, suv: 2799, xuv: 3000 },
    },
  },
  // Interior detailing isn't sold standalone — it's only a paired add-on to
  // Ceramic Sealant (and a separate small add-on to One-Time Manual). Kept
  // here so the canonical price grid lives in one file; not exposed via
  // OPTIONS_BY_CATEGORY.
  InteriorDetailing: {
    id: "InteriorDetailing",
    label: "Interior Detailing",
    shortLabel: "Interior",
    blurb: "Deep cabin & seat clean",
    recurring: "one-time",
    category: "CarDetailing",
    price: { hatchback: 1999, sedan: 2299, compactSUV: 2499, suv: 2799, xuv: 3000 },
  },
};

export const OPTIONS_BY_CATEGORY: Record<ServiceCategory, ServiceOptionId[]> = {
  CarWash:        ["Monthly", "WeeklyThrice"],
  OneTimeCarWash: ["OneTimeManual", "OneTimeMachine"],
  CarDetailing:   ["CeramicSealant"],
};

export function isServiceOptionId(v: unknown): v is ServiceOptionId {
  return typeof v === "string" && v in SERVICE_OPTIONS;
}

/** Cheapest tier price for "from ₹X" displays. */
export function fromPrice(id: ServiceOptionId): number {
  return Math.min(...Object.values(SERVICE_OPTIONS[id].price));
}

export function priceFor(
  optionId: string,
  vehicleType: string,
  withAddOn = false,
): { base: number; addOn: number; total: number; tier: PriceTier } | null {
  if (!isServiceOptionId(optionId)) return null;
  const def = SERVICE_OPTIONS[optionId];
  const tier = tierForVehicleType(vehicleType);
  const base = def.price[tier];
  const addOn = withAddOn && def.addOn ? def.addOn.price[tier] : 0;
  return { base, addOn, total: base + addOn, tier };
}

/** INR formatter — uses Indian digit grouping (1,00,000). */
export function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
