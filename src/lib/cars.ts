import "server-only";
import { supabase } from "./supabase";
import type { CarRecord, CarPrices } from "./carPricing";
import { ALL_PRICE_LINES } from "./pricing";

// Columns selected for admin list / edit (CarRecord shape + the price lines).
const CAR_COLUMNS = `id,brand,model,body_type,segment_name,tier_id,${ALL_PRICE_LINES.join(",")}`;

/** Cars in a specific tier (no search; ordered by name). */
export async function listCarsByTier(tierId: string): Promise<CarRecord[]> {
  const { data, error } = await supabase()
    .from("cars")
    .select(CAR_COLUMNS)
    .eq("tier_id", tierId)
    .order("brand")
    .order("model");
  if (error) throw error;
  return (data ?? []) as unknown as CarRecord[];
}

/** Cars not yet assigned to any tier (used by the "add cars" picker). */
export async function listUnassignedCars(search?: string, limit = 200): Promise<CarRecord[]> {
  let q = supabase().from("cars").select(CAR_COLUMNS).is("tier_id", null);
  const s = search?.trim();
  if (s) q = q.or(`brand.ilike.%${s}%,model.ilike.%${s}%`);
  const { data, error } = await q.order("brand").order("model").limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CarRecord[];
}

export interface CarInput {
  brand: string;
  model: string;
  body_type: string | null;
  segment_name: string | null;
  prices: Partial<CarPrices>;
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
  return (data ?? []) as unknown as CarRecord[];
}

/** All cars (capped), ordered by monthly price then name — for the grouped view. */
export async function listAllCars(limit = 2000): Promise<CarRecord[]> {
  const { data, error } = await supabase()
    .from("cars")
    .select(CAR_COLUMNS)
    .order("monthly", { ascending: true, nullsFirst: false })
    .order("brand", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CarRecord[];
}

export async function getCar(id: string): Promise<CarRecord | null> {
  const { data, error } = await supabase().from("cars").select(CAR_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as CarRecord | null;
}

function rowFromInput(input: CarInput) {
  const row: Record<string, unknown> = {
    brand: input.brand,
    model: input.model,
    body_type: input.body_type,
    segment_name: input.segment_name,
  };
  for (const line of ALL_PRICE_LINES) {
    if (line in input.prices) row[line] = input.prices[line] ?? null;
  }
  return row;
}

export async function insertCar(input: CarInput): Promise<CarRecord> {
  const { data, error } = await supabase().from("cars").insert(rowFromInput(input)).select(CAR_COLUMNS).single();
  if (error) throw error;
  return data as unknown as CarRecord;
}

export async function updateCar(id: string, input: CarInput): Promise<void> {
  const { error } = await supabase().from("cars").update(rowFromInput(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteCar(id: string): Promise<void> {
  const { error } = await supabase().from("cars").delete().eq("id", id);
  if (error) throw error;
}

/** Group price: set only the provided price lines across the selected cars. */
export async function bulkSetCarPrices(ids: string[], prices: Partial<CarPrices>): Promise<void> {
  if (ids.length === 0 || Object.keys(prices).length === 0) return;
  const { error } = await supabase().from("cars").update(prices).in("id", ids);
  if (error) throw error;
}

/**
 * Fuzzy type-ahead search over the car catalog (see migration 0005's
 * search_cars()). Tolerates typos and word order via pg_trgm similarity and
 * matches the combined "brand model" string, so "tata nexon" works. Results
 * are ranked by trigram similarity and capped for a snappy dropdown.
 */
export async function searchCars(query: string, limit = 8): Promise<CarRecord[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const { data, error } = await supabase().rpc("search_cars", {
    q,
    max_results: limit,
  });
  if (error) throw error;
  // The RPC returns full car rows; the client reads only the CarRecord subset.
  return (data ?? []) as CarRecord[];
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
