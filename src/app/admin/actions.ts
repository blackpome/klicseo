"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { deleteLead, insertLead, updateLeadStatus, type LeadStatus } from "@/lib/leads";
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

export async function createLeadAction(_prev: { error?: string }, formData: FormData) {
  await requireAdmin();

  const phone = String(formData.get("phone") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!phone || phone.length < 8) {
    return { error: "Phone number required (min 8 digits)." };
  }
  if (!name) {
    return { error: "Name required." };
  }

  const service = String(formData.get("service") ?? "") || null;
  const service_option = String(formData.get("service_option") ?? "") || null;
  const interior_add_on = formData.get("interior_add_on") === "on";
  const vehicle_type = String(formData.get("vehicle_type") ?? "") || null;
  const parking_location = String(formData.get("parking_location") ?? "") || null;

  const priced = service_option && vehicle_type
    ? priceFor(service_option, vehicle_type, interior_add_on, (parking_location as "" | "inside" | "outside") || "")
    : null;

  await insertLead({
    source: "admin",
    name,
    phone,
    service,
    service_option,
    interior_add_on,
    vehicle_type,
    car_model: String(formData.get("car_model") ?? "") || null,
    car_number: String(formData.get("car_number") ?? "") || null,
    pincode: String(formData.get("pincode") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    parking_location,
    car_cover_choice: String(formData.get("car_cover_choice") ?? "") || null,
    gate_access_consent: formData.get("gate_access_consent") === "on",
    shift: String(formData.get("shift") ?? "") || null,
    callback_date: String(formData.get("callback_date") ?? "") || null,
    callback_time: String(formData.get("callback_time") ?? "") || null,
    latitude: null,
    longitude: null,
    price_total: priced?.total ?? (formData.get("price_total") ? Number(formData.get("price_total")) : null),
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/admin");
  redirect("/admin");
}
