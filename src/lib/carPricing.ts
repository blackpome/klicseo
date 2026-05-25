// Client-safe helpers for per-car pricing read from the `cars` table.
//
// The marketing site's tier grid still lives in pricing.ts; this module is
// only used by the booking wizard once a specific car has been picked. When a
// car has no price for the chosen service (blank cell in the sheet), the
// resolver returns null and the UI shows the "our team will call you back"
// fallback instead of a number.

import {
  addOnLineFor,
  baseLineFor,
  resolveStrikePrice,
  type ServiceOptionId,
  type ParkingLocation,
  type ServiceDiscounts,
} from "./pricing";
import type { ServiceCatalog } from "./serviceCatalog-shared";

// Mirrors the price columns on public.cars (see migration 0004). Null = the
// sheet had no price for that service on this car.
export interface CarPrices {
  monthly: number | null;
  weekly_thrice: number | null;
  outside_monthly: number | null;
  outside_weekly_thrice: number | null;
  one_time_manual: number | null;
  one_time_machine: number | null;
  interior: number | null;
  car_detailing: number | null;
  interior_detailing: number | null;
  /** Per-line-id amounts (covers admin-created lines too). Optional so older
   *  serialized payloads stay valid; consumers should treat missing as {}. */
  amounts?: Record<string, number | null>;
  /** Optional MRP overrides keyed by legacy line. Null/missing → strike price
   *  is auto-computed by gross-up from the net amount + discount %. */
  mrp?: {
    monthly: number | null;
    weekly_thrice: number | null;
    outside_monthly: number | null;
    outside_weekly_thrice: number | null;
    one_time_manual: number | null;
    one_time_machine: number | null;
    interior: number | null;
    car_detailing: number | null;
    interior_detailing: number | null;
  };
  /** Per-line-id MRP overrides (catalog-aware sibling of `amounts`). */
  mrpAmounts?: Record<string, number | null>;
}

// The full car record returned by /api/cars/search.
export interface CarRecord extends CarPrices {
  id: string;
  brand: string;
  model: string;
  body_type: string | null;
  segment_name: string | null;
  tier_id?: string | null;
  /** Per-line-id price amounts (covers every line in the catalog including
   *  admin-created ones). Always present, may be empty. */
  amounts: Record<string, number | null>;
  /** Per-line-id MRP overrides; always present, may be empty. */
  mrpAmounts: Record<string, number | null>;
}

