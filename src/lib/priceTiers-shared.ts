// Client-safe types and helpers for price tiers. The 9 service price columns
// mirror `price_tiers` exactly so a Tier value can be fed straight into form
// inputs without translation.

import { ALL_PRICE_LINES, type PriceLine } from "./pricing";

export interface TierPrices {
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

export interface PriceTier extends TierPrices {
  id: string;
  name: string;
  sort_order: number;
  // Filled in by listTiersWithCounts(); not present on the raw table row.
  car_count?: number;
}

export const EMPTY_TIER_PRICES: TierPrices = {
  monthly: null, weekly_thrice: null, outside_monthly: null, outside_weekly_thrice: null,
  one_time_manual: null, one_time_machine: null, interior: null,
  car_detailing: null, interior_detailing: null,
};

/** Read 9 prices from a FormData (blank → null, non-numeric ignored). */
export function readTierPricesFromForm(fd: FormData): TierPrices {
  const out: TierPrices = { ...EMPTY_TIER_PRICES };
  for (const line of ALL_PRICE_LINES as PriceLine[]) {
    const raw = String(fd.get(line) ?? "").trim();
    if (raw === "") { out[line] = null; continue; }
    const n = Number(raw);
    out[line] = Number.isFinite(n) ? n : null;
  }
  return out;
}
