"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { ALL_PRICE_LINES } from "@/lib/pricing";
import type { CarPrices } from "@/lib/carPricing";
import { insertCar, updateCar, deleteCar, bulkSetCarPrices, type CarInput } from "@/lib/cars";

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
  const prices: Partial<CarPrices> = {};
  for (const line of ALL_PRICE_LINES) {
    prices[line] = parsePrice(String(formData.get(line) ?? ""));
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
  try {
    await insertCar(car);
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
  try {
    await updateCar(id, car);
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update cars." };
  }
  revalidatePath("/admin/cars");
  return { ok: `Updated ${Object.keys(prices).length} price line(s) on ${ids.length} car(s).` };
}
