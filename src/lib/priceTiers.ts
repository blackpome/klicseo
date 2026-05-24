import "server-only";
import { supabase } from "./supabase";
import { ALL_PRICE_LINES, type PriceLine } from "./pricing";
import { EMPTY_TIER_PRICES, type LineAmounts, type PriceTier, type TierPrices } from "./priceTiers-shared";

export type { LineAmounts, PriceTier, TierPrices } from "./priceTiers-shared";

// price_tiers now only stores metadata (id, name, sort_order). Prices live in
// price_tier_amounts as (tier_id, line_id, amount). We project them back into
// the legacy-line-keyed shape PriceTier expects so admin UI / cars-lib code
// keeps working without callsite changes.

const TIER_META_COLUMNS = "id,name,sort_order";

/** Bulk-load amounts for a set of tier ids, returning a map of legacy-line-keyed prices per tier. */
async function loadAmountsFor(tierIds: string[]): Promise<Map<string, TierPrices>> {
  const out = new Map<string, TierPrices>();
  if (tierIds.length === 0) return out;
  const { data, error } = await supabase()
    .from("price_tier_amounts")
    .select("tier_id, amount, service_price_lines!inner(legacy_line)")
    .in("tier_id", tierIds);
  if (error) throw error;
  type Row = {
    tier_id: string;
    amount: number | null;
    service_price_lines: { legacy_line: string | null } | Array<{ legacy_line: string | null }>;
  };
  for (const row of (data ?? []) as unknown as Row[]) {
    const rel = row.service_price_lines;
    const relRow = Array.isArray(rel) ? rel[0] : rel;
    const key = relRow?.legacy_line;
    if (!key || !isPriceLineKey(key)) continue;
    let bucket = out.get(row.tier_id);
    if (!bucket) { bucket = { ...EMPTY_TIER_PRICES }; out.set(row.tier_id, bucket); }
    bucket[key] = row.amount;
  }
  return out;
}

function isPriceLineKey(v: string): v is PriceLine {
  return (ALL_PRICE_LINES as string[]).includes(v);
}

/**
 * Source-of-truth writer for tier prices, keyed by line_id (works for every
 * line in the catalog — legacy or brand-new). Upserts one row per
 * (tier_id, line_id) into price_tier_amounts.
 */
async function writeTierAmountsByLineId(tierId: string, amounts: LineAmounts): Promise<void> {
  const entries = Object.entries(amounts);
  if (entries.length === 0) return;
  const rows = entries.map(([line_id, amount]) => ({ tier_id: tierId, line_id, amount }));
  const { error } = await supabase()
    .from("price_tier_amounts")
    .upsert(rows, { onConflict: "tier_id,line_id" });
  if (error) throw error;
}

/** Bulk-load every tier's amounts keyed by line_id (for the tier editor inputs). */
export async function listLineAmountsByTier(tierIds: string[]): Promise<Record<string, LineAmounts>> {
  const out: Record<string, LineAmounts> = {};
  if (tierIds.length === 0) return out;
  const { data, error } = await supabase()
    .from("price_tier_amounts")
    .select("tier_id, line_id, amount")
    .in("tier_id", tierIds);
  if (error) throw error;
  for (const r of (data ?? []) as Array<{ tier_id: string; line_id: string; amount: number | null }>) {
    (out[r.tier_id] ??= {})[r.line_id] = r.amount;
  }
  return out;
}

/** All tiers, plus the car count assigned to each. */
export async function listTiersWithCounts(): Promise<PriceTier[]> {
  const sb = supabase();
  const [tiersRes, countsRes] = await Promise.all([
    sb.from("price_tiers").select(TIER_META_COLUMNS).order("sort_order").order("name"),
    sb.from("cars").select("tier_id"),
  ]);
  if (tiersRes.error) throw tiersRes.error;
  if (countsRes.error) throw countsRes.error;

  const tiers = (tiersRes.data ?? []) as Array<{ id: string; name: string; sort_order: number }>;
  const amountsByTier = await loadAmountsFor(tiers.map((t) => t.id));

  const counts = new Map<string, number>();
  for (const row of (countsRes.data ?? []) as { tier_id: string | null }[]) {
    if (row.tier_id) counts.set(row.tier_id, (counts.get(row.tier_id) ?? 0) + 1);
  }

  return tiers.map((t) => ({
    ...t,
    ...(amountsByTier.get(t.id) ?? EMPTY_TIER_PRICES),
    car_count: counts.get(t.id) ?? 0,
  }));
}

export async function getTier(id: string): Promise<PriceTier | null> {
  const sb = supabase();
  const { data, error } = await sb.from("price_tiers").select(TIER_META_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const tier = data as { id: string; name: string; sort_order: number };
  const amounts = (await loadAmountsFor([tier.id])).get(tier.id) ?? EMPTY_TIER_PRICES;
  return { ...tier, ...amounts };
}

/** Insert a new tier; sort_order defaults to (max + 1). */
export async function createTier(name: string, amounts: LineAmounts): Promise<{ id: string }> {
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
    .insert({ name, sort_order: next })
    .select("id")
    .single();
  if (error) throw error;
  const meta = data as { id: string };
  await writeTierAmountsByLineId(meta.id, amounts);
  return { id: meta.id };
}

/**
 * Update a tier's metadata and/or its prices. Prices go straight to
 * price_tier_amounts (the source of truth); the price_tiers row only carries
 * metadata now. Cars read prices via their tier on next request — no
 * propagation needed.
 */
export async function updateTier(
  id: string,
  patch: { name?: string; sort_order?: number; amounts?: LineAmounts },
): Promise<void> {
  const sb = supabase();

  const metaPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("name" in patch) metaPatch.name = patch.name;
  if ("sort_order" in patch) metaPatch.sort_order = patch.sort_order;

  if (Object.keys(metaPatch).length > 1) {
    const { error } = await sb.from("price_tiers").update(metaPatch).eq("id", id);
    if (error) throw error;
  }

  if (patch.amounts && Object.keys(patch.amounts).length > 0) {
    await writeTierAmountsByLineId(id, patch.amounts);
  }
}

/** Delete a tier; member cars are unassigned via FK ON DELETE SET NULL, and
 *  price_tier_amounts rows cascade. */
export async function deleteTier(id: string): Promise<void> {
  const { error } = await supabase().from("price_tiers").delete().eq("id", id);
  if (error) throw error;
}

/** Assign cars to a tier. Prices are resolved through the tier on read. */
export async function assignCarsToTier(carIds: string[], tierId: string): Promise<void> {
  if (carIds.length === 0) return;
  const { error } = await supabase().from("cars").update({ tier_id: tierId }).in("id", carIds);
  if (error) throw error;
}

/** Detach cars from any tier — they'll show no prices in the wizard. */
export async function unassignCars(carIds: string[]): Promise<void> {
  if (carIds.length === 0) return;
  const { error } = await supabase().from("cars").update({ tier_id: null }).in("id", carIds);
  if (error) throw error;
}
