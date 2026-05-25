// Single source of truth for service pricing across the home page Pricing
// section, the booking wizard's package step, and the confirmation step.
//
// Price grid (per vehicle tier):
//   Daily Monthly | Weekly Thrice | Manual + Interior add-on | Machine | Ceramic Sealant | Interior Detailing
// matches the spec sheet provided by the business.

export type PriceTier = "hatchback" | "sedan" | "compactSUV" | "suv" | "xuv";
export type ParkingLocation = "" | "inside" | "outside";

// --- Per-line discounts -------------------------------------------------
// One discount per price line (mirrors the cars table price columns and the
// service_discounts table). A "line" is finer-grained than a ServiceOptionId:
// Monthly has separate inside/outside lines, and add-ons are their own lines.

export type PriceLine =
  | "monthly"
  | "weekly_thrice"
  | "outside_monthly"
  | "outside_weekly_thrice"
  | "one_time_manual"
  | "one_time_machine"
  | "interior"
  | "car_detailing"
  | "interior_detailing";

export type ServiceDiscounts = Record<PriceLine, number>;

export const ALL_PRICE_LINES: PriceLine[] = [
  "monthly", "weekly_thrice", "outside_monthly", "outside_weekly_thrice",
  "one_time_manual", "one_time_machine", "interior",
  "car_detailing", "interior_detailing",
];

export const ZERO_DISCOUNTS: ServiceDiscounts = {
  monthly: 0, weekly_thrice: 0, outside_monthly: 0, outside_weekly_thrice: 0,
  one_time_manual: 0, one_time_machine: 0, interior: 0,
  car_detailing: 0, interior_detailing: 0,
};

/**
 * The badge toggle is the master switch for a line's discount: when it's off,
 * the line's discount is treated as 0 across both display and charged price.
 * Use this anywhere you read discounts for actual pricing.
 */
export function effectiveDiscounts(
  percents: ServiceDiscounts,
  badges: Partial<Record<PriceLine, boolean>>,
): ServiceDiscounts {
  const out = { ...ZERO_DISCOUNTS };
  for (const line of ALL_PRICE_LINES) {
    out[line] = badges[line] === false ? 0 : percents[line] ?? 0;
  }
  return out;
}

export const PRICE_LINE_LABEL: Record<PriceLine, string> = {
  monthly: "Monthly Car Wash",
  weekly_thrice: "Weekly Thrice",
  outside_monthly: "Outside Monthly Car Wash",
  outside_weekly_thrice: "Outside Weekly Thrice",
  one_time_manual: "One Time Manual",
  one_time_machine: "One Time Machine",
  interior: "Interior (add-on)",
  car_detailing: "Car Detailing",
  interior_detailing: "Interior Detailing",
};

// Grouping for the admin editor UI.
export const PRICE_LINE_GROUPS: { category: ServiceCategory; title: string; lines: PriceLine[] }[] = [
  { category: "CarWash", title: "Car Wash", lines: ["monthly", "weekly_thrice", "outside_monthly", "outside_weekly_thrice"] },
  { category: "OneTimeCarWash", title: "One-Time Wash", lines: ["one_time_manual", "one_time_machine", "interior"] },
  { category: "CarDetailing", title: "Car Detailing", lines: ["car_detailing", "interior_detailing"] },
];

export function isPriceLine(v: unknown): v is PriceLine {
  return typeof v === "string" && (ALL_PRICE_LINES as string[]).includes(v);
}

/** Apply a percent discount, rounded to whole rupees. */
export function discountedPrice(amount: number, percent: number): number {
  if (!percent || percent <= 0) return amount;
  return Math.round((amount * (100 - percent)) / 100);
}

/**
 * Gross-up: invert a percent discount so that the *net* `amount` is what the
 * customer pays, and the returned value is the inflated "original" price shown
 * struck-through. Rounded to the nearest ₹10 so the displayed MRP looks like a
 * normal sticker price (e.g. 1000 @ 10% → 1110, not 1111.11).
 *
 * For psychological prices (e.g. ₹1499), set `price_tier_amounts.mrp_amount`
 * explicitly — that override wins over this computed value.
 */
export function grossUp(amount: number, percent: number): number {
  if (!percent || percent <= 0 || percent >= 100) return amount;
  const raw = amount / (1 - percent / 100);
  return Math.round(raw / 10) * 10;
}

/**
 * Resolve the strike-through price for a single line. Returns the admin's
 * MRP override when it's strictly greater than the net amount; otherwise null
 * (= no strike shown). No computed gross-up — the admin types the MRP they
 * want struck through, full stop. The discount % from the discount tab drives
 * the ribbon independently.
 */
export function resolveStrikePrice(
  amount: number,
  _percent: number,
  mrpOverride: number | null | undefined,
): number | null {
  if (mrpOverride != null && mrpOverride > amount) return mrpOverride;
  return null;
}

/** The base price line an option resolves to (honours outside parking). */
export function baseLineFor(optionId: ServiceOptionId, parking: ParkingLocation): PriceLine {
  const outside = parking === "outside";
  switch (optionId) {
    case "Monthly": return outside ? "outside_monthly" : "monthly";
    case "WeeklyThrice": return outside ? "outside_weekly_thrice" : "weekly_thrice";
    case "OneTimeManual": return "one_time_manual";
    case "OneTimeMachine": return "one_time_machine";
    case "CeramicSealant": return "car_detailing";
    case "InteriorDetailing": return "interior_detailing";
  }
}

