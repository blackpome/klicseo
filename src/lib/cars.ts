import "server-only";
import { supabase } from "./supabase";
import type { CarRecord } from "./carPricing";

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
