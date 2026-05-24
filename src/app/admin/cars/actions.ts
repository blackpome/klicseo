"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { insertCar, updateCar, deleteCar, getCar, listBrands, type CarInput } from "@/lib/cars";
import { createTier, updateTier, deleteTier, getTier, assignCarsToTier, unassignCars } from "@/lib/priceTiers";
import { readLineAmountsFromForm } from "@/lib/priceTiers-shared";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

function readCar(formData: FormData): CarInput {
  return {
    brand: String(formData.get("brand") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    body_type: String(formData.get("body_type") ?? "").trim() || null,
    segment_name: String(formData.get("segment_name") ?? "").trim() || null,
  };
}

export async function createCarAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireManager();
  const car = readCar(formData);
  if (!car.brand || !car.model) return { error: "Brand and model are required." };
  const tierId = String(formData.get("tier_id") ?? "").trim();
  try {
    const created = await insertCar(car);
    if (tierId) await assignCarsToTier([created.id], tierId);
    await logAudit("car.create", { entity: "car", entityId: created.id, summary: `Added car ${car.brand} ${car.model}` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add car." };
  }
  revalidatePath("/admin/cars");
  redirect("/admin/cars");
}

export async function updateCarAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing car id." };
  const car = readCar(formData);
  if (!car.brand || !car.model) return { error: "Brand and model are required." };
  const tierIdRaw = formData.get("tier_id");
  const tierId = tierIdRaw == null ? undefined : String(tierIdRaw).trim();
  try {
    const before = await getCar(id);
    await updateCar(id, car);
    // If a tier picker value was submitted, sync the assignment (empty string
    // = unassign). Leaving the field out keeps whatever assignment exists.
    if (tierId != null) {
      if (tierId === "") await unassignCars([id]);
      else await assignCarsToTier([id], tierId);
    }
    const after = await getCar(id);
    await logAudit("car.update", {
      entity: "car",
      entityId: id,
      summary: `Edited car ${car.brand} ${car.model}`,
      before: before ? (before as unknown as Record<string, unknown>) : null,
      after: after ? (after as unknown as Record<string, unknown>) : null,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save car." };
  }
  revalidatePath("/admin/cars");
  redirect("/admin/cars");
}

export async function deleteCarAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteCar(id);
  await logAudit("car.delete", { entity: "car", entityId: id, summary: "Deleted car" });
  revalidatePath("/admin/cars");
  redirect("/admin/cars");
}

// --- Price tiers ----------------------------------------------------------

export async function createTierAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireManager();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Tier name is required." };
  try {
    const t = await createTier(name, readLineAmountsFromForm(formData));
    await logAudit("tier.create", { entity: "car", entityId: t.id, summary: `Created tier "${name}"` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create tier." };
  }
  revalidatePath("/admin/cars");
  return {};
}

export async function updateTierAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing tier id." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Tier name is required." };
  try {
    const before = await getTier(id);
    await updateTier(id, { name, amounts: readLineAmountsFromForm(formData) });
    const after = await getTier(id);
    await logAudit("tier.update", {
      entity: "car",
      entityId: id,
      summary: `Edited tier "${name}"`,
      before: before ? (before as unknown as Record<string, unknown>) : null,
      after: after ? (after as unknown as Record<string, unknown>) : null,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save tier." };
  }
  revalidatePath("/admin/cars");
  revalidatePath(`/admin/cars/tier/${id}`);
  return { ok: "Saved." };
}

export async function deleteTierAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteTier(id);
  await logAudit("tier.delete", { entity: "car", entityId: id, summary: "Deleted price tier" });
  revalidatePath("/admin/cars");
  redirect("/admin/cars");
}

export async function assignCarsAction(formData: FormData) {
  await requireManager();
  const tierId = String(formData.get("tier_id") ?? "");
  const carIds = formData.getAll("car_ids").map(String).filter(Boolean);
  if (!tierId || carIds.length === 0) return;
  await assignCarsToTier(carIds, tierId);
  await logAudit("tier.assign", { entity: "car", entityId: tierId, summary: `Added ${carIds.length} car(s) to tier`, metadata: { carIds } });
  revalidatePath("/admin/cars");
  revalidatePath(`/admin/cars/tier/${tierId}`);
}

export async function removeCarsFromTierAction(formData: FormData) {
  await requireManager();
  const tierId = String(formData.get("tier_id") ?? "");
  const carIds = formData.getAll("car_ids").map(String).filter(Boolean);
  if (carIds.length === 0) return;
  await unassignCars(carIds);
  await logAudit("tier.unassign", { entity: "car", entityId: tierId || null, summary: `Removed ${carIds.length} car(s) from tier`, metadata: { carIds } });
  if (tierId) revalidatePath(`/admin/cars/tier/${tierId}`);
  revalidatePath("/admin/cars");
}

// --- Bulk add (spreadsheet-style) ---------------------------------------

export interface BulkCarRow {
  brand: string;
  model: string;
  body_type?: string | null;
  segment_name?: string | null;
  tier_id?: string | null;
}

export async function bulkCreateCarsAction(
  rows: BulkCarRow[],
): Promise<{ ok?: { created: number; skipped: number }; error?: string }> {
  try {
    await requireManager();
    const valid = rows
      .map((r) => ({
        brand: String(r.brand ?? "").trim(),
        model: String(r.model ?? "").trim(),
        body_type: r.body_type?.toString().trim() || null,
        segment_name: r.segment_name?.toString().trim() || null,
        tier_id: r.tier_id?.toString().trim() || null,
      }))
      .filter((r) => r.brand && r.model);

    if (valid.length === 0) return { error: "Add at least one row with a brand + model." };

    let created = 0;
    const createdIds: string[] = [];
    for (const r of valid) {
      const car = await insertCar({ brand: r.brand, model: r.model, body_type: r.body_type, segment_name: r.segment_name });
      if (r.tier_id) await assignCarsToTier([car.id], r.tier_id);
      createdIds.push(car.id);
      created++;
    }

    await logAudit("car.bulk_create", {
      entity: "car",
      summary: `Bulk-added ${created} car(s)`,
      metadata: { count: created, ids: createdIds },
    });
    revalidatePath("/admin/cars");
    return { ok: { created, skipped: rows.length - valid.length } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save rows." };
  }
}

/** Distinct brand list — used by the bulk-add sheet for autocomplete + dedup hints. */
export async function listBrandsAction(): Promise<string[]> {
  await requireManager();
  return listBrands();
}
