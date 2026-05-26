"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SITE_SETTINGS_FALLBACK, type SiteSettings } from "@/lib/site-settings-shared";

export type { SiteSettings };

// Editable site content (price, phone, WhatsApp, card prices, social, media,
// serviceRadius, booking). Server-rendered initially via the root layout and
// then refreshed periodically so admin changes (e.g. a radius bump) reach an
// already-open client without a full page reload.
const SiteSettingsContext = createContext<SiteSettings>(SITE_SETTINGS_FALLBACK);

// Settings change rarely (admin edits). Polling every 30s hit Supabase from
// every open tab — 5 min is more than fresh enough, and we still refetch on
// focus (throttled below) so coming back to the tab pulls the latest.
const POLL_INTERVAL_MS = 300_000;
const FOCUS_REFETCH_MIN_GAP_MS = 60_000;

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteSettings;
  children: React.ReactNode;
}) {
  // Seed from the server-rendered value; subsequent updates flow through the
  // polling effect below.
  const [current, setCurrent] = useState<SiteSettings>(value);

  useEffect(() => {
    let cancelled = false;
    let lastFetch = Date.now();
    const refresh = async () => {
      try {
        const res = await fetch("/api/site-settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as SiteSettings;
        if (!cancelled) {
          setCurrent(data);
          lastFetch = Date.now();
        }
      } catch {
        // network blip — keep last good value
      }
    };
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => {
      if (Date.now() - lastFetch >= FOCUS_REFETCH_MIN_GAP_MS) refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <SiteSettingsContext.Provider value={current}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}

/** Digits-only helper for wa.me / tel hrefs. */
export function digits(v: string): string {
  return v.replace(/[^\d]/g, "");
}
