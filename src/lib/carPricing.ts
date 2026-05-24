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
  discountedPrice,
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
  const base = basePriceColumn(prices, optionId, parking);
  if (base == null) return null;
  const addOn = withAddOn ? addOnColumn(prices, optionId) ?? 0 : 0;

  const basePercent = discounts?.[baseLineFor(optionId, parking)] ?? 0;
  const addOnLine = addOnLineFor(optionId);
  const addOnPercent = withAddOn && addOnLine ? discounts?.[addOnLine] ?? 0 : 0;
  const discountedBase = discountedPrice(base, basePercent);
  const discountedAddOn = discountedPrice(addOn, addOnPercent);

  return {
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
  const baseLineForRead = outsideLine ?? baseLine;
  const base = amounts[baseLineForRead.id] ?? null;
  if (base == null) return null;
  const addOn = addonLine ? (amounts[addonLine.id] ?? 0) : 0;

  // Apply badge gate (badge=off → discount counts as 0).
  const baseEnabled = badgesByLineId[baseLineForRead.id] !== false;
  const basePercent = baseEnabled ? (percentsByLineId[baseLineForRead.id] ?? 0) : 0;
  const addOnEnabled = addonLine ? badgesByLineId[addonLine.id] !== false : true;
  const addOnPercent = addonLine && addOnEnabled ? (percentsByLineId[addonLine.id] ?? 0) : 0;

  const discountedBase = discountedPrice(base, basePercent);
  const discountedAddOn = discountedPrice(addOn, addOnPercent);

  return {
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
