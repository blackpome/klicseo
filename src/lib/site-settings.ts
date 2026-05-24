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
  SERVICE_RADIUS_DEFAULTS,
  SERVICE_RADIUS_KEYS,
  RADIUS_MIN_KM,
  RADIUS_MAX_KM,
  MESSAGE_TEMPLATE_DEFAULTS,
  MESSAGE_TEMPLATE_DEFS,
  isMessageTemplateKey,
  isMediaKey,
  isSocialKey,
  isServiceRadiusKey,
  type BookingConfig,
  type CustomField,
  type Media,
  type MediaKey,
  type ServiceRadius,
  type ServiceRadiusKey,
  type MessageTemplates,
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
  serviceRadius: SERVICE_RADIUS_DEFAULTS,
  messageTemplates: MESSAGE_TEMPLATE_DEFAULTS,
  catalog: null,
};

const KEYS = {
  startPrice: "start_price",
  phone: "phone",
  whatsapp: "whatsapp",
  cardPrices: "card_prices",
  social: "social",
  media: "media",
  booking: "booking",
  serviceRadius: "service_radius",
  messageTemplates: "message_templates",
} as const;

function parseMessageTemplates(raw: string): MessageTemplates {
  const out: MessageTemplates = { ...MESSAGE_TEMPLATE_DEFAULTS };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const def of MESSAGE_TEMPLATE_DEFS) {
      const v = obj[def.key];
      if (typeof v === "string" && v.trim()) out[def.key] = v;
    }
  } catch {
    // keep defaults
  }
  return out;
}

function clampRadius(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(RADIUS_MIN_KM, Math.min(RADIUS_MAX_KM, Math.round(n * 2) / 2));
}

function parseServiceRadius(raw: string): ServiceRadius {
  const out: ServiceRadius = { ...SERVICE_RADIUS_DEFAULTS };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (!isServiceRadiusKey(k)) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = clampRadius(n);
    }
  } catch {
    // keep defaults
  }
  return out;
}

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
        const flags: Record<string, boolean> = {};
        const rawFlags = (v as { flags?: unknown }).flags;
        if (rawFlags && typeof rawFlags === "object") {
          for (const [k, raw] of Object.entries(rawFlags as Record<string, unknown>)) {
            if (typeof raw === "boolean") flags[k] = raw;
          }
        }
        out[s.key] = {
          title: typeof v.title === "string" ? v.title : "",
          subtitle: typeof v.subtitle === "string" ? v.subtitle : "",
          fields,
          builtins,
          messages,
          flags,
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
  // Pull the dynamic catalog in parallel. A failure here shouldn't break
  // the rest of site settings — leave catalog as null and consumers fall
  // back to their hardcoded defaults.
  const catalogPromise = (async () => {
    try {
      const { getServiceCatalog } = await import("./serviceCatalog");
      return await getServiceCatalog();
    } catch {
      return null;
    }
  })();
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
      } else if (row.key === KEYS.serviceRadius && row.value) {
        out.serviceRadius = parseServiceRadius(row.value);
      } else if (row.key === KEYS.messageTemplates && row.value) {
        out.messageTemplates = parseMessageTemplates(row.value);
      }
    }
  } catch {
    // keep defaults
  }
  out.catalog = await catalogPromise;
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

// --- service radius -----------------------------------------------------

async function getServiceRadius(): Promise<ServiceRadius> {
  const { data } = await supabase().from("app_settings").select("value").eq("key", KEYS.serviceRadius).maybeSingle();
  return data?.value ? parseServiceRadius(data.value) : { ...SERVICE_RADIUS_DEFAULTS };
}

async function saveServiceRadius(r: ServiceRadius): Promise<void> {
  const { error } = await supabase()
    .from("app_settings")
    .upsert({ key: KEYS.serviceRadius, value: JSON.stringify(r), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

/** Set one service's radius (km), clamped to [RADIUS_MIN, RADIUS_MAX]. */
export async function setServiceRadius(service: ServiceRadiusKey, km: number): Promise<number> {
  const current = await getServiceRadius();
  const next = clampRadius(km);
  current[service] = next;
  await saveServiceRadius(current);
  return next;
}

/** Bump a service's radius by ±delta km (used by the admin +/− buttons). */
export async function bumpServiceRadius(service: ServiceRadiusKey, deltaKm: number): Promise<number> {
  const current = await getServiceRadius();
  const next = clampRadius((current[service] ?? SERVICE_RADIUS_DEFAULTS[service]) + deltaKm);
  current[service] = next;
  await saveServiceRadius(current);
  return next;
}

export { SERVICE_RADIUS_KEYS };

// --- message templates --------------------------------------------------

export async function setMessageTemplates(t: MessageTemplates): Promise<void> {
  // Filter to known keys only; tolerate unknowns the admin might post.
  const safe: Record<string, string> = {};
  for (const def of MESSAGE_TEMPLATE_DEFS) {
    const v = (t as unknown as Record<string, unknown>)[def.key];
    if (typeof v === "string") safe[def.key] = v;
  }
  // Reject completely-unknown keys (defensive).
  for (const k of Object.keys(safe)) {
    if (!isMessageTemplateKey(k)) delete safe[k];
  }
  const { error } = await supabase()
    .from("app_settings")
    .upsert({ key: KEYS.messageTemplates, value: JSON.stringify(safe), updated_at: new Date().toISOString() }, { onConflict: "key" });
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
