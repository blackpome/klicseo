"use client";

import { createContext, useContext } from "react";
import { ALL_PRICE_LINES, ZERO_DISCOUNTS, type PriceLine, type ServiceDiscounts } from "@/lib/pricing";

type BadgeFlags = Record<PriceLine, boolean>;

// Per-line discount % + per-line badge on/off, fetched once on the server (root
// layout) and shared with every client component below — so price displays and
// the offer badge reflect live settings without prop-drilling.
interface DiscountState {
  discounts: ServiceDiscounts;
  badges: BadgeFlags;
}

const ALL_ON = Object.fromEntries(ALL_PRICE_LINES.map((l) => [l, true])) as BadgeFlags;

const DiscountContext = createContext<DiscountState>({
  discounts: ZERO_DISCOUNTS,
  badges: ALL_ON,
});

export function DiscountProvider({
  discounts,
  badges,
  children,
}: {
  discounts: ServiceDiscounts;
  badges: BadgeFlags;
  children: React.ReactNode;
}) {
  return (
    <DiscountContext.Provider value={{ discounts, badges }}>{children}</DiscountContext.Provider>
  );
}

export function useServiceDiscounts(): ServiceDiscounts {
  return useContext(DiscountContext).discounts;
}

export function useBadges(): BadgeFlags {
  return useContext(DiscountContext).badges;
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