/** The add-on price line for an option, if any. */
export function addOnLineFor(optionId: ServiceOptionId): PriceLine | null {
  switch (optionId) {
    case "OneTimeManual":
    case "OneTimeMachine": return "interior";
    case "CeramicSealant": return "interior_detailing";
    default: return null;
  }
}

export const tierLabel: Record<PriceTier, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  compactSUV: "Compact SUV",
  suv: "SUV",
  xuv: "XUV / Large",
};

// vehicleType strings produced by StepVehicle → price tier
const TIER_BY_VEHICLE_TYPE: Record<string, PriceTier> = {
  "Hatchback": "hatchback",
  "Sedan": "sedan",
  "Compact SUV": "compactSUV",
  "SUV": "suv",
  "XUV & Large SUV": "xuv",
};

export function tierForVehicleType(type: string): PriceTier {
  return TIER_BY_VEHICLE_TYPE[type] ?? "sedan";
}

export type ServiceCategory = "CarWash" | "CarDetailing" | "OneTimeCarWash";

export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  CarDetailing: "#10b981", // Premium Green
  CarWash: "#3B82F6",      // Premium Blue
  OneTimeCarWash: "#EC4899", // Vivid Pink — sets it apart from brand gold
};

export type ServiceOptionId =
  | "Monthly"
  | "WeeklyThrice"
  | "OneTimeManual"
  | "OneTimeMachine"
  | "CeramicSealant"
  | "InteriorDetailing";

export interface ServiceOptionDef {
  id: ServiceOptionId;
  label: string;
  shortLabel: string;
  blurb: string;
  recurring: "monthly" | "one-time";
  category: ServiceCategory;
  price: Record<PriceTier, number>;
  // Optional add-on charged in addition to `price` (only OneTimeManual today).
  addOn?: {
    id: string;
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
    price: { hatchback: 999, sedan: 1099, compactSUV: 1199, suv: 1399, xuv: 1599 },
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
    price: { hatchback: 249, sedan: 349, compactSUV: 399, suv: 499, xuv: 599 },
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

// Outside-parked car wash subscription prices. These override the standard
// subscription price grid only when parkingLocation === "outside".
const OUTSIDE_CAR_WASH_PRICES: Partial<Record<ServiceOptionId, Record<PriceTier, number>>> = {
  Monthly: {
    hatchback: 1199,
    sedan: 1399,
    compactSUV: 1499,
    suv: 1599,
    xuv: 1799,
  },
  WeeklyThrice: {
    hatchback: 749,
    sedan: 849,
    compactSUV: 899,
    suv: 949,
    xuv: 1049,
  },
};

export const OPTIONS_BY_CATEGORY: Record<ServiceCategory, ServiceOptionId[]> = {
  CarWash: ["Monthly", "WeeklyThrice"],
  OneTimeCarWash: ["OneTimeManual", "OneTimeMachine"],
  CarDetailing: ["CeramicSealant"],
};

export function isServiceOptionId(v: unknown): v is ServiceOptionId {
  return typeof v === "string" && v in SERVICE_OPTIONS;
}

/** Cheapest tier price for "from ₹X" displays. */
export function fromPrice(id: ServiceOptionId): number {
  return Math.min(...Object.values(SERVICE_OPTIONS[id].price));
}

export interface PriceResult {
  tier: PriceTier;
  // Original (full list) prices.
  base: number;
  addOn: number;
  total: number;
  // Discounted prices + the percents applied.
  basePercent: number;
  addOnPercent: number;
  discountedBase: number;
  discountedAddOn: number;
  discountedTotal: number;
  hasDiscount: boolean;
}

export function priceFor(
  optionId: string,
  vehicleType: string,
  withAddOn = false,
  parkingLocation: ParkingLocation = "",
  discounts?: ServiceDiscounts,
): PriceResult | null {
  if (!isServiceOptionId(optionId)) return null;
  const def = SERVICE_OPTIONS[optionId];
  const tier = tierForVehicleType(vehicleType);
  const outsideGrid = parkingLocation === "outside" ? OUTSIDE_CAR_WASH_PRICES[optionId] : undefined;
  const base = (outsideGrid ?? def.price)[tier];
  const addOn = withAddOn && def.addOn ? def.addOn.price[tier] : 0;

  const basePercent = discounts?.[baseLineFor(optionId, parkingLocation)] ?? 0;
  const addOnLine = addOnLineFor(optionId);
  const addOnPercent = withAddOn && addOnLine ? discounts?.[addOnLine] ?? 0 : 0;
  const discountedBase = discountedPrice(base, basePercent);
  const discountedAddOn = discountedPrice(addOn, addOnPercent);

  return {
    tier,
    base,
    addOn,
    total: base + addOn,
    basePercent,
    addOnPercent,
    discountedBase,
    discountedAddOn,
    discountedTotal: discountedBase + discountedAddOn,
    hasDiscount: basePercent > 0 || addOnPercent > 0,
  };
}

/** INR formatter — uses Indian digit grouping (1,00,000). */
export function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
