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
}

// The full car record returned by /api/cars/search.
export interface CarRecord extends CarPrices {
  id: string;
  brand: string;
  model: string;
  body_type: string | null;
  segment_name: string | null;
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
