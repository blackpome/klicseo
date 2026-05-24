import "server-only";
import { supabase } from "./supabase";
import { sealFields, unsealFields, phoneHash, normalizePhone } from "./crypto";
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
  opts: { status?: EmployeeStatus | "all"; search?: string; limit?: number } = {},
): Promise<EmployeeRow[]> {
  let q = supabase().from("employees").select("*").order("created_at", { ascending: false });
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
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
