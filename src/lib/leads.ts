import "server-only";
import { supabase } from "./supabase";
import { sealFields, unsealFields, unseal, phoneHash, normalizePhone } from "./crypto";
import { areaFromPincode, extractAreaFromAddress, invalidateAreaCountsCache } from "./area";
import type { CallReminder, LeadStatus, LeadSource } from "./leads-shared";
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

// In-memory short TTL caches for aggregate metrics to prevent massive DB scans on every click
const statusSummaryCache = new Map<string, { data: LeadStatusSummary; expires: number }>();
const serviceCountsCache = new Map<string, { data: Array<{ service: string; count: number }>; expires: number }>();
const callRemindersCache = new Map<string, { data: CallReminder[]; expires: number }>();

export function invalidateLeadCaches(): void {
  statusSummaryCache.clear();
  serviceCountsCache.clear();
  callRemindersCache.clear();
  invalidateAreaCountsCache();
}

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
  invalidateLeadCaches();
  const payload: Record<string, unknown> = { ...lead, status: lead.status ?? "new" };
  // For leads inserted directly (not via draft promotion), submitted_at = now.
  // Drafts get submitted_at stamped at promotion time instead.
  if (!payload.submitted_at && (payload.status as string) !== "draft") {
    payload.submitted_at = new Date().toISOString();
  }
  // Compute the search hash BEFORE sealing the plaintext phone.
  payload.phone_hash = phoneHash(lead.phone);
  // Auto-derive locality from permanent address and pincode when caller didn't set area.
  if (!(payload as { area?: string | null }).area) {
    payload.area = await extractAreaFromAddress(
      lead.address as string | null,
      (lead as { pincode?: string | null }).pincode,
    );
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
  "address",
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

export interface ListServiceCountsOptions {
  assignedAdminUserId?: string;
  area?: string;
}

/** Distinct service values + counts for the lead filter pill bar. */
export async function listServiceCounts(
  opts: ListServiceCountsOptions | string = {},
): Promise<Array<{ service: string; count: number }>> {
  const options: ListServiceCountsOptions =
    typeof opts === "string" ? { assignedAdminUserId: opts } : opts;

  // If scoped, first resolve the lead ids the admin can see.
  let allowedLeadIds: string[] | null = null;
  if (options.assignedAdminUserId) {
    const { data: items, error: itemsErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", options.assignedAdminUserId);
    if (itemsErr) throw itemsErr;
    allowedLeadIds = Array.from(
      new Set((items ?? []).map((r: { lead_id: string }) => r.lead_id)),
    );
    if (allowedLeadIds.length === 0) return [];
  }

  const allRows: Array<{ service: string | null }> = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    let q = supabase().from("leads").select("service, area, address").range(from, from + batchSize - 1);
    if (allowedLeadIds) q = q.in("id", allowedLeadIds);
    if (options.area && options.area !== "all") {
      const sArea = sanitizeSearch(options.area);
      if (sArea) {
        q = q.or(`area.eq.${options.area},address.ilike.%${sArea}%`);
      } else {
        q = q.eq("area", options.area);
      }
    }
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const counts = new Map<string, number>();
  for (const r of allRows) {
    if (!r.service) continue;
    counts.set(r.service, (counts.get(r.service) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service));
}

export interface LeadStatusSummary {
  [key: string]: number;
  total: number;
  new: number;
  contacted: number;
  follow_up: number;
  call_not_responded: number;
  booked: number;
  cancelled: number;
  draft: number;
}

export interface ListStatusSummaryOptions {
  assignedAdminUserId?: string;
  search?: string;
  area?: string;
  service?: string;
  serviceOption?: string;
  fromIso?: string;
  toIso?: string;
}

function applyLeadFilters(
  q: any,
  options: ListStatusSummaryOptions,
  allowedLeadIds: string[] | null,
) {
  if (allowedLeadIds) q = q.in("id", allowedLeadIds);
  if (options.area && options.area !== "all") {
    const sArea = sanitizeSearch(options.area);
    if (sArea) {
      q = q.or(`area.eq.${options.area},address.ilike.%${sArea}%`);
    } else {
      q = q.eq("area", options.area);
    }
  }
  if (options.service && options.service !== "all") q = q.eq("service", options.service);
  if (options.serviceOption && options.serviceOption !== "all") q = q.eq("service_option", options.serviceOption);
  if (options.fromIso) q = q.gte("created_at", options.fromIso);
  if (options.toIso) q = q.lte("created_at", options.toIso);

  if (options.search) {
    const s = sanitizeSearch(options.search);
    if (s) {
      const orParts = SEARCH_FIELDS.map((f) => `${f}.ilike.%${s}%`);
      const ph = phoneHash(options.search);
      if (ph && normalizePhone(options.search).length >= 7) {
        orParts.push(`phone_hash.eq.${ph}`);
      }
      q = q.or(orParts.join(","));
    }
  }
  return q;
}

/** Aggregate counts by status for top-level KPI metrics & tab counters */
export async function listLeadStatusSummary(
  opts: ListStatusSummaryOptions | string = {},
): Promise<LeadStatusSummary> {
  const options: ListStatusSummaryOptions =
    typeof opts === "string" ? { assignedAdminUserId: opts } : opts;

  let allowedLeadIds: string[] | null = null;
  if (options.assignedAdminUserId) {
    const { data: items, error: itemsErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", options.assignedAdminUserId);
    if (itemsErr) throw itemsErr;
    allowedLeadIds = Array.from(
      new Set((items ?? []).map((r: { lead_id: string }) => r.lead_id)),
    );
    if (allowedLeadIds.length === 0) {
      return { total: 0, new: 0, contacted: 0, follow_up: 0, call_not_responded: 0, booked: 0, cancelled: 0, draft: 0 };
    }
  }

  const statuses = [
    "new",
    "contacted",
    "follow_up",
    "call_not_responded",
    "booked",
    "cancelled",
    "draft",
  ] as const;

  const totalPromise = applyLeadFilters(
    supabase().from("leads").select("*", { count: "exact", head: true }),
    options,
    allowedLeadIds,
  );

  const statusPromises = statuses.map((st) =>
    applyLeadFilters(
      supabase().from("leads").select("*", { count: "exact", head: true }).eq("status", st),
      options,
      allowedLeadIds,
    ),
  );

  const [totalRes, ...statusResults] = await Promise.all([totalPromise, ...statusPromises]);

  const summary: LeadStatusSummary = {
    total: totalRes.count ?? 0,
    new: 0,
    contacted: 0,
    follow_up: 0,
    call_not_responded: 0,
    booked: 0,
    cancelled: 0,
    draft: 0,
  };

  statuses.forEach((st, idx) => {
    summary[st] = statusResults[idx].count ?? 0;
  });

  return summary;
}

export interface ListLeadsOptions {
  status?: LeadStatus | "all";
  search?: string;
  area?: string;
  service?: string;
  serviceOption?: string;
  fromIso?: string;
  toIso?: string;
  excludeStatuses?: LeadStatus[];
  assignedAdminUserId?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedLeadsResult {
  leads: LeadRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch a paginated slice of leads with total match count for UI pagination.
 */
export async function listPaginatedLeads(
  opts: ListLeadsOptions = {},
): Promise<PaginatedLeadsResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(200, opts.pageSize ?? 25));
  const offset = opts.offset ?? (page - 1) * pageSize;
  const limit = opts.limit ?? pageSize;

  let q = supabase().from("leads").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") {
    q = q.eq("status", opts.status);
  } else if (opts.excludeStatuses && opts.excludeStatuses.length) {
    q = q.not("status", "in", `(${opts.excludeStatuses.join(",")})`);
  }
  if (opts.area && opts.area !== "all") {
    const sArea = sanitizeSearch(opts.area);
    if (sArea) {
      q = q.or(`area.eq.${opts.area},address.ilike.%${sArea}%`);
    } else {
      q = q.eq("area", opts.area);
    }
  }
  if (opts.service && opts.service !== "all") q = q.eq("service", opts.service);
  if (opts.serviceOption && opts.serviceOption !== "all") q = q.eq("service_option", opts.serviceOption);
  if (opts.fromIso) q = q.gte("created_at", opts.fromIso);
  if (opts.toIso) q = q.lte("created_at", opts.toIso);

  if (opts.search) {
    const s = sanitizeSearch(opts.search);
    if (s) {
      const orParts = SEARCH_FIELDS.map((f) => `${f}.ilike.%${s}%`);
      const ph = phoneHash(opts.search);
      if (ph && normalizePhone(opts.search).length >= 7) {
        orParts.push(`phone_hash.eq.${ph}`);
      }
      q = q.or(orParts.join(","));
    }
  }

  if (opts.assignedAdminUserId) {
    const { data: assignedLeadIds, error: listErr } = await supabase()
      .from("lead_list_items")
      .select("lead_id, lead_lists!inner(assigned_admin_user_id)")
      .eq("lead_lists.assigned_admin_user_id", opts.assignedAdminUserId);
    if (listErr) throw listErr;
    const ids = Array.from(
      new Set((assignedLeadIds ?? []).map((r: { lead_id: string }) => r.lead_id)),
    );
    if (ids.length === 0) {
      return { leads: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }
    q = q.in("id", ids);
  }

  q = q.range(offset, offset + limit - 1);
  const { data, count, error } = await q;
  if (error) throw error;

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const leads = (data ?? []).map((r) => unsealFields(r as LeadRow, ENCRYPTED_LEAD_FIELDS)!) as LeadRow[];

  return {
    leads,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function listLeads(opts: ListLeadsOptions = {}): Promise<LeadRow[]> {
  const res = await listPaginatedLeads({
    ...opts,
    pageSize: opts.limit ?? 200,
    page: 1,
  });
  return res.leads;
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
  invalidateLeadCaches();
  const payload: Record<string, unknown> = { ...patch };
  // Keep phone_hash in lock-step with any phone update.
  if ("phone" in payload) payload.phone_hash = phoneHash(payload.phone as string | null);
  // Pincode or address changed but area not explicitly set → re-derive.
  if (("pincode" in payload || "address" in payload) && !("area" in payload)) {
    payload.area = await extractAreaFromAddress(
      payload.address as string | null,
      payload.pincode as string | null,
    );
  }
  const sealed = sealFields(payload, ENCRYPTED_LEAD_FIELDS);
  const { error } = await supabase().from("leads").update(sealed).eq("id", id);
  if (error) throw error;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  invalidateLeadCaches();
  const { error } = await supabase().from("leads").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  invalidateLeadCaches();
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
  invalidateLeadCaches();
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

// Today's date as an IST wall-clock YYYY-MM-DD.
// Uses Intl.DateTimeFormat instead of a hardcoded offset so it handles any
// edge cases with the Asia/Kolkata timezone correctly.
function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// Combine an ISO date (YYYY-MM-DD) + a "10:00 AM" style time into an epoch ms,
// treating the values as wall-clock in the given IANA timezone (defaults to IST).
// Missing/garbage time → start of day.
function scheduledMs(date: string | null, time: string | null, tz = "Asia/Kolkata"): number | null {
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
  // Build a date string in the target timezone and get its UTC instant.
  // Using Intl.DateTimeFormat to parse the wall-clock time in the given tz.
  const year = Number(d[1]);
  const month = Number(d[2]) - 1;
  const day = Number(d[3]);
  // Create a UTC date for the wall-clock time, then find the offset for that
  // moment in the target timezone.
  const utcGuess = Date.UTC(year, month, day, h, min);
  // Get the timezone offset at that moment by formatting in the target tz vs UTC.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const tzYear = get("year");
  const tzMonth = get("month") - 1;
  const tzDay = get("day");
  const tzHour = get("hour");
  const tzMin = get("minute");
  const tzSec = get("second");
  // The offset is the difference between UTC and the target tz at this moment.
  const tzInstant = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, tzSec);
  const offsetMs = utcGuess - tzInstant;
  return utcGuess - offsetMs;
}

// Leads that need a phone call, for the admin notification bell. Two triggers,
// applied to leads of ANY status (no status filtering):
//   • due — a callback scheduled for TODAY (or overdue from a past date)
//   • new — a fresh lead with status 'new'
// A callback scheduled for a future date stays hidden until that day.
export async function listCallReminders(opts: { limit?: number; assignedAdminUserId?: string } = {}): Promise<CallReminder[]> {
  const { limit = 50, assignedAdminUserId } = opts;
  const cacheKey = `${assignedAdminUserId || "all"}_${limit}`;
  const now = Date.now();
  const cached = callRemindersCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

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

  const today = todayIST();
  let q = supabase()
    .from("leads")
    .select("id,name,phone,status,callback_date,callback_time,client_timezone,created_at")
    .or(`status.eq.new,and(callback_date.not.is.null,callback_date.lte.${today})`)
    .order("created_at", { ascending: false })
    .limit(limit * 2);
  if (allowedLeadIds) q = q.in("id", Array.from(allowedLeadIds));
  const { data, error } = await q;
  if (error) throw error;

  type Row = {
    id: string; name: string | null; phone: string | null;
    status: LeadStatus; callback_date: string | null; callback_time: string | null;
    client_timezone: string | null;
  };

  const due: (CallReminder & { at: number })[] = [];
  const fresh: CallReminder[] = [];

  for (const r of (data ?? []) as Row[]) {
    // Phone is encrypted at rest — decrypt so the bell shows the real number.
    const phone = unseal(r.phone);
    // Use the lead's client_timezone if available, otherwise default to IST.
    const leadTz = r.client_timezone ?? "Asia/Kolkata";
    // Compare callback_date against today in the lead's timezone.
    const callbackToday = new Intl.DateTimeFormat("en-CA", { timeZone: leadTz }).format(new Date());
    if (r.callback_date && r.callback_date <= callbackToday) {
      // Callback scheduled for today (or overdue) — show regardless of status.
      const overdue = r.callback_date < callbackToday;
      const when = r.callback_time ? `${r.callback_date} · ${r.callback_time}` : r.callback_date;
      due.push({
        id: r.id,
        name: r.name,
        phone,
        reason: overdue ? `Overdue · ${when}` : `Call today${r.callback_time ? ` · ${r.callback_time}` : ""}`,
        kind: "due",
        href: `/admin/${r.id}`,
        at: scheduledMs(r.callback_date, r.callback_time, leadTz) ?? 0,
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
  const res = [...dueClean, ...fresh].slice(0, limit);
  callRemindersCache.set(cacheKey, { data: res, expires: now + 15_000 });
  return res;
}

// --- Bulk Import Engine -----------------------------------------------------

export interface BulkInsertLeadResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  createdLeadIds: string[];
  allLeadIds: string[];
  errors: string[];
}

/**
 * Bulk insert an array of leads with encryption, area derivation, duplicate
 * detection, and optional lead list assignment.
 */
export async function bulkInsertLeads(
  leads: NewLead[],
  opts: {
    duplicateStrategy?: "skip" | "update" | "allow";
    listId?: string | null;
  } = {},
): Promise<BulkInsertLeadResult> {
  invalidateLeadCaches();
  const { duplicateStrategy = "skip", listId } = opts;
  const errors: string[] = [];
  const createdLeadIds: string[] = [];
  const allLeadIds: string[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  if (!leads || leads.length === 0) {
    return { total: 0, inserted: 0, updated: 0, skipped: 0, createdLeadIds: [], allLeadIds: [], errors: [] };
  }

  // 1. Pre-calculate phone hashes and cache pincode areas
  const leadsWithHashes = leads.map((l) => {
    const ph = phoneHash(l.phone);
    return { ...l, computed_phone_hash: ph };
  });

  const uniquePincodes = Array.from(new Set(leads.map((l) => l.pincode).filter(Boolean))) as string[];
  const areaCache = new Map<string, string | null>();
  await Promise.all(
    uniquePincodes.map(async (pin) => {
      const area = await areaFromPincode(pin);
      areaCache.set(pin, area);
    }),
  );

  // 2. Query existing phone hashes if duplicate checking is enabled
  const existingMap = new Map<string, string>(); // phone_hash -> existing lead id
  if (duplicateStrategy !== "allow") {
    const allHashes = Array.from(new Set(leadsWithHashes.map((l) => l.computed_phone_hash).filter(Boolean))) as string[];
    // Query in batches of 200 hashes
    for (let i = 0; i < allHashes.length; i += 200) {
      const batch = allHashes.slice(i, i + 200);
      const { data, error } = await supabase()
        .from("leads")
        .select("id, phone_hash")
        .in("phone_hash", batch);
      if (error) {
        errors.push(`Duplicate lookup query error: ${error.message}`);
      } else {
        (data ?? []).forEach((r: { id: string; phone_hash: string | null }) => {
          if (r.phone_hash) existingMap.set(r.phone_hash, r.id);
        });
      }
    }
  }

  // 3. Process records into to-insert and to-update buckets
  const toInsertPayloads: Record<string, unknown>[] = [];

  for (const lead of leadsWithHashes) {
    const ph = lead.computed_phone_hash;
    const existingId = ph ? existingMap.get(ph) : undefined;

    if (existingId && duplicateStrategy === "skip") {
      skipped++;
      allLeadIds.push(existingId);
      continue;
    }

    if (existingId && duplicateStrategy === "update") {
      try {
        const patch: LeadUpdate = {
          name: lead.name || undefined,
          car_brand: lead.car_brand || undefined,
          car_model: lead.car_model || undefined,
          car_number: lead.car_number || undefined,
          vehicle_type: lead.vehicle_type || undefined,
          address: lead.address || undefined,
          pincode: lead.pincode || undefined,
          area: lead.area || (lead.pincode ? areaCache.get(lead.pincode) ?? null : undefined),
          custom_fields: lead.custom_fields || undefined,
        };
        await updateLead(existingId, patch);
        updated++;
        allLeadIds.push(existingId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to update existing lead for phone ${lead.phone ?? "unknown"}: ${msg}`);
      }
      continue;
    }

    // New lead to insert
    let area = lead.area || (lead.pincode ? areaCache.get(lead.pincode) ?? null : null);
    if (!area && (lead.address || lead.pincode)) {
      area = await extractAreaFromAddress(lead.address, lead.pincode);
    }
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      ...lead,
      source: lead.source ?? "admin",
      status: lead.status ?? "new",
      phone_hash: ph,
      area,
      submitted_at: lead.submitted_at ?? now,
      gate_access_consent: lead.gate_access_consent ?? false,
    };
    delete payload.computed_phone_hash;

    const sealed = sealFields(payload, ENCRYPTED_LEAD_FIELDS);
    toInsertPayloads.push(sealed);
  }

  // 4. Batch insert new records in chunks of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < toInsertPayloads.length; i += CHUNK_SIZE) {
    const chunk = toInsertPayloads.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase()
      .from("leads")
      .insert(chunk)
      .select("id");

    if (error) {
      errors.push(`Batch insert failed at row offset ${i + 1}: ${error.message}`);
    } else {
      const ids = (data ?? []).map((r: { id: string }) => r.id);
      inserted += ids.length;
      createdLeadIds.push(...ids);
      allLeadIds.push(...ids);
    }
  }

  // 5. Link all touched leads to target list if specified (exclusive 1-to-1 list membership)
  if (listId && allLeadIds.length > 0) {
    const uniqueIds = Array.from(new Set(allLeadIds));
    try {
      // Remove from any previous lists first
      await supabase()
        .from("lead_list_items")
        .delete()
        .in("lead_id", uniqueIds);

      const items = uniqueIds.map((leadId) => ({
        list_id: listId,
        lead_id: leadId,
      }));

      for (let i = 0; i < items.length; i += 200) {
        const itemChunk = items.slice(i, i + 200);
        const { error } = await supabase()
          .from("lead_list_items")
          .insert(itemChunk);
        if (error) {
          errors.push(`Failed to attach leads to list: ${error.message}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to attach leads to list: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    total: leads.length,
    inserted,
    updated,
    skipped,
    createdLeadIds,
    allLeadIds,
    errors,
  };
}