export interface CarPriceResult {
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

// Resolve the base price column for an option, honouring outside parking for
// the two subscription plans.
function basePriceColumn(
  prices: CarPrices,
  optionId: ServiceOptionId,
  parking: ParkingLocation,
): number | null {
  const outside = parking === "outside";
  switch (optionId) {
    case "Monthly":
      return outside ? prices.outside_monthly : prices.monthly;
    case "WeeklyThrice":
      return outside ? prices.outside_weekly_thrice : prices.weekly_thrice;
    case "OneTimeManual":
      return prices.one_time_manual;
    case "OneTimeMachine":
      return prices.one_time_machine;
    case "CeramicSealant":
      return prices.car_detailing;
    case "InteriorDetailing":
      return prices.interior_detailing;
    default:
      return null;
  }
}

// Same mapping as basePriceColumn, but reads the optional MRP override sibling.
function baseMrpColumn(
  prices: CarPrices,
  optionId: ServiceOptionId,
  parking: ParkingLocation,
): number | null {
  const mrp = prices.mrp;
  if (!mrp) return null;
  const outside = parking === "outside";
  switch (optionId) {
    case "Monthly":           return outside ? mrp.outside_monthly : mrp.monthly;
    case "WeeklyThrice":      return outside ? mrp.outside_weekly_thrice : mrp.weekly_thrice;
    case "OneTimeManual":     return mrp.one_time_manual;
    case "OneTimeMachine":    return mrp.one_time_machine;
    case "CeramicSealant":    return mrp.car_detailing;
    case "InteriorDetailing": return mrp.interior_detailing;
    default:                  return null;
  }
}

// The add-on column for an option (interior cleaning on one-time washes;
// interior detailing paired with ceramic sealant).
function addOnColumn(prices: CarPrices, optionId: ServiceOptionId): number | null {
  switch (optionId) {
    case "OneTimeManual":
    case "OneTimeMachine":
      return prices.interior;
    case "CeramicSealant":
      return prices.interior_detailing;
    default:
      return null;
  }
}

function addOnMrpColumn(prices: CarPrices, optionId: ServiceOptionId): number | null {
  const mrp = prices.mrp;
  if (!mrp) return null;
  switch (optionId) {
    case "OneTimeManual":
    case "OneTimeMachine":  return mrp.interior;
    case "CeramicSealant":  return mrp.interior_detailing;
    default:                return null;
  }
}

/**
 * Price for a specific car + service from the DB columns.
 * Returns null when the base price is missing → caller shows the call-back
 * fallback. A missing add-on price is treated as 0 (add-on simply unavailable).
 */
export function carPriceFor(
  prices: CarPrices,
  optionId: ServiceOptionId,
  parking: ParkingLocation,
  withAddOn: boolean,
  discounts?: ServiceDiscounts,
): CarPriceResult | null {
  // Stored `amount` is now the *net* price — what the customer pays. The
  // `base`/`addOn` in the returned result are the displayed strike-through
  // values: an explicit MRP override if present, otherwise the auto-computed
  // gross-up from the net + discount %.
  const netBase = basePriceColumn(prices, optionId, parking);
  if (netBase == null) return null;
  const netAddOn = withAddOn ? addOnColumn(prices, optionId) ?? 0 : 0;

  const basePercent = discounts?.[baseLineFor(optionId, parking)] ?? 0;
  const addOnLine = addOnLineFor(optionId);
  const addOnPercent = withAddOn && addOnLine ? discounts?.[addOnLine] ?? 0 : 0;

  const baseMrpOverride = baseMrpColumn(prices, optionId, parking);
  const addOnMrpOverride = withAddOn ? addOnMrpColumn(prices, optionId) : null;
  const strikeBase = resolveStrikePrice(netBase, basePercent, baseMrpOverride) ?? netBase;
  const strikeAddOn = resolveStrikePrice(netAddOn, addOnPercent, addOnMrpOverride) ?? netAddOn;

  const hasDiscount =
    strikeBase > netBase || strikeAddOn > netAddOn;

  return {
    base: strikeBase,
    addOn: strikeAddOn,
    total: strikeBase + strikeAddOn,
    basePercent,
    addOnPercent,
    discountedBase: netBase,
    discountedAddOn: netAddOn,
    discountedTotal: netBase + netAddOn,
    hasDiscount,
  };
}

/**
 * Catalog-aware price for a service option identified by its legacy_id or
 * slug. Resolves the option's base / outside / addon price lines via the
 * catalog and reads amounts from prices.amounts (the per-line-id map).
 *
 * Used for admin-created options (which have no entry in SERVICE_OPTIONS).
 * For legacy options, prefer carPriceFor() — it's slightly cheaper.
 */
export function carPriceForCatalog(
  prices: CarPrices,
  optionId: string,
  parking: ParkingLocation,
  withAddOn: boolean,
  catalog: ServiceCatalog,
  percentsByLineId: Record<string, number>,
  badgesByLineId: Record<string, boolean>,
): CarPriceResult | null {
  // Locate the option in the catalog by legacy_id first, then slug.
  const option = catalog.options.find((o) => o.legacy_id === optionId)
    ?? catalog.options.find((o) => o.slug === optionId);
  if (!option) return null;

  const baseLine = catalog.priceLines.find((l) => l.option_id === option.id && l.kind === "base");
  if (!baseLine) return null;
  const outsideLine = parking === "outside"
    ? catalog.priceLines.find((l) => l.option_id === option.id && l.kind === "outside")
    : null;
  const addonLine = withAddOn && option.has_addon
    ? catalog.priceLines.find((l) => l.category_id === option.category_id && l.kind === "addon")
    : null;

  const amounts = prices.amounts ?? {};
  const mrpAmounts = prices.mrpAmounts ?? {};
  const baseLineForRead = outsideLine ?? baseLine;
  const netBase = amounts[baseLineForRead.id] ?? null;
  if (netBase == null) return null;
  const netAddOn = addonLine ? (amounts[addonLine.id] ?? 0) : 0;

  // Apply badge gate (badge=off → discount counts as 0).
  const baseEnabled = badgesByLineId[baseLineForRead.id] !== false;
  const basePercent = baseEnabled ? (percentsByLineId[baseLineForRead.id] ?? 0) : 0;
  const addOnEnabled = addonLine ? badgesByLineId[addonLine.id] !== false : true;
  const addOnPercent = addonLine && addOnEnabled ? (percentsByLineId[addonLine.id] ?? 0) : 0;

  // Strike price: explicit MRP override wins; otherwise auto-compute from %.
  const baseMrpOverride = mrpAmounts[baseLineForRead.id] ?? null;
  const addOnMrpOverride = addonLine ? mrpAmounts[addonLine.id] ?? null : null;
  const strikeBase = resolveStrikePrice(netBase, basePercent, baseMrpOverride) ?? netBase;
  const strikeAddOn = resolveStrikePrice(netAddOn, addOnPercent, addOnMrpOverride) ?? netAddOn;

  const hasDiscount = strikeBase > netBase || strikeAddOn > netAddOn;

  return {
    base: strikeBase,
    addOn: strikeAddOn,
    total: strikeBase + strikeAddOn,
    basePercent,
    addOnPercent,
    discountedBase: netBase,
    discountedAddOn: netAddOn,
    discountedTotal: netBase + netAddOn,
    hasDiscount,
  };
}
