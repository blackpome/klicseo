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

/** Map of price_line.id → amount (the universal shape for tier prices,
 *  works for legacy lines and brand-new ones alike). */
export type LineAmounts = Record<string, number | null>;

/**
 * Read tier prices from a FormData keyed by `line_<line_id>` inputs. Any field
 * whose name starts with `line_` is interpreted as a price; blank → null.
 */
export function readLineAmountsFromForm(fd: FormData): LineAmounts {
  const out: LineAmounts = {};
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("line_")) continue;
    const id = key.slice(5);
    if (!id) continue;
    const raw = String(value).trim();
    if (raw === "") { out[id] = null; continue; }
    const n = Number(raw);
    out[id] = Number.isFinite(n) ? Math.round(n) : null;
  }
  return out;
}
