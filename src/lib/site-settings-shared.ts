// Client-safe site-settings types + defaults. Shared by the server lib
// (site-settings.ts) and the client context/forms so the shape lives in one place.
import { CARD_DEFAULTS, type CardPrices } from "./card-prices-shared";

// --- Social links -------------------------------------------------------
export const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/91XXXXXXXXXX" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
] as const;

export type SocialKey = (typeof SOCIAL_PLATFORMS)[number]["key"];

export interface SocialLink {
  url: string;
  enabled: boolean;
}
export type SocialLinks = Record<SocialKey, SocialLink>;

export const SOCIAL_DEFAULTS: SocialLinks = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.key, { url: "", enabled: false }]),
) as SocialLinks;

// --- Managed media (videos) --------------------------------------------
export type MediaKey = "heroVideo" | "packageVideo";
export type MediaType = "video" | "image";

export const MEDIA_DEFS: { key: MediaKey; label: string; default: string }[] = [
  { key: "heroVideo", label: "Hero (video or image)", default: "/car-detail-1.mp4" },
  { key: "packageVideo", label: "Package (video or image)", default: "/car-detail-1.mp4" },
];

// url null = use the bundled default file (which is a video).
export interface MediaItem {
  url: string | null;
  type: MediaType | null;
}
export type Media = Record<MediaKey, MediaItem>;

export const MEDIA_DEFAULTS: Media = {
  heroVideo: { url: null, type: null },
  packageVideo: { url: null, type: null },
};

const IMAGE_URL_RE = /\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i;

/** Effective url + type for a slot — the uploaded one, or the bundled default video.
 *  Tolerant of a missing/partial `media` object, and infers image from the URL
 *  extension as a fallback if the stored type is wrong/missing. */
export function resolveMedia(media: Media | undefined | null, key: MediaKey): { url: string; type: MediaType } {
  const item = media?.[key];
  if (item?.url) {
    const isImage = item.type === "image" || IMAGE_URL_RE.test(item.url);
    return { url: item.url, type: isImage ? "image" : "video" };
  }
  return { url: MEDIA_DEFS.find((m) => m.key === key)!.default, type: "video" };
}

/** Is a slot set to a custom (uploaded) file? */
export function hasCustomMedia(media: Media | undefined | null, key: MediaKey): boolean {
  return !!media?.[key]?.url;
}

// --- Message templates (WhatsApp messages from the Payments admin) -----
// Placeholders: {name}, {service}, {amount}, {month}. Unknown placeholders
// are left as-is so admins notice the typo.

export interface MessageTemplates {
  /** Automated reminder for pending payments. */
  paymentReminder: string;
  /** Automated thank-you for paid payments. */
  paymentThanks: string;
}

export const MESSAGE_TEMPLATE_DEFAULTS: MessageTemplates = {
  paymentReminder:
    "Hi {name}, friendly reminder — your {service} payment of ₹{amount} for {month} is due. Please pay at your convenience. Thanks!",
  paymentThanks:
    "Hi {name}, thank you for your {service} payment of ₹{amount} for {month}. We appreciate your business!",
};

export const MESSAGE_TEMPLATE_DEFS: { key: keyof MessageTemplates; label: string; help: string }[] = [
  { key: "paymentReminder", label: "Payment reminder (automated)", help: "Sent when you click the bell icon next to a pending row." },
  { key: "paymentThanks",   label: "Payment thanks (automated)",    help: "Sent when you click the thumbs-up next to a paid row." },
];

export function isMessageTemplateKey(v: unknown): v is keyof MessageTemplates {
  return typeof v === "string" && MESSAGE_TEMPLATE_DEFS.some((d) => d.key === v);
}

/** Replace `{name}` / `{service}` / `{amount}` / `{month}` placeholders. */
export function fillTemplate(
  template: string,
  vars: { name?: string | null; service?: string | null; amount?: number | null; month?: string | null },
): string {
  return template.replace(/\{(name|service|amount|month)\}/g, (_, key: string) => {
    if (key === "name") return (vars.name ?? "there").trim() || "there";
    if (key === "service") return (vars.service ?? "service").trim() || "service";
    if (key === "amount") return vars.amount != null ? vars.amount.toLocaleString("en-IN") : "—";
    if (key === "month") return (vars.month ?? "").trim();
    return "";
  });
}

