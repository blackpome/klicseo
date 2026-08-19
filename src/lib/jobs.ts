import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import { normalizeAppFields, slugify, type Job, type JobInput } from "./jobs-shared";

export * from "./jobs-shared";

const COLS =
  "id,created_at,updated_at,slug,title,type,blurb,description,location,salary,terms,show_description,show_location,show_salary,show_terms,active,sort_order,application_fields";

let jobsCache: { data: Job[]; expires: number } | null = null;
let jobTitleMapCache: { data: Record<string, string>; expires: number } | null = null;

export function invalidateJobsCache(): void {
  jobsCache = null;
  jobTitleMapCache = null;
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    ...(row as unknown as Job),
    application_fields: normalizeAppFields(row.application_fields),
  };
}

export const listJobs = cache(async (opts: { activeOnly?: boolean } = {}): Promise<Job[]> => {
  const now = Date.now();
  if (!opts.activeOnly && jobsCache && jobsCache.expires > now) {
    return jobsCache.data;
  }
  let q = supabase().from("jobs").select(COLS).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (opts.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  const res = (data ?? []).map((r) => rowToJob(r as Record<string, unknown>));
  if (!opts.activeOnly) {
    jobsCache = { data: res, expires: now + 60_000 };
  }
  return res;
});

export const getJob = cache(async (id: string): Promise<Job | null> => {
  const { data, error } = await supabase().from("jobs").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data as Record<string, unknown>) : null;
});

export const getJobBySlug = cache(async (slug: string): Promise<Job | null> => {
  const { data, error } = await supabase().from("jobs").select(COLS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data as Record<string, unknown>) : null;
});

/** slug→title map for labelling employee rows by their stored job_role. */
export const jobTitleMap = cache(async (): Promise<Record<string, string>> => {
  const now = Date.now();
  if (jobTitleMapCache && jobTitleMapCache.expires > now) {
    return jobTitleMapCache.data;
  }
  const { data, error } = await supabase().from("jobs").select("slug,title");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { slug: string; title: string }[]) map[r.slug] = r.title;
  jobTitleMapCache = { data: map, expires: now + 60_000 };
  return map;
});

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
  invalidateJobsCache();
  const slug = await uniqueSlug(input.title);
  const { data, error } = await supabase().from("jobs").insert({ ...input, slug }).select(COLS).single();
  if (error) throw error;
  return data as unknown as Job;
}

export async function updateJob(id: string, input: JobInput): Promise<void> {
  invalidateJobsCache();
  const slug = await uniqueSlug(input.title, id);
  const { error } = await supabase().from("jobs").update({ ...input, slug }).eq("id", id);
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  invalidateJobsCache();
  const { error } = await supabase().from("jobs").delete().eq("id", id);
  if (error) throw error;
}
