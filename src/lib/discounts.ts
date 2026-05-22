import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import {
  ALL_PRICE_LINES,
  ZERO_DISCOUNTS,
  isPriceLine,
  type PriceLine,
  type ServiceDiscounts,
} from "./pricing";

export type BadgeFlags = Record<PriceLine, boolean>;

function allBadgesOn(): BadgeFlags {
  return Object.fromEntries(ALL_PRICE_LINES.map((l) => [l, true])) as BadgeFlags;
}

export interface DiscountConfig {
  percents: ServiceDiscounts;
  badges: BadgeFlags;
}

// Per-line discount % + badge on/off from service_discounts. Deduped per
// request. Falls back to zeros / badges-on if the table is unreadable.
export const getDiscountConfig = cache(async (): Promise<DiscountConfig> => {
  const percents: ServiceDiscounts = { ...ZERO_DISCOUNTS };
  const badges: BadgeFlags = allBadgesOn();
  try {
    const { data, error } = await supabase()
      .from("service_discounts")
      .select("line,discount_percent,badge_enabled");
    if (error) throw error;
    for (const row of (data ?? []) as { line: string; discount_percent: number; badge_enabled: boolean }[]) {
      if (isPriceLine(row.line)) {
        percents[row.line] = row.discount_percent ?? 0;
        badges[row.line] = row.badge_enabled ?? true;
      }
    }
  } catch {
    // leave defaults
  }
  return { percents, badges };
});

export async function getServiceDiscounts(): Promise<ServiceDiscounts> {
  return (await getDiscountConfig()).percents;
}

export async function getBadgeFlags(): Promise<BadgeFlags> {
  return (await getDiscountConfig()).badges;
}

export async function setServiceDiscount(
  line: string,
  percent: number,
  badgeEnabled: boolean,
): Promise<void> {
  if (!isPriceLine(line)) throw new Error("Invalid price line.");
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const { error } = await supabase()
    .from("service_discounts")
    .update({ discount_percent: pct, badge_enabled: badgeEnabled, updated_at: new Date().toISOString() })
    .eq("line", line);
  if (error) throw error;
}

export { ALL_PRICE_LINES };
