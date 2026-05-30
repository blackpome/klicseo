import "server-only";
import { supabase } from "./supabase";
import { sealFields, unsealFields, unseal, phoneHash, normalizePhone } from "./crypto";
import { areaFromPincode } from "./area";
import type { CallReminder, LeadStatus } from "./leads-shared";

export * from "./leads-shared";

/** Columns stored encrypted at rest. The lib seals on write, unseals on read,
 *  so callers always see plaintext. Phone is encrypted AND kept exact-match
 *  searchable via the sibling `phone_hash` column. */
export const ENCRYPTED_LEAD_FIELDS = [
  "phone",
  "car_number",
  "address",
  "map_link",
  "gate_access_notes",
  "notes",
] as const;

export type LeadSource = "wizard" | "admin";

export interface LeadRow {
  id: string;
  created_at: string;
  source: LeadSource;
  status: LeadStatus;

  name: string | null;
  phone: string | null;

  service: string | null;
  service_option: string | null;
  interior_add_on: boolean;

  vehicle_type: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_number: string | null;

  pincode: string | null;
  /** Locality name (e.g. "Anna Nagar"). Plaintext — drives the area filter
   *  on /admin. Auto-derived from pincode at insert/update time if blank. */
  area: string | null;
  address: string | null;
  map_link: string | null;
  parking_location: string | null;
  car_cover_choice: string | null;
  gate_access_consent: boolean;
  gate_access_notes: string | null;
  shift: string | null;

  callback_date: string | null;
  callback_time: string | null;

  latitude: number | null;
  longitude: number | null;

  price_total: number | null;
  discount_percent: number | null;
  custom_fields: Record<string, string> | null;
  notes: string | null;
}

export type NewLead = Omit<LeadRow, "id" | "created_at" | "status"> & {
  status?: LeadStatus;
};

export async function insertLead(lead: NewLead): Promise<LeadRow> {
  const payload: Record<string, unknown> = { ...lead, status: lead.status ?? "new" };
  // Compute the search hash BEFORE sealing the plaintext phone.
  payload.phone_hash = phoneHash(lead.phone);
  // Auto-derive locality from pincode when the caller didn't set area.
  if (!(payload as { area?: string | null }).area) {
    payload.area = await areaFromPincode((lead as { pincode?: string | null }).pincode);
  }
  const sealed = sealFields(payload, ENCRYPTED_LEAD_FIELDS);
  const { data, error } = await supabase()
    .from("leads")
    .insert(sealed)
    .select()
    .single();
  if (error) throw error;
  return unsealFields(data as LeadRow, ENCRYPTED_LEAD_FIELDS)!;
}

// Fields searched by the admin search box. Encrypted columns are excluded —
// phone is searched via the `phone_hash` exact-match path below. `area` is
// plaintext-and-indexed so partial-name search ("Anna" → "Anna Nagar") works.
const SEARCH_FIELDS = [
  "name",
  "area",
  "car_model",
  "vehicle_type",
  "pincode",
  "service",
  "service_option",
];

