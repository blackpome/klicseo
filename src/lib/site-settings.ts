import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import { businessPhone } from "./seo";
import { SUPPORT_PHONE } from "./serviceability";
import { CARD_DEFAULTS, CARD_DEFS, isCardId, type CardPrices } from "./card-prices-shared";

// Editable site content stored in app_settings (key/value). Falls back to the
// code defaults when a key isn't set, so the site works before anything's saved.

export interface SiteSettings {
  startPrice: number; // the "Starts @ ₹X" figure in Hero / sticky CTA
  phone: string; // display phone for call links
  whatsapp: string; // WhatsApp number for wa.me links
  cardPrices: CardPrices; // per-card "from" price + use-custom toggle
}

export const SITE_DEFAULTS: SiteSettings = {
  startPrice: 19,
  phone: businessPhone,
  whatsapp: SUPPORT_PHONE,
  cardPrices: CARD_DEFAULTS,
};

const KEYS = {
  startPrice: "start_price",
  phone: "phone",
  whatsapp: "whatsapp",
  cardPrices: "card_prices",
} as const;

function parseCardPrices(raw: string): CardPrices {
  const out: CardPrices = { ...CARD_DEFAULTS };
  try {
    const obj = JSON.parse(raw) as Record<string, { price?: number; enabled?: boolean }>;
    for (const d of CARD_DEFS) {
      const v = obj[d.id];
      if (v && isCardId(d.id)) {
        const price = Number(v.price);
        out[d.id] = {
          price: Number.isFinite(price) && price >= 0 ? Math.round(price) : d.default,
          enabled: !!v.enabled,
        };
      }
    }
  } catch {
    // keep defaults
  }
  return out;
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const out: SiteSettings = { ...SITE_DEFAULTS };
  try {
    const { data, error } = await supabase()
      .from("app_settings")
      .select("key,value")
      .in("key", Object.values(KEYS));
    if (error) throw error;
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      if (row.key === KEYS.startPrice) {
        const n = Number(row.value);
        if (Number.isFinite(n) && n >= 0) out.startPrice = Math.round(n);
      } else if (row.key === KEYS.phone && row.value) {
        out.phone = row.value;
      } else if (row.key === KEYS.whatsapp && row.value) {
        out.whatsapp = row.value;
      } else if (row.key === KEYS.cardPrices && row.value) {
        out.cardPrices = parseCardPrices(row.value);
      }
    }
  } catch {
    // keep defaults
  }
  return out;
});

export async function setSiteSettings(s: SiteSettings): Promise<void> {
  const rows = [
    { key: KEYS.startPrice, value: String(Math.max(0, Math.round(s.startPrice))) },
    { key: KEYS.phone, value: s.phone.trim() },
    { key: KEYS.whatsapp, value: s.whatsapp.trim() },
    { key: KEYS.cardPrices, value: JSON.stringify(s.cardPrices) },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await supabase().from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

/** Digits-only for wa.me / tel hrefs. */
export function toDigits(v: string): string {
  return v.replace(/[^\d]/g, "");
}
