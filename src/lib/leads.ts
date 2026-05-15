import "server-only";
import { supabase } from "./supabase";

export type LeadStatus = "new" | "contacted" | "booked" | "cancelled";
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
  car_model: string | null;
  car_number: string | null;

  pincode: string | null;
  address: string | null;
  parking_location: string | null;
  car_cover_choice: string | null;
  gate_access_consent: boolean;
  shift: string | null;

  callback_date: string | null;
  callback_time: string | null;

  latitude: number | null;
  longitude: number | null;

  price_total: number | null;
  notes: string | null;
}

export type NewLead = Omit<LeadRow, "id" | "created_at" | "status"> & {
  status?: LeadStatus;
};

export async function insertLead(lead: NewLead): Promise<LeadRow> {
  const { data, error } = await supabase()
    .from("leads")
    .insert({ ...lead, status: lead.status ?? "new" })
    .select()
    .single();
  if (error) throw error;
  return data as LeadRow;
}

// Fields searched by the admin search box. Order is irrelevant — Postgres OR.
const SEARCH_FIELDS = [
  "name",
  "phone",
  "car_number",
  "car_model",
  "vehicle_type",
  "address",
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
  limit?: number;
} = {}): Promise<LeadRow[]> {
  let q = supabase().from("leads").select("*").order("created_at", { ascending: false });
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.search) {
    const s = sanitizeSearch(opts.search);
    if (s) {
      const orFilter = SEARCH_FIELDS.map((f) => `${f}.ilike.%${s}%`).join(",");
      q = q.or(orFilter);
    }
  }
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const { data, error } = await supabase().from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as LeadRow | null;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase().from("leads").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase().from("leads").delete().eq("id", id);
  if (error) throw error;
}