// PostgREST's `.or()` parses commas/parens/quotes as filter syntax, so any of
// those in the user's query corrupts the request. Strip them and collapse
// runs of whitespace. The remaining `%...%` ilike match handles partial words.
function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()"'\\*]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listLeads(opts: {
  status?: LeadStatus | "all";
  search?: string;
  area?: string;
  limit?: number;
  /** Inclusive lower bound on created_at, full ISO timestamp w/ TZ. */
  fromIso?: string;
  /** Inclusive upper bound on created_at, full ISO timestamp w/ TZ. */
  toIso?: string;
  /** Statuses to exclude (only honoured when `status` is "all" or unset).
   *  Used by the admin list to hide drafts from the default view. */
  excludeStatuses?: LeadStatus[];
} = {}): Promise<LeadRow[]> {
  let q = supabase().from("leads").select("*").order("created_at", { ascending: false });
  if (opts.status && opts.status !== "all") {
    q = q.eq("status", opts.status);
  } else if (opts.excludeStatuses && opts.excludeStatuses.length) {
    q = q.not("status", "in", `(${opts.excludeStatuses.join(",")})`);
  }
  if (opts.area && opts.area !== "all") q = q.eq("area", opts.area);
  if (opts.fromIso) q = q.gte("created_at", opts.fromIso);
  if (opts.toIso) q = q.lte("created_at", opts.toIso);
  if (opts.search) {
    const s = sanitizeSearch(opts.search);
    if (s) {
      const orParts = SEARCH_FIELDS.map((f) => `${f}.ilike.%${s}%`);
      // If the query looks like a phone number, add an exact-match on
      // phone_hash so we can find leads despite the phone column being
      // encrypted.
      const ph = phoneHash(opts.search);
      if (ph && normalizePhone(opts.search).length >= 7) {
        orParts.push(`phone_hash.eq.${ph}`);
      }
      q = q.or(orParts.join(","));
    }
  }
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => unsealFields(r as LeadRow, ENCRYPTED_LEAD_FIELDS)!) as LeadRow[];
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const { data, error } = await supabase().from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return unsealFields(data as LeadRow | null, ENCRYPTED_LEAD_FIELDS);
}

export type LeadUpdate = Partial<Omit<LeadRow, "id" | "created_at" | "source">>;

export async function updateLead(id: string, patch: LeadUpdate): Promise<void> {
  const payload: Record<string, unknown> = { ...patch };
  // Keep phone_hash in lock-step with any phone update.
  if ("phone" in payload) payload.phone_hash = phoneHash(payload.phone as string | null);
  // Pincode changed but area not explicitly set → re-derive.
  if ("pincode" in payload && !("area" in payload)) {
    payload.area = await areaFromPincode(payload.pincode as string | null);
  }
  const sealed = sealFields(payload, ENCRYPTED_LEAD_FIELDS);
  const { error } = await supabase().from("leads").update(sealed).eq("id", id);
  if (error) throw error;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase().from("leads").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase().from("leads").delete().eq("id", id);
  if (error) throw error;
}

// --- Draft (wizard partial-save) lifecycle --------------------------------
//
// A "draft" lead is created mid-form, once the user enters a valid phone in
// Step 1. Subsequent step changes update the same row. On final submit the
// row is promoted to status "new" instead of inserting a fresh lead.
//
// Drafts default everything missing to null/false so the row inserts cleanly;
// callers pass whatever subset the user has filled in so far.

type DraftPayload = Partial<Omit<NewLead, "source" | "status">>;

function fullFromPartial(p: DraftPayload): NewLead {
  return {
    name: p.name ?? null,
    phone: p.phone ?? null,
    service: p.service ?? null,
    service_option: p.service_option ?? null,
    interior_add_on: p.interior_add_on ?? false,
    vehicle_type: p.vehicle_type ?? null,
    car_brand: p.car_brand ?? null,
    car_model: p.car_model ?? null,
    car_number: p.car_number ?? null,
    pincode: p.pincode ?? null,
    area: p.area ?? null,
    address: p.address ?? null,
    map_link: p.map_link ?? null,
    parking_location: p.parking_location ?? null,
    car_cover_choice: p.car_cover_choice ?? null,
    gate_access_consent: p.gate_access_consent ?? false,
    gate_access_notes: p.gate_access_notes ?? null,
    shift: p.shift ?? null,
    callback_date: p.callback_date ?? null,
    callback_time: p.callback_time ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    price_total: p.price_total ?? null,
    discount_percent: p.discount_percent ?? null,
    custom_fields: p.custom_fields ?? null,
    notes: p.notes ?? null,
    source: "wizard",
    status: "draft",
  };
}

export async function insertLeadDraft(partial: DraftPayload): Promise<LeadRow> {
  return insertLead(fullFromPartial(partial));
}

