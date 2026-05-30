"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import {
  updateCategory, updateOption, reorderCategories, reorderOptions,
  createCategory, deleteCategory, createOption, deleteOption,
} from "@/lib/serviceCatalog";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

function refresh() {
  revalidatePath("/admin/services");
  // Layout revalidation so the polled SiteSettingsContext picks up changes
  // once Phase 6 wires reads through. For now this is harmless.
  revalidatePath("/", "layout");
}

export async function saveCategoryAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing category id." };
    const label = String(formData.get("label") ?? "").trim();
    if (!label) return { error: "Category name is required." };
    const blurb = String(formData.get("blurb") ?? "").trim() || null;
    const enabled = formData.get("enabled") === "true";
    await updateCategory(id, { label, blurb, enabled });
    await logAudit("service.category.update", { entity: "booking", entityId: id, summary: `Saved category "${label}"` });
    refresh();
    return { ok: "Saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
}

export async function saveOptionAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing option id." };
    const label = String(formData.get("label") ?? "").trim();
    if (!label) return { error: "Option name is required." };
    const short_label = String(formData.get("short_label") ?? "").trim() || null;
    const blurb = String(formData.get("blurb") ?? "").trim() || null;
    const enabled = formData.get("enabled") === "true";
    await updateOption(id, { label, short_label, blurb, enabled });
    await logAudit("service.option.update", { entity: "booking", entityId: id, summary: `Saved option "${label}"` });
    refresh();
    return { ok: "Saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }
}

/** Toggle a category's enabled flag without going through the full save form. */
export async function toggleCategoryAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;
  await updateCategory(id, { enabled });
  await logAudit("service.category.toggle", { entity: "booking", entityId: id, summary: `Category ${enabled ? "enabled" : "disabled"}` });
  refresh();
}

export async function toggleOptionAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;
  await updateOption(id, { enabled });
  await logAudit("service.option.toggle", { entity: "booking", entityId: id, summary: `Option ${enabled ? "enabled" : "disabled"}` });
  refresh();
}

export async function reorderCategoriesAction(formData: FormData) {
  await requireManager();
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await reorderCategories(ids);
  await logAudit("service.category.reorder", { entity: "booking", summary: `Reordered ${ids.length} categories` });
  refresh();
}

export async function reorderOptionsAction(formData: FormData) {
  await requireManager();
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await reorderOptions(ids);
  await logAudit("service.option.reorder", { entity: "booking", summary: `Reordered ${ids.length} options` });
  refresh();
}

// --- Create / delete -----------------------------------------------------

export async function createCategoryAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const label = String(formData.get("label") ?? "").trim();
    if (!label) return { error: "Category name is required." };
    const blurb = String(formData.get("blurb") ?? "").trim() || null;
    const id = await createCategory({ label, blurb });
    await logAudit("service.category.create", { entity: "booking", entityId: id, summary: `Created category "${label}"` });
    refresh();
    return { ok: "Created." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create category." };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteCategory(id);
  await logAudit("service.category.delete", { entity: "booking", entityId: id, summary: "Deleted category" });
  refresh();
}

export async function createOptionAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const categoryId = String(formData.get("category_id") ?? "");
    const label = String(formData.get("label") ?? "").trim();
    if (!categoryId) return { error: "Missing category." };
    if (!label) return { error: "Sub-category name is required." };
    const shortLabel = String(formData.get("short_label") ?? "").trim() || null;
    const blurb = String(formData.get("blurb") ?? "").trim() || null;
    const recurring = String(formData.get("recurring") ?? "one_time") === "monthly" ? "monthly" : "one_time";
    const hasOutsideVariant = formData.get("has_outside_variant") === "true";
    const hasAddon = formData.get("has_addon") === "true";
    const isAddon = formData.get("is_addon") === "true";
    const id = await createOption({ categoryId, label, shortLabel, blurb, recurring, hasOutsideVariant, hasAddon, isAddon });
    await logAudit("service.option.create", { entity: "booking", entityId: id, summary: `Created sub-category "${label}"` });
    refresh();
    return { ok: "Created." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create sub-category." };
  }
}

export async function deleteOptionAction(formData: FormData) {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteOption(id);
  await logAudit("service.option.delete", { entity: "booking", entityId: id, summary: "Deleted sub-category" });
  refresh();
}
