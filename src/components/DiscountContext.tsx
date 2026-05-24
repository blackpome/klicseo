"use client";

import { createContext, useContext } from "react";
import { ALL_PRICE_LINES, ZERO_DISCOUNTS, effectiveDiscounts, type PriceLine, type ServiceDiscounts } from "@/lib/pricing";

type BadgeFlags = Record<PriceLine, boolean>;
type LineIdMap = Record<string, number | boolean>;

interface DiscountState {
  discounts: ServiceDiscounts;
  badges: BadgeFlags;
  /** Raw % per service_price_lines.id — covers admin-created lines. */
  percentsByLineId: Record<string, number>;
  badgesByLineId: Record<string, boolean>;
}

const ALL_ON = Object.fromEntries(ALL_PRICE_LINES.map((l) => [l, true])) as BadgeFlags;

const DiscountContext = createContext<DiscountState>({
  discounts: ZERO_DISCOUNTS,
  badges: ALL_ON,
  percentsByLineId: {},
  badgesByLineId: {},
});

export function DiscountProvider({
  discounts,
  badges,
  percentsByLineId = {},
  badgesByLineId = {},
  children,
}: {
  discounts: ServiceDiscounts;
  badges: BadgeFlags;
  percentsByLineId?: Record<string, number>;
  badgesByLineId?: Record<string, boolean>;
  children: React.ReactNode;
}) {
  // Unused type-helper reference — keeps eslint quiet about LineIdMap.
  void (null as unknown as LineIdMap);
  return (
    <DiscountContext.Provider value={{ discounts, badges, percentsByLineId, badgesByLineId }}>{children}</DiscountContext.Provider>
  );
}

export function useServiceDiscounts(): ServiceDiscounts {
  const { discounts, badges } = useContext(DiscountContext);
  return effectiveDiscounts(discounts, badges);
}

export function useBadges(): BadgeFlags {
  return useContext(DiscountContext).badges;
}

/** Raw + badge maps keyed by service_price_lines.id. Used by the catalog
 *  pricing path which prices any line, legacy or not. */
export function useDiscountsByLineId(): { percents: Record<string, number>; badges: Record<string, boolean> } {
  const { percentsByLineId, badgesByLineId } = useContext(DiscountContext);
  return { percents: percentsByLineId, badges: badgesByLineId };
}

/** Whether a specific line should show its "% OFF" badge (toggle on + discount > 0). */
export function useLineBadge(line: PriceLine): boolean {
  const { discounts, badges } = useContext(DiscountContext);
  return !!badges[line] && (discounts[line] ?? 0) > 0;
}

/** Highest active discount among lines whose badge is enabled (0 if none). */
export function useMaxDiscount(): number {
  const { discounts, badges } = useContext(DiscountContext);
  let max = 0;
  for (const line of ALL_PRICE_LINES) {
    if (badges[line] && (discounts[line] ?? 0) > max) max = discounts[line];
  }
  return max;
}