/** Update a draft row. No-op if the row is missing or no longer a draft —
 *  guards against stale wizard tabs mutating finalised leads. */
export async function updateLeadDraft(id: string, patch: LeadUpdate): Promise<boolean> {
  const { data, error } = await supabase().from("leads").select("status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || (data as { status: string }).status !== "draft") return false;
  await updateLead(id, patch);
  return true;
}

/** Promote a draft to a confirmed lead in one call (used by /api/booking
 *  when the final submit includes a draftId). Returns the updated lead, or
 *  null if the draft no longer exists / isn't a draft. */
export async function promoteLeadDraft(id: string, patch: LeadUpdate): Promise<LeadRow | null> {
  const { data, error } = await supabase().from("leads").select("status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || (data as { status: string }).status !== "draft") return null;
  await updateLead(id, { ...patch, status: "new" });
  return await getLead(id);
}

// Chennai is IST (UTC+5:30). Callback date/time are entered for IST, so we
// interpret them in IST and compare against the current instant.
const IST_OFFSET_MS = 330 * 60 * 1000;

// Combine an ISO date (YYYY-MM-DD) + a "10:00 AM" style time into an epoch ms,
// treating the values as IST wall-clock. Missing/garbage time → start of day.
function scheduledMs(date: string | null, time: string | null): number | null {
  const d = date && /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!d) return null;
  let h = 0;
  let min = 0;
  const t = time && /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(time.trim());
  if (t) {
    h = Number(t[1]) % 12;
    min = Number(t[2]);
    if (t[3]?.toUpperCase() === "PM") h += 12;
  }
  // Date.UTC gives the instant for that wall-clock as if UTC; subtract the IST
  // offset to get the real UTC instant for an IST wall-clock time.
  return Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), h, min) - IST_OFFSET_MS;
}

// Today's date as an IST wall-clock YYYY-MM-DD.
function todayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// Leads that need a phone call, for the admin notification bell. Two triggers,
// applied to leads of ANY status (no status filtering):
//   • due — a callback scheduled for TODAY (or overdue from a past date)
//   • new — a fresh lead with status 'new'
// A callback scheduled for a future date stays hidden until that day.
export async function listCallReminders(limit = 50): Promise<CallReminder[]> {
  const { data, error } = await supabase()
    .from("leads")
    .select("id,name,phone,status,callback_date,callback_time,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  const today = todayIST();
  type Row = {
    id: string; name: string | null; phone: string | null;
    status: LeadStatus; callback_date: string | null; callback_time: string | null;
  };

  const due: (CallReminder & { at: number })[] = [];
  const fresh: CallReminder[] = [];

  for (const r of (data ?? []) as Row[]) {
    // Phone is encrypted at rest — decrypt so the bell shows the real number.
    const phone = unseal(r.phone);
    if (r.callback_date && r.callback_date <= today) {
      // Callback scheduled for today (or overdue) — show regardless of status.
      const overdue = r.callback_date < today;
      const when = r.callback_time ? `${r.callback_date} · ${r.callback_time}` : r.callback_date;
      due.push({
        id: r.id,
        name: r.name,
        phone,
        reason: overdue ? `Overdue · ${when}` : `Call today${r.callback_time ? ` · ${r.callback_time}` : ""}`,
        kind: "due",
        href: `/admin/${r.id}`,
        at: scheduledMs(r.callback_date, r.callback_time) ?? 0,
      });
    } else if (r.status === "new") {
      // New lead with no callback due today — still a call to make.
      fresh.push({ id: r.id, name: r.name, phone, reason: "New lead — to call", kind: "new", href: `/admin/${r.id}` });
    }
  }

  // Today's scheduled calls first (earliest/overdue on top), then new leads.
  due.sort((a, b) => a.at - b.at);
  const dueClean: CallReminder[] = due.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, reason: r.reason, kind: r.kind, href: r.href,
  }));
  return [...dueClean, ...fresh].slice(0, limit);
}
