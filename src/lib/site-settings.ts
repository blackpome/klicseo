import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import { businessPhone } from "./seo";
import { SUPPORT_PHONE } from "./serviceability";
import { CARD_DEFAULTS, CARD_DEFS, isCardId, type CardPrices } from "./card-prices-shared";
import {
  BOOKING_DEFAULTS,
  BOOKING_STEP_DEFS,
  normalizeField,
  MEDIA_DEFAULTS,
  SOCIAL_DEFAULTS,
  SOCIAL_PLATFORMS,
  isMediaKey,
  isSocialKey,
  type BookingConfig,
  type CustomField,
  type Media,
  type MediaKey,
  type SiteSettings,
  type SocialLinks,
} from "./site-settings-shared";

export * from "./site-settings-shared";

// Editable site content stored in app_settings (key/value). Falls back to the
// code defaults when a key isn't set, so the site works before anything's saved.

export const SITE_DEFAULTS: SiteSettings = {
  startPrice: 19,
  phone: businessPhone,
  whatsapp: SUPPORT_PHONE,
  cardPrices: CARD_DEFAULTS,
  social: SOCIAL_DEFAULTS,
  media: MEDIA_DEFAULTS,
  booking: BOOKING_DEFAULTS,
};

const KEYS = {
  startPrice: "start_price",
  phone: "phone",
  whatsapp: "whatsapp",
  cardPrices: "card_prices",
  social: "social",
  media: "media",
  booking: "booking",
} as const;

const MEDIA_BUCKET = "site-media";

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

function parseSocial(raw: string): SocialLinks {
  const out: SocialLinks = { ...SOCIAL_DEFAULTS };
  try {
    const obj = JSON.parse(raw) as Record<string, { url?: string; enabled?: boolean }>;
    for (const p of SOCIAL_PLATFORMS) {
      const v = obj[p.key];
      if (v) out[p.key] = { url: typeof v.url === "string" ? v.url : "", enabled: !!v.enabled };
    }
  } catch {
    // keep defaults
  }
  return out;
}

function parseMedia(raw: string): Media {
  const out: Media = { heroVideo: { ...MEDIA_DEFAULTS.heroVideo }, packageVideo: { ...MEDIA_DEFAULTS.packageVideo } };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (!isMediaKey(key)) continue;
      const v = obj[key];
      if (typeof v === "string") {
        out[key] = { url: v, type: "video" }; // legacy shape
      } else if (v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string") {
        const item = v as { url: string; type?: unknown };
        out[key] = { url: item.url, type: item.type === "image" ? "image" : "video" };
      }
    }
  } catch {
    // keep defaults
  }
  return out;
}

function parseBooking(raw: string): BookingConfig {
  const out: BookingConfig = { ...BOOKING_DEFAULTS };
  try {
    const obj = JSON.parse(raw) as Record<string, { title?: unknown; subtitle?: unknown }>;
    for (const s of BOOKING_STEP_DEFS) {
      const v = obj[s.key] as { title?: unknown; subtitle?: unknown; fields?: unknown; builtins?: unknown; messages?: unknown } | undefined;
      if (v) {
        const fields = Array.isArray(v.fields)
          ? v.fields.map(normalizeField).filter((f): f is CustomField => f !== null)
          : [];
        const builtins: Record<string, { enabled: boolean; required: boolean }> = {};
        if (v.builtins && typeof v.builtins === "object") {
          for (const [k, raw] of Object.entries(v.builtins as Record<string, { enabled?: unknown; required?: unknown }>)) {
            builtins[k] = { enabled: !!raw?.enabled, required: !!raw?.required };
          }
        }
        const messages: Record<string, string> = {};
        if (v.messages && typeof v.messages === "object") {
          for (const [k, raw] of Object.entries(v.messages as Record<string, unknown>)) {
            if (typeof raw === "string") messages[k] = raw;
          }
        }
        out[s.key] = {
          title: typeof v.title === "string" ? v.title : "",
          subtitle: typeof v.subtitle === "string" ? v.subtitle : "",
          fields,
          builtins,
          messages,
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
      } else if (row.key === KEYS.social && row.value) {
        out.social = parseSocial(row.value);
      } else if (row.key === KEYS.media && row.value) {
        out.media = parseMedia(row.value);
      } else if (row.key === KEYS.booking && row.value) {
        out.booking = parseBooking(row.value);
      }
    }
  } catch {
    // keep defaults
  }
  return out;
});

// Save the text settings + social links (media is managed via upload/reset).
export async function setSiteSettings(
  s: Pick<SiteSettings, "startPrice" | "phone" | "whatsapp" | "cardPrices" | "social">,
): Promise<void> {
  const rows = [
    { key: KEYS.startPrice, value: String(Math.max(0, Math.round(s.startPrice))) },
    { key: KEYS.phone, value: s.phone.trim() },
    { key: KEYS.whatsapp, value: s.whatsapp.trim() },
    { key: KEYS.cardPrices, value: JSON.stringify(s.cardPrices) },
    { key: KEYS.social, value: JSON.stringify(s.social) },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await supabase().from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

// --- booking wizard config ---------------------------------------------

export async function setBookingConfig(booking: BookingConfig): Promise<void> {
  const { error } = await supabase()
    .from("app_settings")
    .upsert({ key: KEYS.booking, value: JSON.stringify(booking), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// --- media (videos) -----------------------------------------------------

async function getMedia(): Promise<Media> {
  const { data } = await supabase().from("app_settings").select("value").eq("key", KEYS.media).maybeSingle();
  return data?.value ? parseMedia(data.value) : { ...MEDIA_DEFAULTS };
}

async function saveMedia(media: Media): Promise<void> {
  const { error } = await supabase()
    .from("app_settings")
    .upsert({ key: KEYS.media, value: JSON.stringify(media), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

// Upload a new video OR image for a media slot and point the setting at it.
// Cache-busted with a timestamp so the new file shows immediately.
export async function uploadSiteMedia(key: MediaKey, file: File): Promise<void> {
  const isImage = file.type.startsWith("image/");
  const ext = EXT_BY_MIME[file.type] || (/\.(\w+)$/.exec(file.name)?.[1] ?? (isImage ? "jpg" : "mp4"));
  const path = `${key}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase()
    .storage.from(MEDIA_BUCKET)
    .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: true });
  if (error) throw error;

  const { data } = supabase().storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const media = await getMedia();
  media[key] = { url: data.publicUrl, type: isImage ? "image" : "video" };
  await saveMedia(media);
}

// Reset a slot back to the bundled default (clears the uploaded file).
export async function resetSiteMedia(key: MediaKey): Promise<void> {
  const media = await getMedia();
  media[key] = { url: null, type: null };
  await saveMedia(media);
}

/** Digits-only for wa.me / tel hrefs. */
export function toDigits(v: string): string {
  return v.replace(/[^\d]/g, "");
}

export { isMediaKey, isSocialKey };
