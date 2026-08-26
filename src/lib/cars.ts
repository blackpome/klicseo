import "server-only";
import { supabase } from "./supabase";
import type { CarRecord } from "./carPricing";
import { ALL_PRICE_LINES } from "./pricing";

// Cars no longer carry prices — prices live on price_tiers, and a car points
// to its tier via tier_id. The CarRecord shape still includes the 9 price
// fields for backward compatibility with the booking wizard / pricing libs;
// they're filled in here by joining the assigned tier at fetch time.

const CAR_COLUMNS = "id,brand,model,body_type,segment_name,tier_id";

type RawCar = {
  id: string;
  brand: string;
  model: string;
  body_type: string | null;
  segment_name: string | null;
  tier_id: string | null;
};

interface TierPriceCacheEntry {
  amounts: Record<string, number | null>;
  mrpAmounts: Record<string, number | null>;
  legacy: Record<string, number | null>;
  legacyMrp: Record<string, number | null>;
  expires: number;
}

const tierPriceCache = new Map<string, TierPriceCacheEntry>();

export function invalidateTierPriceCache(): void {
  tierPriceCache.clear();
}

/**
 * Bulk-resolve cars into full CarRecord by joining each tier's prices from
 * price_tier_amounts in one extra query. Cars without a tier get null prices
 * (same UX as before — the wizard shows "On call").
 */
async function withTierPrices(rows: RawCar[]): Promise<CarRecord[]> {
  if (rows.length === 0) return [];
  const now = Date.now();
  const allTierIds = Array.from(new Set(rows.map((r) => r.tier_id).filter((x): x is string => !!x)));
  
  // Find which tier IDs are missing from cache or expired
  const missingTierIds = allTierIds.filter((id) => {
    const cached = tierPriceCache.get(id);
    return !cached || cached.expires <= now;
  });

  if (missingTierIds.length > 0) {
    const { data, error } = await supabase()
      .from("price_tier_amounts")
      .select("tier_id, line_id, amount, mrp_amount, service_price_lines!inner(legacy_line)")
      .in("tier_id", missingTierIds);
    if (error) throw error;

    type Row = {
      tier_id: string;
      line_id: string;
      amount: number | null;
      mrp_amount: number | null;
      service_price_lines: { legacy_line: string | null } | Array<{ legacy_line: string | null }>;
    };

    // Group fetched rows by tier_id
    const fetchedByTier = new Map<string, Row[]>();
    for (const row of (data ?? []) as unknown as Row[]) {
      const list = fetchedByTier.get(row.tier_id) ?? [];
      list.push(row);
      fetchedByTier.set(row.tier_id, list);
    }

    // Cache each missing tier ID (even if it has no price rows yet)
    for (const tid of missingTierIds) {
      const rowsForTier = fetchedByTier.get(tid) ?? [];
      const amounts: Record<string, number | null> = {};
      const mrpAmounts: Record<string, number | null> = {};
      const legacy: Record<string, number | null> = {};
      const legacyMrp: Record<string, number | null> = {};

      for (const row of rowsForTier) {
        amounts[row.line_id] = row.amount;
        mrpAmounts[row.line_id] = row.mrp_amount;
        const rel = row.service_price_lines;
        const relRow = Array.isArray(rel) ? rel[0] : rel;
        const key = relRow?.legacy_line;
        if (key && (ALL_PRICE_LINES as string[]).includes(key)) {
          legacy[key] = row.amount;
          legacyMrp[key] = row.mrp_amount;
        }
      }

      tierPriceCache.set(tid, {
        amounts,
        mrpAmounts,
        legacy,
        legacyMrp,
        expires: now + 60_000,
      });
    }
  }
  return rows.map((c) => {
    const cached = c.tier_id ? tierPriceCache.get(c.tier_id) : null;
    const tp = cached?.legacy ?? {};
    const tpMrp = cached?.legacyMrp ?? {};
    const amounts = cached?.amounts ?? {};
    const mrpAmounts = cached?.mrpAmounts ?? {};
    const mrp: Record<string, number | null> = {};
    const merged: Record<string, unknown> = { ...c, amounts, mrpAmounts, mrp };
    for (const line of ALL_PRICE_LINES) {
      merged[line] = tp[line] ?? null;
      mrp[line] = tpMrp[line] ?? null;
    }
    return merged as unknown as CarRecord;
  });
}

