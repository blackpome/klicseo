"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { insertJob, updateJob, deleteJob, APP_FIELD_DEFS, type ApplicationFields, type JobInput } from "@/lib/jobs";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

function on(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}
function text(formData: FormData, name: string): string | null {
  return String(formData.get(name) ?? "").trim() || null;
}

function readJob(formData: FormData): JobInput {
  const type = String(formData.get("type") ?? "PartTime") === "FullTime" ? "FullTime" : "PartTime";
  const sortRaw = Number(String(formData.get("sort_order") ?? "").trim());

  const application_fields = {} as ApplicationFields;
  for (const def of APP_FIELD_DEFS) {
    application_fields[def.key] = {
      enabled: on(formData, `af_${def.key}_enabled`),
      required: on(formData, `af_${def.key}_required`),
    };
  }

  return {
    title: String(formData.get("title") ?? "").trim(),
    type,
    blurb: text(formData, "blurb"),
    description: text(formData, "description"),
    location: text(formData, "location"),
    salary: text(formData, "salary"),
    terms: text(formData, "terms"),
    show_description: on(formData, "show_description"),
    show_location: on(formData, "show_location"),
    show_salary: on(formData, "show_salary"),
    show_terms: on(formData, "show_terms"),
    active: on(formData, "active"),
    sort_order: Number.isFinite(sortRaw) ? sortRaw : 0,
    application_fields,
  };
}

function revalidateAll(slug?: string) {
  revalidatePath("/admin/jobs");
  revalidatePath("/careers");
  if (slug) revalidatePath(`/careers/${slug}`);
}

export async function createJobAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  await requireManager();
  const job = readJob(formData);
  if (!job.title) return { error: "Title is required." };
  try {
    const created = await insertJob(job);
    await logAudit("job.create", { entity: "job", entityId: created.id, summary: `Created job "${job.title}"` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create job." };
  }
  revalidateAll();
  redirect("/admin/jobs");
}

export async function updateJobAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing job id." };
  const job = readJob(formData);
  if (!job.title) return { error: "Title is required." };
  try {
    await updateJob(id, job);
    await logAudit("job.update", { entity: "job", entityId: id, summary: `Edited job "${job.title}"` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save job." };
  }
  revalidateAll();
  redirect("/admin/jobs");
}

export async function deleteJobAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteJob(id);
  await logAudit("job.delete", { entity: "job", entityId: id, summary: "Deleted job" });
  revalidateAll();
  redirect("/admin/jobs");
}
