"use client";

import { createContext, useContext } from "react";
import { CARD_DEFAULTS, type CardPrices } from "@/lib/card-prices-shared";

export interface SiteSettings {
  startPrice: number;
  phone: string;
  whatsapp: string;
  cardPrices: CardPrices;
}

// Editable site content (starting price, phone, WhatsApp, card prices), fetched
// on the server (root layout) and shared with client components without
// prop-drilling.
const SiteSettingsContext = createContext<SiteSettings>({
  startPrice: 19,
  phone: "+91 79043 32212",
  whatsapp: "+917904332212",
  cardPrices: CARD_DEFAULTS,
});

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteSettings;
  children: React.ReactNode;
}) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}

/** Digits-only helper for wa.me / tel hrefs. */
export function digits(v: string): string {
  return v.replace(/[^\d]/g, "");
}