/** Cars in a specific tier (no search; ordered by name). */
export async function listCarsByTier(tierId: string): Promise<CarRecord[]> {
  const { data, error } = await supabase()
    .from("cars")
    .select(CAR_COLUMNS)
    .eq("tier_id", tierId)
    .order("brand")
    .order("model");
  if (error) throw error;
  return withTierPrices((data ?? []) as RawCar[]);
}

/** Cars not yet assigned to any tier (used by the "add cars" picker). */
export async function listUnassignedCars(search?: string, limit = 200): Promise<CarRecord[]> {
  let q = supabase().from("cars").select(CAR_COLUMNS).is("tier_id", null);
  const s = search?.trim();
  if (s) q = q.or(`brand.ilike.%${s}%,model.ilike.%${s}%`);
  const { data, error } = await q.order("brand").order("model").limit(limit);
  if (error) throw error;
  return withTierPrices((data ?? []) as RawCar[]);
}

export interface CarInput {
  brand: string;
  model: string;
  body_type: string | null;
  segment_name: string | null;
}

/** Admin list: fuzzy search when `search` is set, else the first N by name. */
export async function listCars(opts: { search?: string; limit?: number } = {}): Promise<CarRecord[]> {
  const limit = opts.limit ?? 60;
  const s = opts.search?.trim();
  if (s) return searchCars(s, limit);
  const { data, error } = await supabase()
    .from("cars")
    .select(CAR_COLUMNS)
    .order("brand", { ascending: true })
    .order("model", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return withTierPrices((data ?? []) as RawCar[]);
}

/** All cars (capped), ordered by name. */
export async function listAllCars(limit = 2000): Promise<CarRecord[]> {
  const { data, error } = await supabase()
    .from("cars")
    .select(CAR_COLUMNS)
    .order("brand", { ascending: true })
    .order("model", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return withTierPrices((data ?? []) as RawCar[]);
}

export async function getCar(id: string): Promise<CarRecord | null> {
  const { data, error } = await supabase().from("cars").select(CAR_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withPrices] = await withTierPrices([data as RawCar]);
  return withPrices;
}

function rowFromInput(input: CarInput): Record<string, unknown> {
  return {
    brand: input.brand,
    model: input.model,
    body_type: input.body_type,
    segment_name: input.segment_name,
  };
}

export async function insertCar(input: CarInput): Promise<CarRecord> {
  const { data, error } = await supabase().from("cars").insert(rowFromInput(input)).select(CAR_COLUMNS).single();
  if (error) throw error;
  const [withPrices] = await withTierPrices([data as RawCar]);
  return withPrices;
}

export async function updateCar(id: string, input: CarInput): Promise<void> {
  const { error } = await supabase().from("cars").update(rowFromInput(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteCar(id: string): Promise<void> {
  const { error } = await supabase().from("cars").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Fuzzy type-ahead search over the car catalog (see migration 0005's
 * search_cars()). The RPC returns rows from public.cars (which no longer has
 * price columns); we join the tier prices in via withTierPrices().
 */
export async function searchCars(query: string, limit = 8): Promise<CarRecord[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const { data, error } = await supabase().rpc("search_cars", { q, max_results: limit });
  if (error) throw error;
  return withTierPrices((data ?? []) as RawCar[]);
}

/** Distinct brand list for the brand picker. */
export async function listBrands(): Promise<string[]> {
  const { data, error } = await supabase()
    .from("cars")
    .select("brand")
    .order("brand", { ascending: true });
  if (error) throw error;
  const seen = new Set<string>();
  for (const row of (data ?? []) as { brand: string }[]) seen.add(row.brand);
  return [...seen];
}
