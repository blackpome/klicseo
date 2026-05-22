import "server-only";
import { supabase } from "./supabase";
import { normalizeAppFields, slugify, type Job, type JobInput } from "./jobs-shared";

export * from "./jobs-shared";

const COLS =
  "id,created_at,updated_at,slug,title,type,blurb,description,location,salary,terms,show_description,show_location,show_salary,show_terms,active,sort_order,application_fields";

function rowToJob(row: Record<string, unknown>): Job {
  return {
    ...(row as unknown as Job),
    application_fields: normalizeAppFields(row.application_fields),
  };
}

export async function listJobs(opts: { activeOnly?: boolean } = {}): Promise<Job[]> {
  let q = supabase().from("jobs").select(COLS).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (opts.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowToJob(r as Record<string, unknown>));
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await supabase().from("jobs").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data as Record<string, unknown>) : null;
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  const { data, error } = await supabase().from("jobs").select(COLS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data as Record<string, unknown>) : null;
}

/** slug→title map for labelling employee rows by their stored job_role. */
export async function jobTitleMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase().from("jobs").select("slug,title");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { slug: string; title: string }[]) map[r.slug] = r.title;
  return map;
}

// Unique slug from the title (append -2, -3… on collision), ignoring `exceptId`.
async function uniqueSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; ; i++) {
    const { data, error } = await supabase().from("jobs").select("id").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!data || data.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
}

export async function insertJob(input: JobInput): Promise<Job> {
  const slug = await uniqueSlug(input.title);
  const { data, error } = await supabase().from("jobs").insert({ ...input, slug }).select(COLS).single();
  if (error) throw error;
  return data as unknown as Job;
}

export async function updateJob(id: string, input: JobInput): Promise<void> {
  const slug = await uniqueSlug(input.title, id);
  const { error } = await supabase().from("jobs").update({ ...input, slug }).eq("id", id);
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase().from("jobs").delete().eq("id", id);
  if (error) throw error;
}
