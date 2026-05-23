"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { ALL_PRICE_LINES } from "@/lib/pricing";
import type { CarPrices } from "@/lib/carPricing";
import { insertCar, updateCar, deleteCar, bulkSetCarPrices, type CarInput } from "@/lib/cars";
import { createTier, updateTier, deleteTier, assignCarsToTier, unassignCars } from "@/lib/priceTiers";
import { readTierPricesFromForm } from "@/lib/priceTiers-shared";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

function parsePrice(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function readCar(formData: FormData): CarInput {
  // Prices are no longer entered per-car; they come from the assigned tier
  // (mirrored by assignCarsToTier). Read any straggling price fields just in
  // case, but the canonical source is the tier picker.
  const prices: Partial<CarPrices> = {};
  for (const line of ALL_PRICE_LINES) {
    const raw = String(formData.get(line) ?? "").trim();
    if (raw !== "") prices[line] = parsePrice(raw);
  }
  return {
    brand: String(formData.get("brand") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    body_type: String(formData.get("body_type") ?? "").trim() || null,
    segment_name: String(formData.get("segment_name") ?? "").trim() || null,
    prices,
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
    await updateCar(id, car);
    // If a tier picker value was submitted, sync the assignment (empty string
    // = unassign). Leaving the field out keeps whatever assignment exists.
    if (tierId != null) {
      if (tierId === "") await unassignCars([id]);
      else await assignCarsToTier([id], tierId);
    }
    await logAudit("car.update", { entity: "car", entityId: id, summary: `Edited car ${car.brand} ${car.model}` });
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

// Group price: apply only the filled-in price lines to all selected cars.
export async function bulkSetPricesAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireManager();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Select at least one car." };

  const prices: Partial<CarPrices> = {};
  for (const line of ALL_PRICE_LINES) {
    const raw = String(formData.get(line) ?? "").trim();
    if (raw !== "") {
      const n = parsePrice(raw);
      if (n != null) prices[line] = n;
    }
  }
  if (Object.keys(prices).length === 0) return { error: "Enter at least one price to apply." };

  try {
    await bulkSetCarPrices(ids, prices);
    await logAudit("car.bulk_price", { entity: "car", summary: `Group price on ${ids.length} cars`, metadata: { ids, prices } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update cars." };
  }
  revalidatePath("/admin/cars");
  return { ok: `Updated ${Object.keys(prices).length} price line(s) on ${ids.length} car(s).` };
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
    const t = await createTier(name, readTierPricesFromForm(formData));
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
    await updateTier(id, { name, ...readTierPricesFromForm(formData) });
    await logAudit("tier.update", { entity: "car", entityId: id, summary: `Edited tier "${name}"` });
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