// --- Service area radius (per service category, in km) ----------------
// Admin-controllable. Car-wash flows historically stayed close in (low ticket,
// high frequency); detailing trips can travel further.
export const SERVICE_RADIUS_KEYS = ["CarWash", "OneTimeCarWash", "CarDetailing"] as const;
export type ServiceRadiusKey = (typeof SERVICE_RADIUS_KEYS)[number];

export const SERVICE_RADIUS_LABEL: Record<ServiceRadiusKey, string> = {
  CarWash: "Subscription Car Wash",
  OneTimeCarWash: "One-Time Car Wash",
  CarDetailing: "Car Detailing",
};

export type ServiceRadius = Record<ServiceRadiusKey, number>;

export const SERVICE_RADIUS_DEFAULTS: ServiceRadius = {
  CarWash: 2.5,
  OneTimeCarWash: 2.5,
  CarDetailing: 10,
};

/** Fallback when no service has been picked yet — generous so we don't
 *  out-of-area users prematurely. */
export const DEFAULT_SERVICE_RADIUS_KM = 10;

/** Step size for the +/− admin controls (km). */
export const RADIUS_STEP_KM = 0.5;
export const RADIUS_MIN_KM = 0.5;
export const RADIUS_MAX_KM = 50;

export function isServiceRadiusKey(v: unknown): v is ServiceRadiusKey {
  return typeof v === "string" && (SERVICE_RADIUS_KEYS as readonly string[]).includes(v);
}

/** Effective radius for a service, using saved settings or the default. */
export function radiusFor(cfg: ServiceRadius | null | undefined, service: string | null | undefined): number {
  if (!service) return DEFAULT_SERVICE_RADIUS_KM;
  if (!isServiceRadiusKey(service)) return DEFAULT_SERVICE_RADIUS_KM;
  const v = cfg?.[service];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : SERVICE_RADIUS_DEFAULTS[service];
}

// --- Booking wizard steps (per-step copy) ------------------------------
export type BookingStepKey = "contact" | "schedule" | "location" | "package" | "confirm";

export const BOOKING_STEP_DEFS: {
  key: BookingStepKey;
  order: number;
  label: string;
  title: string;
  subtitle: string;
  editableSubtitle: boolean; // package subtitle is dynamic (pricing) — title only
}[] = [
  { key: "contact", order: 1, label: "Contact Details", title: "Contact Details", subtitle: "We’ll use this to confirm your booking.", editableSubtitle: true },
  { key: "schedule", order: 2, label: "Vehicle & Schedule", title: "Vehicle & Schedule", subtitle: "Tell us about your car and when our team should visit.", editableSubtitle: true },
  { key: "location", order: 3, label: "Your Location", title: "Your Location", subtitle: "Our team will come to you — where should we head?", editableSubtitle: true },
  { key: "package", order: 4, label: "Your Package", title: "Your Package", subtitle: "", editableSubtitle: false },
  { key: "confirm", order: 5, label: "Review & Confirm", title: "Review & Confirm", subtitle: "Everything look right?", editableSubtitle: true },
];

// Admin-defined extra fields shown in a wizard step.
export type CustomFieldType = "text" | "textarea" | "number" | "select" | "checkbox";

export const CUSTOM_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  enabled: boolean;
  options: string[]; // for select
  placeholder: string;
}

export interface BuiltinFieldCfg {
  enabled: boolean;
  required: boolean;
}

// Toggleable built-in fields per step. Core fields (name/phone/pricing/GPS) are
// intentionally not here — they can't be turned off.
export const BUILTIN_FIELDS: Record<string, { key: string; label: string }[]> = {
  contact: [],
  schedule: [
    { key: "carNumber", label: "Registration number" },
    { key: "carCover", label: "Car cover question (when parked outside)" },
    { key: "gateAccess", label: "Gate / parking access consent" },
  ],
  location: [
    { key: "locationCheck", label: "GPS availability / serviceability check" },
    { key: "pincode", label: "Pincode" },
    { key: "address", label: "Full address" },
  ],
  package: [],
  confirm: [],
};

