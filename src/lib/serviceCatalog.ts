import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import { ALL_PRICE_LINES, type PriceLine } from "./pricing";
import type {
  ServiceCatalog,
  CatalogCategory,
  CatalogOption,
  CatalogPriceLine,
} from "./serviceCatalog-shared";

export type {
  ServiceCatalog,
  CatalogCategory,
  CatalogOption,
  CatalogPriceLine,
} from "./serviceCatalog-shared";

/**
 * The whole dynamic catalog in one round-trip, React-cached per request so
 * downstream call sites can use it freely. During the migration this exists
 * alongside the hardcoded enums in pricing.ts; once Phase 5+ swap reads over,
 * pricing.ts will derive its enums from this.
 */
export const getServiceCatalog = cache(async (): Promise<ServiceCatalog> => {
  const sb = supabase();
  const [cats, opts, lines] = await Promise.all([
    sb.from("service_categories").select("*").order("sort_order").order("label"),
    sb.from("service_options").select("*").order("sort_order").order("label"),
    sb.from("service_price_lines").select("*").order("sort_order").order("label"),
  ]);
  if (cats.error) throw cats.error;
  if (opts.error) throw opts.error;
  if (lines.error) throw lines.error;

  const categories = (cats.data ?? []) as CatalogCategory[];
  const options = (opts.data ?? []) as CatalogOption[];
  const priceLines = (lines.data ?? []) as CatalogPriceLine[];

  const byLegacyLine: Record<string, CatalogPriceLine> = {};
  for (const l of priceLines) if (l.legacy_line) byLegacyLine[l.legacy_line] = l;

  return { categories, options, priceLines, byLegacyLine };
});

/** A `{ legacy_line → amount }` map for a single tier, from price_tier_amounts. */
export async function getTierAmountsByLegacyLine(tierId: string): Promise<Record<PriceLine, number | null>> {
  const sb = supabase();
  const { data, error } = await sb
    .from("price_tier_amounts")
    .select("amount, service_price_lines!inner(legacy_line)")
    .eq("tier_id", tierId);
  if (error) throw error;
  return mergeLegacyAmounts(data);
}

// Supabase-js types the embedded relation as an array even on 1:1 joins; this
// helper normalises both shapes and folds them into the legacy keyed map.
function mergeLegacyAmounts(rows: unknown): Record<PriceLine, number | null> {
  const out = blankLegacyMap();
  const arr = Array.isArray(rows) ? (rows as Array<{ amount: number | null; service_price_lines: unknown }>) : [];
  for (const row of arr) {
    const rel = row.service_price_lines;
    const relRow = Array.isArray(rel) ? rel[0] : rel;
    const key = (relRow as { legacy_line: string | null } | undefined)?.legacy_line;
    if (key && isPriceLineKey(key)) out[key] = row.amount;
  }
  return out;
}

function blankLegacyMap(): Record<PriceLine, number | null> {
  const out = {} as Record<PriceLine, number | null>;
  for (const k of ALL_PRICE_LINES) out[k] = null;
  return out;
}

function isPriceLineKey(v: string): v is PriceLine {
  return (ALL_PRICE_LINES as string[]).includes(v);
}

// --- Writes (used by /admin/services in Phase 3) -------------------------
// These never touch the legacy columns, so editing here can't break the live
// site during the transition.

export interface CategoryPatch {
  label?: string;
  blurb?: string | null;
  enabled?: boolean;
  sort_order?: number;
}

export async function updateCategory(id: string, patch: CategoryPatch): Promise<void> {
  const { error } = await supabase()
    .from("service_categories")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export interface OptionPatch {
  label?: string;
  short_label?: string | null;
  blurb?: string | null;
  enabled?: boolean;
  sort_order?: number;
  has_addon?: boolean;
}

export async function updateOption(id: string, patch: OptionPatch): Promise<void> {
  const { error } = await supabase()
    .from("service_options")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Apply sort_order to a list of categories in one round-trip (one row each). */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const sb = supabase();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb.from("service_categories").update({ sort_order: idx + 1, updated_at: new Date().toISOString() }).eq("id", id),
    ),
  );
}

/** Apply sort_order to a list of options within one category. */
export async function reorderOptions(orderedIds: string[]): Promise<void> {
  const sb = supabase();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb.from("service_options").update({ sort_order: idx + 1, updated_at: new Date().toISOString() }).eq("id", id),
    ),
  );
}

// --- Create / delete -----------------------------------------------------

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

