// Client-safe types for the dynamic service catalog (categories → options →
// price lines). Read from public.service_categories / service_options /
// service_price_lines via serviceCatalog.ts. Mirrored from the legacy enums in
// pricing.ts during the migration; the `legacy_*` fields tie a new row back to
// its hardcoded counterpart so transitional code can map between them.

export type PriceLineKind = "base" | "outside" | "addon";
export type Recurring = "monthly" | "one_time";

export interface CatalogPriceLine {
  id: string;
  category_id: string;
  option_id: string | null; // null for addon (category-level)
  kind: PriceLineKind;
  label: string;
  legacy_line: string | null;
  sort_order: number;
}

export interface CatalogOption {
  id: string;
  category_id: string;
  slug: string;
  label: string;
  short_label: string | null;
  blurb: string | null;
  recurring: Recurring;
  has_outside_variant: boolean;
  has_addon: boolean;
  /** True when this option IS an interior add-on: rendered as a toggle under a
   *  sibling base option in the wizard, never as its own card. */
  is_addon: boolean;
  sort_order: number;
  enabled: boolean;
  legacy_id: string | null;
}

export interface CatalogCategory {
  id: string;
  slug: string;
  label: string;
  blurb: string | null;
  icon_key: string | null;
  sort_order: number;
  enabled: boolean;
  legacy_key: string | null;
}

export interface ServiceCatalog {
  categories: CatalogCategory[];
  options: CatalogOption[];     // sorted by (category.sort_order, option.sort_order)
  priceLines: CatalogPriceLine[];
  // Lookup helpers populated by serviceCatalog.ts
  byLegacyLine: Record<string, CatalogPriceLine>;
}

/**
 * The enabled interior add-on option for a category (the one flagged is_addon),
 * or null when none / disabled. Used by the wizard to decide whether to show the
 * "Add interior…" toggle and where to read its price from.
 */
export function interiorAddonOptionFor(
  catalog: ServiceCatalog,
  categoryId: string,
): CatalogOption | null {
  return (
    catalog.options.find((o) => o.category_id === categoryId && o.is_addon && o.enabled) ?? null
  );
}

/** The base price line owned by an option (its per-tier price), or null. */
export function baseLineForOption(
  catalog: ServiceCatalog,
  optionId: string,
): CatalogPriceLine | null {
  return catalog.priceLines.find((l) => l.option_id === optionId && l.kind === "base") ?? null;
}