// Editable text slots per step (prompts, buttons, key labels). Each has a
// default shown as a placeholder; admins can override any of them.
export interface MessageDef {
  key: string;
  label: string;
  default: string;
  multiline?: boolean;
}

export const MESSAGE_DEFS: Record<string, MessageDef[]> = {
  contact: [
    { key: "name_label", label: "Name label", default: "Full Name" },
    { key: "phone_label", label: "Phone label", default: "Phone Number" },
    { key: "service_label", label: "Service prompt", default: "Service Required" },
    { key: "continue", label: "Continue button", default: "Continue →" },
  ],
  schedule: [
    { key: "parking_prompt", label: "Parking question", default: "Where is the car parked?" },
    { key: "cover_prompt", label: "Car cover question", default: "Do you have a car cover?" },
    { key: "callback_prompt", label: "Callback prompt", default: "When should our team call you?" },
    { key: "gate_text", label: "Gate access consent text", multiline: true, default: "I confirm someone will arrange gate, security or parking-area access during the 8 PM – 10 AM service window. If the gate is locked or restricted at the time of visit, the booking may be rescheduled." },
    { key: "continue", label: "Continue button", default: "Continue →" },
  ],
  location: [
    { key: "avail_label", label: "Availability check label", default: "Availability Check" },
    { key: "locate_btn", label: "Locate button", default: "Check availability with my location" },
    { key: "avail_hint", label: "Location permission hint", multiline: true, default: "Required — we use your location only to confirm we serve your area. Tap above to allow." },
    { key: "avail_ok", label: "In-service-area message", default: "Great news — service is available in your area." },
    { key: "avail_out", label: "Out-of-area message (phone appended after)", multiline: true, default: "Your location looks outside our current service area for this service." },
    { key: "pincode_label", label: "Pincode label", default: "Pincode / Postcode" },
    { key: "address_label", label: "Address label", default: "Full Address" },
    { key: "continue", label: "Continue button", default: "Continue →" },
  ],
  package: [
    { key: "continue", label: "Continue button", default: "Review Booking →" },
  ],
  confirm: [
    { key: "submit_btn", label: "Submit button", default: "Confirm Booking ✓" },
    { key: "success_title", label: "Success title", default: "Booking Confirmed!" },
  ],
};

/** Effective text for a message slot — admin override, else the registered default. */
export function msg(
  booking: BookingConfig | undefined | null,
  stepKey: BookingStepKey,
  key: string,
): string {
  const def = MESSAGE_DEFS[stepKey]?.find((m) => m.key === key);
  const override = booking?.[stepKey]?.messages?.[key]?.trim();
  return override || def?.default || "";
}

export interface BookingStepCopy {
  title: string;
  subtitle: string;
  fields: CustomField[];
  builtins: Record<string, BuiltinFieldCfg>;
  messages: Record<string, string>;
  flags?: Record<string, boolean>;
}
export type BookingConfig = Record<BookingStepKey, BookingStepCopy>;

export const BOOKING_DEFAULTS: BookingConfig = Object.fromEntries(
  BOOKING_STEP_DEFS.map((s) => [s.key, { title: "", subtitle: "", fields: [] as CustomField[], builtins: {}, messages: {}, flags: {} }]),
) as unknown as BookingConfig;

// Boolean per-step flags. Each has a default; admins flip them in the booking
// form. Use `flag(booking, step, key)` to read the effective value.
export const STEP_FLAG_DEFS: Record<BookingStepKey, { key: string; label: string; help?: string; default: boolean }[]> = {
  contact: [],
  schedule: [],
  location: [],
  package: [
    { key: "showDiscount", label: "Show strike + % OFF in package picker", help: "Hide if you want a clean price list with no promo highlight.", default: true },
  ],
  confirm: [
    { key: "showDiscount", label: "Show strike on final total", help: "Hide to show only the charged price on the confirmation screen.", default: true },
  ],
};