/** Find a free slug by appending -2, -3, … on conflict. */
async function uniqueSlug(table: "service_categories" | "service_options", base: string): Promise<string> {
  const sb = supabase();
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await sb.from(table).select("slug").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
  // Fall back to a timestamped suffix if 50 collisions in a row (unlikely).
  return `${base}-${Date.now()}`;
}

async function nextCategorySortOrder(): Promise<number> {
  const sb = supabase();
  const { data } = await sb.from("service_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return ((data as { sort_order: number } | null)?.sort_order ?? 0) + 1;
}

async function nextOptionSortOrder(categoryId: string): Promise<number> {
  const sb = supabase();
  const { data } = await sb.from("service_options").select("sort_order").eq("category_id", categoryId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return ((data as { sort_order: number } | null)?.sort_order ?? 0) + 1;
}

export interface NewCategory {
  label: string;
  blurb: string | null;
}

export async function createCategory(input: NewCategory): Promise<string> {
  const sb = supabase();
  const slug = await uniqueSlug("service_categories", slugify(input.label));
  const { data, error } = await sb
    .from("service_categories")
    .insert({ slug, label: input.label, blurb: input.blurb, sort_order: await nextCategorySortOrder(), enabled: true })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Deletes the category and (via FK cascade) all its options + price_lines + amounts. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase().from("service_categories").delete().eq("id", id);
  if (error) throw error;
}

export interface NewOption {
  categoryId: string;
  label: string;
  shortLabel: string | null;
  blurb: string | null;
  recurring: "monthly" | "one_time";
  hasOutsideVariant: boolean;
  hasAddon: boolean;
  /** When true, this option IS the category's interior add-on: it gets a single
   *  base price line (the per-tier add-on price) and never an outside/addon line. */
  isAddon?: boolean;
}

/**
 * Create a sub-option and the price lines it needs:
 *   - one `base` line (required)
 *   - one `outside` line if hasOutsideVariant
 *   - one category-level `addon` line if hasAddon and the category doesn't already have one
 *
 * New rows have no legacy_id / legacy_line — the booking wizard's options
 * iterator filters through OPTIONS_BY_CATEGORY (keyed on legacy_id) so brand
 * new options stay invisible to customers until pricing.ts is updated by code.
 * Admins can still set their tier prices via the existing tier editor.
 */
export async function createOption(input: NewOption): Promise<string> {
  const sb = supabase();
  const isAddon = input.isAddon === true;
  const slug = await uniqueSlug("service_options", slugify(input.label));
  const sort = await nextOptionSortOrder(input.categoryId);
  const { data, error } = await sb
    .from("service_options")
    .insert({
      category_id: input.categoryId,
      slug,
      label: input.label,
      short_label: input.shortLabel,
      blurb: input.blurb,
      recurring: input.recurring,
      // An add-on option carries neither an outside variant nor its own add-on.
      has_outside_variant: isAddon ? false : input.hasOutsideVariant,
      has_addon: isAddon ? false : input.hasAddon,
      is_addon: isAddon,
      sort_order: sort,
      enabled: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  const optionId = (data as { id: string }).id;

  // base line — required. For an add-on option this single line is its per-tier
  // add-on price (rendered as the interior price box in the Cars tab).
  const lineRows: Array<{
    category_id: string; option_id: string | null; kind: "base" | "outside" | "addon";
    label: string; sort_order: number;
  }> = [
    { category_id: input.categoryId, option_id: optionId, kind: "base", label: input.label, sort_order: 1 },
  ];
  if (!isAddon && input.hasOutsideVariant) {
    lineRows.push({ category_id: input.categoryId, option_id: optionId, kind: "outside", label: `Outside ${input.label}`, sort_order: 2 });
  }
  const { error: linesErr } = await sb.from("service_price_lines").insert(lineRows);
  if (linesErr) throw linesErr;

  // Category-level addon: only create if the category doesn't already have one.
  if (!isAddon && input.hasAddon) {
    const { data: existing } = await sb
      .from("service_price_lines")
      .select("id")
      .eq("category_id", input.categoryId)
      .eq("kind", "addon")
      .maybeSingle();
    if (!existing) {
      const { error: addonErr } = await sb.from("service_price_lines").insert({
        category_id: input.categoryId, option_id: null, kind: "addon",
        label: "Add-on", sort_order: 99,
      });
      if (addonErr) throw addonErr;
    }
  }

  return optionId;
}

/** Deletes the option and (via FK cascade) its price_lines + their tier/car amounts. */
export async function deleteOption(id: string): Promise<void> {
  const { error } = await supabase().from("service_options").delete().eq("id", id);
  if (error) throw error;
}
