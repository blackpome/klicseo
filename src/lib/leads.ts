import "server-only";
import { supabase } from "./supabase";
import { sealFields, unsealFields, unseal, phoneHash, normalizePhone } from "./crypto";
import { areaFromPincode } from "./area";
import type { CallReminder, LeadStatus } from "./leads-shared";
import type { LeadScope } from "./admin-auth";

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
  add_on_labels: string[] | null;

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
  /** When the user actually clicked Submit (for wizard leads promoted from draft,
   *  this differs from created_at which records when they started the form).
   *  Null for leads created before this column was added. */
  submitted_at?: string | null;
  /** IANA timezone captured from the user's browser at booking time. Null for old leads or admin-created ones. */
  client_timezone?: string | null;

  latitude: number | null;
  longitude: number | null;

  price_total: number | null;
  price_base: number | null;
  price_interior_addon: number | null;
  discount_percent: number | null;
  custom_fields: Record<string, string> | null;
  notes: string | null;
}

export type NewLead = Omit<LeadRow, "id" | "created_at" | "status" | "price_base" | "price_interior_addon" | "add_on_labels" | "client_timezone"> & {
  client_timezone?: string | null;
  status?: LeadStatus;
  price_base?: number | null;
  price_interior_addon?: number | null;
  add_on_labels?: string[] | null;
};

export async function insertLead(lead: NewLead): Promise<LeadRow> {
  const payload: Record<string, unknown> = { ...lead, status: lead.status ?? "new" };
  // For leads inserted directly (not via draft promotion), submitted_at = now.
  // Drafts get submitted_at stamped at promotion time instead.
  if (!payload.submitted_at && (payload.status as string) !== "draft") {
    payload.submitted_at = new Date().toISOString();
  }
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
  /** Restrict to leads that appear in at least one lead_list assigned to this
   *  admin user. Used to give non-super-admin staff a "my leads" view. */
  assignedAdminUserId?: string;
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

  // "My leads" scope: restrict to leads appearing in a list assigned to the
  // given admin user. Resolved in two steps — fetch the qualifying lead ids,
  // then filter. PostgREST can't express this as a single .in() on the joined
  // tables without writing a view, and this keeps the existing query plan.
  if (opts.assignedAdminUserId) {
    const { data: assignedLeadIds, error: listErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", opts.assignedAdminUserId);
    if (listErr) throw listErr;
    const ids = Array.from(
      new Set((assignedLeadIds ?? []).map((r: { lead_id: string }) => r.lead_id)),
    );
    if (ids.length === 0) return [];
    q = q.in("id", ids);
  }

  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => unsealFields(r as LeadRow, ENCRYPTED_LEAD_FIELDS)!) as LeadRow[];
}

/** For a set of lead ids, return a Map from lead_id → list of list names they
 *  appear in. Used by the admin table to show a "List" column for super_admin. */
export async function mapLeadIdsToLists(leadIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (leadIds.length === 0) return map;
  const { data, error } = await supabase()
    .from("lead_list_items")
    .select("lead_id, lead_lists(name)")
    .in("lead_id", leadIds);
  if (error) throw error;
  for (const row of (data ?? []) as { lead_id: string; lead_lists: { name: string } | { name: string }[] }[]) {
    const lists = Array.isArray(row.lead_lists) ? row.lead_lists : (row.lead_lists ? [row.lead_lists] : []);
    const names = lists.map((l) => l.name);
    const existing = map.get(row.lead_id) ?? [];
    map.set(row.lead_id, [...existing, ...names]);
  }
  return map;
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
    add_on_labels: p.add_on_labels ?? null,
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
    price_base: p.price_base ?? null,
    price_interior_addon: p.price_interior_addon ?? null,
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
  await updateLead(id, { ...patch, status: "new", submitted_at: new Date().toISOString() });
  return await getLead(id);
}

// --- scope guards -----------------------------------------------------------
// Used by detail pages to enforce that a non-super-admin can only open rows
// that fall within their assigned scope.

/** Return true if `leadId` is visible within `scope`. */
export async function assertLeadInScope(leadId: string, scope: LeadScope): Promise<boolean> {
  if (scope.kind === "all") return true;
  const { data, error } = await supabase()
    .from("lead_list_items")
    .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
    .eq("lead_id", leadId)
    .eq("lead_lists.assigned_admin_user_id", scope.adminUserId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
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
export async function listCallReminders(opts: { limit?: number; assignedAdminUserId?: string } = {}): Promise<CallReminder[]> {
  const { limit = 50, assignedAdminUserId } = opts;

  // When scoped, first resolve the lead ids the admin is allowed to see, then
  // fetch only those leads' reminders.
  let allowedLeadIds: Set<string> | null = null;
  if (assignedAdminUserId) {
    const { data: items, error: itemsErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", assignedAdminUserId);
    if (itemsErr) throw itemsErr;
    allowedLeadIds = new Set((items ?? []).map((r: { lead_id: string }) => r.lead_id));
    if (allowedLeadIds.size === 0) return [];
  }

  let q = supabase()
    .from("leads")
    .select("id,name,phone,status,callback_date,callback_time,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (allowedLeadIds) q = q.in("id", Array.from(allowedLeadIds));
  const { data, error } = await q;
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
