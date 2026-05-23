import "server-only";
import { supabase } from "./supabase";
import { ALL_PRICE_LINES } from "./pricing";
import type { PriceTier, TierPrices } from "./priceTiers-shared";

export type { PriceTier, TierPrices } from "./priceTiers-shared";

const TIER_COLUMNS = `id,name,sort_order,${ALL_PRICE_LINES.join(",")}`;

/** All tiers, plus the car count assigned to each. */
export async function listTiersWithCounts(): Promise<PriceTier[]> {
  const sb = supabase();
  const [tiersRes, countsRes] = await Promise.all([
    sb.from("price_tiers").select(TIER_COLUMNS).order("sort_order").order("name"),
    sb.from("cars").select("tier_id"),
  ]);
  if (tiersRes.error) throw tiersRes.error;
  if (countsRes.error) throw countsRes.error;

  const counts = new Map<string, number>();
  for (const row of (countsRes.data ?? []) as { tier_id: string | null }[]) {
    if (row.tier_id) counts.set(row.tier_id, (counts.get(row.tier_id) ?? 0) + 1);
  }
  return ((tiersRes.data ?? []) as unknown as PriceTier[]).map((t) => ({
    ...t,
    car_count: counts.get(t.id) ?? 0,
  }));
}

export async function getTier(id: string): Promise<PriceTier | null> {
  const { data, error } = await supabase().from("price_tiers").select(TIER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as PriceTier | null;
}

/** Insert a new tier; sort_order defaults to (max + 1). */
export async function createTier(name: string, prices: TierPrices): Promise<PriceTier> {
  const sb = supabase();
  const { data: maxRow } = await sb
    .from("price_tiers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await sb
    .from("price_tiers")
    .insert({ name, sort_order: next, ...prices })
    .select(TIER_COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as PriceTier;
}

/**
 * Update a tier and propagate the new prices onto every car assigned to it,
 * so existing read paths (booking wizard, etc.) keep working unchanged.
 */
export async function updateTier(
  id: string,
  patch: { name?: string; sort_order?: number } & Partial<TierPrices>,
): Promise<void> {
  const sb = supabase();
  const { error } = await sb.from("price_tiers").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;

  // Mirror price columns onto member cars. We only mirror the keys actually
  // in the patch — leaving `name`/`sort_order` out — so a rename doesn't
  // touch car rows.
  const priceMirror: Record<string, unknown> = {};
  for (const line of ALL_PRICE_LINES) {
    if (line in patch) priceMirror[line] = (patch as Record<string, unknown>)[line];
  }
  if (Object.keys(priceMirror).length > 0) {
    const { error: e2 } = await sb.from("cars").update(priceMirror).eq("tier_id", id);
    if (e2) throw e2;
  }
}

/** Delete a tier; member cars are unassigned (FK is on delete set null) and keep their last prices. */
export async function deleteTier(id: string): Promise<void> {
  const { error } = await supabase().from("price_tiers").delete().eq("id", id);
  if (error) throw error;
}

/** Assign cars to a tier and copy the tier's prices onto each. */
export async function assignCarsToTier(carIds: string[], tierId: string): Promise<void> {
  if (carIds.length === 0) return;
  const sb = supabase();
  const tier = await getTier(tierId);
  if (!tier) throw new Error("Tier not found");
  const priceMirror: Record<string, unknown> = { tier_id: tierId };
  for (const line of ALL_PRICE_LINES) priceMirror[line] = (tier as unknown as Record<string, unknown>)[line] ?? null;
  const { error } = await sb.from("cars").update(priceMirror).in("id", carIds);
  if (error) throw error;
}

/** Detach cars from any tier (their price columns are left as-is). */
export async function unassignCars(carIds: string[]): Promise<void> {
  if (carIds.length === 0) return;
  const { error } = await supabase().from("cars").update({ tier_id: null }).in("id", carIds);
  if (error) throw error;
}
