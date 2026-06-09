"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin-auth";
import {
  deleteLead,
  insertLead,
  updateLead,
  updateLeadStatus,
  getLead,
  type LeadStatus,
  type LeadUpdate,
} from "@/lib/leads";
import { priceFor, type ServiceDiscounts } from "@/lib/pricing";
import { getServiceDiscounts } from "@/lib/discounts";
import { logAudit } from "@/lib/audit";

export async function setStatusAction(formData: FormData) {
  await requirePermission("leads.manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!id || !status) return;
  await updateLeadStatus(id, status);
  await logAudit("lead.status", { entity: "lead", entityId: id, summary: `Set lead status → ${status}` });
  revalidatePath("/admin");
}

export async function deleteLeadAction(formData: FormData) {
  await requirePermission("leads.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteLead(id);
  await logAudit("lead.delete", { entity: "lead", entityId: id, summary: "Deleted lead" });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateNotesAction(formData: FormData) {
  await requirePermission("leads.manage");
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!id) return;
  // Route through updateLead so the notes field is encrypted by the lib.
  await updateLead(id, { notes: notes || null });
  await logAudit("lead.notes", { entity: "lead", entityId: id, summary: "Updated lead notes" });
  revalidatePath(`/admin/${id}`);
}

// Build the lead payload shared between create and update. The price override
// input is only applied when the user didn't pick a service+option combo we can
// auto-price; on edit, a blank field means "clear the override".
function readLeadFromForm(formData: FormData, discounts: ServiceDiscounts) {
  const service = String(formData.get("service") ?? "") || null;
  const service_option = String(formData.get("service_option") ?? "") || null;
  const interior_add_on = formData.get("interior_add_on") === "on";
  const vehicle_type = String(formData.get("vehicle_type") ?? "") || null;
  const parking_location = String(formData.get("parking_location") ?? "") || null;

  const priced =
    service_option && vehicle_type
      ? priceFor(service_option, vehicle_type, interior_add_on, (parking_location as "" | "inside" | "outside") || "", discounts)
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
    car_brand: String(formData.get("car_brand") ?? "") || null,
    car_model: String(formData.get("car_model") ?? "") || null,
    car_number: String(formData.get("car_number") ?? "") || null,
    pincode: String(formData.get("pincode") ?? "") || null,
    // Empty string → null so insertLead/updateLead auto-derive from pincode.
    area: String(formData.get("area") ?? "").trim() || null,
    address: String(formData.get("address") ?? "") || null,
    map_link: String(formData.get("map_link") ?? "").trim() || null,
    parking_location,
    car_cover_choice: String(formData.get("car_cover_choice") ?? "") || null,
    gate_access_notes: String(formData.get("gate_access_notes") ?? "").trim() || null,
    shift: String(formData.get("shift") ?? "") || null,
    callback_date: String(formData.get("callback_date") ?? "") || null,
    callback_time: String(formData.get("callback_time") ?? "") || null,
    price_total: (override != null && Number.isFinite(override) ? override : null) ?? priced?.discountedTotal,
    discount_percent: priced?.basePercent ?? null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createLeadAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requirePermission("leads.manage");
  const data = readLeadFromForm(formData, await getServiceDiscounts());

  const lead = await insertLead({
    source: "admin",
    ...data,
    gate_access_consent: false,
    latitude: null,
    longitude: null,
    custom_fields: null,
  });

  await logAudit("lead.create", { entity: "lead", entityId: lead.id, summary: `Created lead ${data.name ?? ""}`.trim() });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateLeadAction(_prev: { error?: string }, formData: FormData) {
  await requirePermission("leads.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing lead id." };

  const data = readLeadFromForm(formData, await getServiceDiscounts());
  // Snapshot before/after so the audit log carries the field-level diff.
  const before = await getLead(id);
  await updateLead(id, data as LeadUpdate);
  const after = await getLead(id);

  await logAudit("lead.update", {
    entity: "lead",
    entityId: id,
    summary: `Edited lead ${data.name ?? before?.name ?? ""}`.trim(),
    before: before ? (before as unknown as Record<string, unknown>) : null,
    after: after ? (after as unknown as Record<string, unknown>) : null,
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}`);
}