/** Effective value for a step flag — admin override, else the registered default. */
export function flag(
  booking: BookingConfig | undefined | null,
  stepKey: BookingStepKey,
  key: string,
): boolean {
  const def = STEP_FLAG_DEFS[stepKey]?.find((f) => f.key === key);
  const v = booking?.[stepKey]?.flags?.[key];
  return typeof v === "boolean" ? v : (def?.default ?? true);
}

/** Resolved enabled/required for a built-in field — admin override or default (on + required). */
export function builtinCfg(
  booking: BookingConfig | undefined | null,
  stepKey: BookingStepKey,
  fieldKey: string,
): BuiltinFieldCfg {
  const o = booking?.[stepKey]?.builtins?.[fieldKey];
  return { enabled: o?.enabled ?? true, required: o?.required ?? true };
}

/** Effective title/subtitle/fields for a step — admin override, else the built-in default. */
export function stepCopy(
  booking: BookingConfig | undefined | null,
  key: BookingStepKey,
): { title: string; subtitle: string; fields: CustomField[] } {
  const def = BOOKING_STEP_DEFS.find((s) => s.key === key)!;
  const c = booking?.[key];
  return {
    title: c?.title?.trim() || def.title,
    subtitle: c?.subtitle?.trim() || def.subtitle,
    fields: c?.fields ?? [],
  };
}

/** Enabled custom fields for a step (what the wizard renders). */
export function stepFields(booking: BookingConfig | undefined | null, key: BookingStepKey): CustomField[] {
  return (booking?.[key]?.fields ?? []).filter((f) => f.enabled);
}

// Normalize a raw field object (from JSON) into a safe CustomField.
export function normalizeField(raw: unknown): CustomField | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id ? r.id : "";
  const label = typeof r.label === "string" ? r.label.trim() : "";
  if (!id || !label) return null;
  const type = (["text", "textarea", "number", "select", "checkbox"] as const).includes(r.type as CustomFieldType)
    ? (r.type as CustomFieldType)
    : "text";
  return {
    id,
    label,
    type,
    required: !!r.required,
    enabled: r.enabled !== false,
    options: Array.isArray(r.options) ? r.options.map(String).filter(Boolean) : [],
    placeholder: typeof r.placeholder === "string" ? r.placeholder : "",
  };
}

// --- Full settings shape -----------------------------------------------
// Note: ServiceCatalog is imported lazily by SiteSettings only as a typed shape
// to keep this module client-safe. The actual queries live in serviceCatalog.ts.
import type { ServiceCatalog } from "./serviceCatalog-shared";

export interface SiteSettings {
  startPrice: number;
  phone: string;
  whatsapp: string;
  cardPrices: CardPrices;
  social: SocialLinks;
  media: Media;
  booking: BookingConfig;
  serviceRadius: ServiceRadius;
  messageTemplates: MessageTemplates;
  /** Dynamic service catalog (categories + options + price lines). Null until
   *  loaded — consumers must fall back to legacy hardcoded data. */
  catalog: ServiceCatalog | null;
}

// Defaults used by the client context before the server value arrives.
export const SITE_SETTINGS_FALLBACK: SiteSettings = {
  startPrice: 19,
  phone: "+91 79043 32212",
  whatsapp: "+917904332212",
  cardPrices: CARD_DEFAULTS,
  social: SOCIAL_DEFAULTS,
  media: MEDIA_DEFAULTS,
  booking: BOOKING_DEFAULTS,
  serviceRadius: SERVICE_RADIUS_DEFAULTS,
  messageTemplates: MESSAGE_TEMPLATE_DEFAULTS,
  catalog: null,
};

export function isSocialKey(v: unknown): v is SocialKey {
  return SOCIAL_PLATFORMS.some((p) => p.key === v);
}
export function isMediaKey(v: unknown): v is MediaKey {
  return v === "heroVideo" || v === "packageVideo";
}
