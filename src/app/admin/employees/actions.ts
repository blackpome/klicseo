"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import {
  BUCKET,
  JOB_CATALOG,
  deleteEmployee,
  insertEmployee,
  updateEmployee,
  updateEmployeeStatus,
  type EmployeeStatus,
  type EmployeeUpdate,
  type JobRole,
} from "@/lib/employees";

export async function setEmployeeStatusAction(formData: FormData) {
  await requirePermission("employees.manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as EmployeeStatus;
  if (!id || !status) return;
  await updateEmployeeStatus(id, status);
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
}

export async function deleteEmployeeAction(formData: FormData) {
  await requirePermission("employees.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteEmployee(id);
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

function readCommonFields(formData: FormData) {
  const role = String(formData.get("job_role") ?? "") as JobRole;
  if (!JOB_CATALOG.some((j) => j.id === role)) throw new Error("Invalid job role.");

  const salaryRaw = String(formData.get("salary") ?? "").trim();
  const salary = salaryRaw === "" ? null : Number(salaryRaw);

  return {
    job_role: role,
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim() || null,
    aadhaar_number: String(formData.get("aadhaar_number") ?? "").trim() || null,
    salary: salary != null && Number.isFinite(salary) ? salary : null,
    reminder_call_date: String(formData.get("reminder_call_date") ?? "") || null,
    joining_date: String(formData.get("joining_date") ?? "") || null,
    resignation_date: String(formData.get("resignation_date") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

async function uploadIfPresent(
  applicantId: string,
  kind: string,
  formData: FormData,
  fieldName: string,
): Promise<string | null> {
  const f = formData.get(fieldName);
  if (!(f instanceof File) || f.size === 0) return null;
  const ext = extFromMime(f.type) || extFromName(f.name) || "bin";
  const path = `${applicantId}/${kind}.${ext}`;
  const buf = Buffer.from(await f.arrayBuffer());
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, buf, { contentType: f.type || "application/octet-stream", upsert: true });
  if (error) throw error;
  return path;
}

function extFromMime(mime: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return null;
}
function extFromName(name: string): string | null {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : null;
}

function validate(name: string, phone: string): string | null {
  if (!name) return "Name is required.";
  if (!phone || phone.length < 8) return "Phone (min 8 digits) is required.";
  return null;
}

export async function createEmployeeAction(_prev: { error?: string }, formData: FormData) {
  await requirePermission("employees.manage");
  const data = readCommonFields(formData);
  const err = validate(data.name, data.phone);
  if (err) return { error: err };

  const applicantId = randomUUID();
  const aadhaar_photo_path = await uploadIfPresent(applicantId, "aadhaar", formData, "aadhaar_photo");
  const profile_photo_path = await uploadIfPresent(applicantId, "profile", formData, "profile_photo");

  await insertEmployee({
    ...data,
    aadhaar_photo_path,
    profile_photo_path,
    signature_path: null,
    terms_accepted_at: null,
  });

  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function updateEmployeeAction(_prev: { error?: string }, formData: FormData) {
  await requirePermission("employees.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing employee id." };

  const data = readCommonFields(formData);
  const err = validate(data.name, data.phone);
  if (err) return { error: err };

  const patch: EmployeeUpdate = { ...data };

  // Re-uploaded files replace the old path; an empty file input leaves the
  // existing path untouched. Storage objects are upserted in place when the
  // same applicant folder is reused; on admin-created rows we mint a folder
  // from the row id to keep paths stable.
  const aadhaar = await uploadIfPresent(id, "aadhaar", formData, "aadhaar_photo");
  const profile = await uploadIfPresent(id, "profile", formData, "profile_photo");
  if (aadhaar) patch.aadhaar_photo_path = aadhaar;
  if (profile) patch.profile_photo_path = profile;

  await updateEmployee(id, patch);

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
  redirect(`/admin/employees/${id}`);
}
