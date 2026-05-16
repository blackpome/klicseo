"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import {
  deleteLead,
  insertLead,
  updateLead,
  updateLeadStatus,
  type LeadStatus,
  type LeadUpdate,
} from "@/lib/leads";
import { supabase } from "@/lib/supabase";
import { priceFor } from "@/lib/pricing";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function setStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!id || !status) return;
  await updateLeadStatus(id, status);
  revalidatePath("/admin");
}

export async function deleteLeadAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteLead(id);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateNotesAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!id) return;
  const { error } = await supabase().from("leads").update({ notes: notes || null }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/admin/${id}`);
}

// Build the lead payload shared between create and update. The price override
// input is only applied when the user didn't pick a service+option combo we can
// auto-price; on edit, a blank field means "clear the override".
function readLeadFromForm(formData: FormData) {
  const service = String(formData.get("service") ?? "") || null;
  const service_option = String(formData.get("service_option") ?? "") || null;
  const interior_add_on = formData.get("interior_add_on") === "on";
  const vehicle_type = String(formData.get("vehicle_type") ?? "") || null;
  const parking_location = String(formData.get("parking_location") ?? "") || null;

  const priced =
    service_option && vehicle_type
      ? priceFor(service_option, vehicle_type, interior_add_on, (parking_location as "" | "inside" | "outside") || "")
      : null;

  const overrideRaw = String(formData.get("price_total") ?? "").trim();
  const override = overrideRaw === "" ? null : Number(overrideRaw);

  return {
    name: String(formData.get("name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    service,
    service_option,
    interior_add_on,
    vehicle_type,
    car_model: String(formData.get("car_model") ?? "") || null,
    car_number: String(formData.get("car_number") ?? "") || null,
    pincode: String(formData.get("pincode") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    map_link: String(formData.get("map_link") ?? "").trim() || null,
    parking_location,
    car_cover_choice: String(formData.get("car_cover_choice") ?? "") || null,
    gate_access_notes: String(formData.get("gate_access_notes") ?? "").trim() || null,
    shift: String(formData.get("shift") ?? "") || null,
    callback_date: String(formData.get("callback_date") ?? "") || null,
    callback_time: String(formData.get("callback_time") ?? "") || null,
    price_total: priced?.total ?? (override != null && Number.isFinite(override) ? override : null),
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createLeadAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();
  const data = readLeadFromForm(formData);

  await insertLead({
    source: "admin",
    ...data,
    gate_access_consent: false,
    latitude: null,
    longitude: null,
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateLeadAction(_prev: { error?: string }, formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing lead id." };

  const data = readLeadFromForm(formData);
  await updateLead(id, data as LeadUpdate);

  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}`);
}
