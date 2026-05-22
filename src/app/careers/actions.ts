"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { friendlyDbError } from "@/lib/db-errors";
import { BUCKET, insertEmployee } from "@/lib/employees";
import { getJobBySlug } from "@/lib/jobs";

// Public endpoint — no admin check. Validates inputs, uploads files to the
// private bucket, and inserts the row. Returns a small status object so the
// client can show a thank-you state.
export async function submitApplicationAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const role = String(formData.get("job_role") ?? "");
  const job = role ? await getJobBySlug(role) : null;
  if (!job || !job.active) return { error: "Invalid job role." };

  const fields = job.application_fields;
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const aadhaarNumber = String(formData.get("aadhaar_number") ?? "").trim();
  const termsAccepted = formData.get("terms_accepted") === "on";
  const signatureDataUrl = String(formData.get("signature_data_url") ?? "");

  // Name & phone are always required.
  if (!name) return { error: "Name is required." };
  if (!phone || phone.length < 8) return { error: "A valid phone number is required." };
  if (!termsAccepted) return { error: "Please accept the terms to continue." };

  // Optional fields are required only when enabled + required for this job.
  const req = (k: keyof typeof fields) => fields[k].enabled && fields[k].required;
  if (req("location") && !location) return { error: "Location is required." };
  if (req("aadhaar_number") && !aadhaarNumber) return { error: "Aadhaar number is required." };

  const hasSignature = signatureDataUrl.startsWith("data:image/");
  if (req("signature") && !hasSignature) return { error: "Please sign before submitting." };

  const aadhaarFile = formData.get("aadhaar_photo");
  const profileFile = formData.get("profile_photo");
  const hasAadhaar = aadhaarFile instanceof File && aadhaarFile.size > 0;
  const hasProfile = profileFile instanceof File && profileFile.size > 0;
  if (req("aadhaar_photo") && !hasAadhaar) return { error: "Aadhaar photo is required." };
  if (req("profile_photo") && !hasProfile) return { error: "Profile photo is required." };

  // Each applicant gets a folder so the files are co-located + easy to clean up.
  const applicantId = randomUUID();
  try {
    // Upload only the enabled fields that were actually provided.
    const aadhaarPath = fields.aadhaar_photo.enabled && hasAadhaar
      ? await uploadInto(applicantId, "aadhaar", aadhaarFile as File) : null;
    const profilePath = fields.profile_photo.enabled && hasProfile
      ? await uploadInto(applicantId, "profile", profileFile as File) : null;
    const signaturePath = fields.signature.enabled && hasSignature
      ? await uploadDataUrl(applicantId, "signature", signatureDataUrl) : null;

    await insertEmployee({
      job_role: role,
      name,
      phone,
      location: fields.location.enabled ? location || null : null,
      aadhaar_number: fields.aadhaar_number.enabled ? aadhaarNumber || null : null,
      aadhaar_photo_path: aadhaarPath,
      profile_photo_path: profilePath,
      signature_path: signaturePath,
      terms_accepted_at: new Date().toISOString(),
      salary: null,
      reminder_call_date: null,
      joining_date: null,
      resignation_date: null,
      notes: null,
    });
  } catch (err) {
    console.error("Application submission failed:", err);
    const info = friendlyDbError(err);
    // Don't leak the raw setup hint to applicants — but surface a useful note
    // if the storage bucket or table simply hasn't been provisioned yet.
    const message = info.missingTable || /bucket/i.test(info.detail)
      ? "We can't accept applications right now. Please try again later or call us."
      : "Couldn't submit your application. Please try again.";
    return { error: message };
  }

  revalidatePath("/admin/employees");
  return { ok: true };
}

async function uploadInto(applicantId: string, kind: string, file: File): Promise<string> {
  const ext = extFromMime(file.type) || extFromName(file.name) || "bin";
  const path = `${applicantId}/${kind}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: true });
  if (error) throw error;
  return path;
}

async function uploadDataUrl(applicantId: string, kind: string, dataUrl: string): Promise<string> {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Invalid signature data URL");
  const [, mime, b64] = m;
  const buf = Buffer.from(b64, "base64");
  const ext = extFromMime(mime) || "png";
  const path = `${applicantId}/${kind}.${ext}`;
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, buf, { contentType: mime, upsert: true });
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
