"use client";

import { createContext, useContext } from "react";
import { SITE_SETTINGS_FALLBACK, type SiteSettings } from "@/lib/site-settings-shared";

export type { SiteSettings };

// Editable site content (price, phone, WhatsApp, card prices, social, media),
// fetched on the server (root layout) and shared with client components without
// prop-drilling.
const SiteSettingsContext = createContext<SiteSettings>(SITE_SETTINGS_FALLBACK);

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
