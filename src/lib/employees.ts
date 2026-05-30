import "server-only";
import { supabase } from "./supabase";
import { sealFields, unsealFields, unseal, phoneHash, normalizePhone } from "./crypto";
import type { CallReminder } from "./leads-shared";
import type {
  EmployeeRow,
  EmployeeStatus,
  EmployeeUpdate,
  NewEmployee,
} from "./employees-shared";

// Re-export the shared types/catalog so existing server-side imports of
// "@/lib/employees" keep working. Client code must import from
// "@/lib/employees-shared" instead.
export * from "./employees-shared";

export const BUCKET = "employee-docs";

/** Encrypted-at-rest fields. Phone is encrypted + kept exact-match
 *  searchable via the sibling `phone_hash` column. */
export const ENCRYPTED_EMPLOYEE_FIELDS = ["phone", "aadhaar_number", "notes"] as const;

export async function uploadEmployeeFile(opts: {
  file: File;
  applicantId: string;
  kind: "aadhaar" | "profile" | "signature";
}): Promise<string> {
  const ext = guessExt(opts.file.type, opts.file.name) || "bin";
  const path = `${opts.applicantId}/${opts.kind}.${ext}`;
  const buf = Buffer.from(await opts.file.arrayBuffer());
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, buf, { contentType: opts.file.type, upsert: true });
  if (error) throw error;
  return path;
}

function guessExt(mime: string, name: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : null;
}

export async function signedUrlFor(
  path: string | null,
  expiresInSeconds = 600,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function insertEmployee(emp: NewEmployee): Promise<EmployeeRow> {
  const payload: Record<string, unknown> = { ...emp, status: emp.status ?? "applied" };
  payload.phone_hash = phoneHash(emp.phone);
  const sealed = sealFields(payload, ENCRYPTED_EMPLOYEE_FIELDS);
  const { data, error } = await supabase()
    .from("employees")
    .insert(sealed)
    .select()
    .single();
  if (error) throw error;
  return unsealFields(data as EmployeeRow, ENCRYPTED_EMPLOYEE_FIELDS)!;
}

// aadhaar_number + phone are encrypted at rest — phone is searched via
// phone_hash below; aadhaar_number is no longer searchable by content.
const SEARCH_FIELDS = ["name", "location", "job_role"];

function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()"'\\*]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listEmployees(
  opts: {
    status?: EmployeeStatus | "all";
    search?: string;
    limit?: number;
    /** Inclusive lower bound on created_at, full ISO timestamp w/ TZ. */
    fromIso?: string;
    /** Inclusive upper bound on created_at, full ISO timestamp w/ TZ. */
    toIso?: string;
  } = {},
): Promise<EmployeeRow[]> {
  let q = supabase().from("employees").select("*").order("created_at", { ascending: false });
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
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
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => unsealFields(r as EmployeeRow, ENCRYPTED_EMPLOYEE_FIELDS)!) as EmployeeRow[];
}

export async function getEmployee(id: string): Promise<EmployeeRow | null> {
  const { data, error } = await supabase().from("employees").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return unsealFields(data as EmployeeRow | null, ENCRYPTED_EMPLOYEE_FIELDS);
}

export async function updateEmployee(id: string, patch: EmployeeUpdate): Promise<void> {
  const payload: Record<string, unknown> = { ...patch };
  if ("phone" in payload) payload.phone_hash = phoneHash(payload.phone as string | null);
  const sealed = sealFields(payload, ENCRYPTED_EMPLOYEE_FIELDS);
  const { error } = await supabase().from("employees").update(sealed).eq("id", id);
  if (error) throw error;
}

export async function updateEmployeeStatus(id: string, status: EmployeeStatus): Promise<void> {
  const { error } = await supabase().from("employees").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase().from("employees").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Employee call reminders + new applicant notifications — surfaced in the
 * notification bell on employee admin pages.
 *
 * Two feeds merged and sorted:
 *  1. "due"     — reminder_call_date ≤ today (overdue or today), non-resigned/rejected.
 *  2. "applied" — status="applied" employees not yet moved to screening/beyond.
 *                 Sorted newest first so the freshest applicants surface on top.
 */
export async function listEmployeeCallReminders(limit = 50): Promise<CallReminder[]> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const sb = supabase();

  const [dueRes, appliedRes] = await Promise.all([
    sb
      .from("employees")
      .select("id,name,phone,status,reminder_call_date,created_at")
      .not("reminder_call_date", "is", null)
      .lte("reminder_call_date", today)
      .order("reminder_call_date", { ascending: true })
      .limit(limit * 2),
    sb
      .from("employees")
      .select("id,name,phone,job_role,created_at")
      .eq("status", "applied")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (dueRes.error) throw dueRes.error;
  if (appliedRes.error) throw appliedRes.error;

  type DueRow = { id: string; name: string; phone: string | null; status: EmployeeStatus; reminder_call_date: string };
  type AppliedRow = { id: string; name: string; phone: string | null; job_role: string; created_at: string };

  const out: CallReminder[] = [];

  // 1. Call reminders (due/overdue).
  for (const r of (dueRes.data ?? []) as DueRow[]) {
    if (r.status === "resigned" || r.status === "rejected") continue;
    const overdue = r.reminder_call_date < today;
    out.push({
      id: r.id,
      name: r.name,
      phone: unseal(r.phone),
      reason: overdue ? `Overdue · ${r.reminder_call_date}` : "Call today",
      kind: "due",
      href: `/admin/employees/${r.id}`,
    });
  }

  // 2. New applicants — show how recently they applied for the "wow" factor.
  for (const r of (appliedRes.data ?? []) as AppliedRow[]) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(r.created_at).getTime()) / 86_400_000,
    );
    const when =
      daysAgo === 0 ? "Applied today" :
      daysAgo === 1 ? "Applied yesterday" :
      `Applied ${daysAgo} days ago`;
    out.push({
      id: r.id,
      name: r.name,
      phone: unseal(r.phone),
      reason: when,
      kind: "applied",
      href: `/admin/employees/${r.id}`,
    });
  }

  return out.slice(0, limit);
}
