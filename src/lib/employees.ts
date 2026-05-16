import "server-only";
import { supabase } from "./supabase";
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
  const { data, error } = await supabase()
    .from("employees")
    .insert({ ...emp, status: emp.status ?? "applied" })
    .select()
    .single();
  if (error) throw error;
  return data as EmployeeRow;
}

const SEARCH_FIELDS = ["name", "phone", "location", "aadhaar_number", "job_role"];

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
    if (s) q = q.or(SEARCH_FIELDS.map((f) => `${f}.ilike.%${s}%`).join(","));
  }
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EmployeeRow[];
}

export async function getEmployee(id: string): Promise<EmployeeRow | null> {
  const { data, error } = await supabase().from("employees").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as EmployeeRow | null;
}

export async function updateEmployee(id: string, patch: EmployeeUpdate): Promise<void> {
  const { error } = await supabase().from("employees").update(patch).eq("id", id);
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
