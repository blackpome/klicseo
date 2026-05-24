import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import {
  ALL_PRICE_LINES,
  ZERO_DISCOUNTS,
  effectiveDiscounts,
  isPriceLine,
  type PriceLine,
  type ServiceDiscounts,
} from "./pricing";

export type BadgeFlags = Record<PriceLine, boolean>;

function allBadgesOn(): BadgeFlags {
  return Object.fromEntries(ALL_PRICE_LINES.map((l) => [l, true])) as BadgeFlags;
}

export interface DiscountConfig {
  /** Legacy 9-line keyed maps. Always populated. */
  percents: ServiceDiscounts;
  badges: BadgeFlags;
  /** Catalog-line-id keyed maps. Covers EVERY catalog line including
   *  admin-created ones with no legacy_line. */
  percentsByLineId: Record<string, number>;
  badgesByLineId: Record<string, boolean>;
}

// Per-line discount % + badge on/off from service_discounts. Deduped per
// request. Falls back to zeros / badges-on if the table is unreadable.
export const getDiscountConfig = cache(async (): Promise<DiscountConfig> => {
  const percents: ServiceDiscounts = { ...ZERO_DISCOUNTS };
  const badges: BadgeFlags = allBadgesOn();
  const percentsByLineId: Record<string, number> = {};
  const badgesByLineId: Record<string, boolean> = {};
  try {
    const { data, error } = await supabase()
      .from("service_discounts")
      .select("line,line_id,discount_percent,badge_enabled");
    if (error) throw error;
    for (const row of (data ?? []) as { line: string; line_id: string | null; discount_percent: number; badge_enabled: boolean }[]) {
      if (isPriceLine(row.line)) {
        percents[row.line] = row.discount_percent ?? 0;
        badges[row.line] = row.badge_enabled ?? true;
      }
      if (row.line_id) {
        percentsByLineId[row.line_id] = row.discount_percent ?? 0;
        badgesByLineId[row.line_id] = row.badge_enabled ?? true;
      }
    }
  } catch {
    // leave defaults
  }
  return { percents, badges, percentsByLineId, badgesByLineId };
});

/**
 * Discounts ready to be applied to prices — badge-off lines are zeroed out so
 * the discount is fully disabled (no strike, no charge change). For the raw
 * percents (e.g. the admin editor), use getDiscountConfig().percents instead.
 */
export async function getServiceDiscounts(): Promise<ServiceDiscounts> {
  const cfg = await getDiscountConfig();
  return effectiveDiscounts(cfg.percents, cfg.badges);
}

export async function getBadgeFlags(): Promise<BadgeFlags> {
  return (await getDiscountConfig()).badges;
}

/** Save a discount row, addressed by service_price_lines.id (UUID). The
 *  trigger in migration 0022 guarantees a row exists for every catalog line. */
export async function setServiceDiscount(
  lineId: string,
  percent: number,
  badgeEnabled: boolean,
): Promise<void> {
  if (!lineId) throw new Error("Missing line id.");
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const { error } = await supabase()
    .from("service_discounts")
    .update({ discount_percent: pct, badge_enabled: badgeEnabled, updated_at: new Date().toISOString() })
    .eq("line_id", lineId);
  if (error) throw error;
}

export { ALL_PRICE_LINES };
