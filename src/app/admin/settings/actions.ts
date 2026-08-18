"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { setSiteSettings, uploadSiteMedia, resetSiteMedia, isMediaKey, getSiteSettings } from "@/lib/site-settings";
import { CARD_DEFS, type CardPrices } from "@/lib/card-prices-shared";
import { SOCIAL_PLATFORMS, type SocialLinks } from "@/lib/site-settings-shared";
import { logAudit } from "@/lib/audit";

async function requireManager() {
  const me = await currentAdmin();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "super_admin" && me.role !== "admin") throw new Error("Forbidden");
}

export async function saveSiteSettingsAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const priceRaw = String(formData.get("startPrice") ?? "").trim();
    const startPrice = Number(priceRaw);
    if (!Number.isFinite(startPrice) || startPrice < 0) return { error: "Enter a valid starting price." };
    const startPriceSuffix = String(formData.get("startPriceSuffix") ?? "").trim() || "/day";

    const phone = String(formData.get("phone") ?? "").trim();
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();
    if (!phone) return { error: "Phone number is required." };
    if (!whatsapp) return { error: "WhatsApp number is required." };

    const cardPrices = {} as CardPrices;
    for (const d of CARD_DEFS) {
      const p = Number(String(formData.get(`card_${d.id}_price`) ?? "").trim());
      const mrpRaw = String(formData.get(`card_${d.id}_mrp`) ?? "").trim();
      const mrpNum = mrpRaw === "" ? null : Number(mrpRaw);
      const suffix = String(formData.get(`card_${d.id}_suffix`) ?? "").trim() || null;
      cardPrices[d.id] = {
        price: Number.isFinite(p) && p >= 0 ? Math.round(p) : d.default,
        mrp: mrpNum != null && Number.isFinite(mrpNum) && mrpNum > 0 ? Math.round(mrpNum) : null,
        enabled: formData.get(`card_${d.id}_on`) === "on",
        suffix,
      };
    }

    const social = {} as SocialLinks;
    for (const p of SOCIAL_PLATFORMS) {
      social[p.key] = {
        url: String(formData.get(`social_${p.key}_url`) ?? "").trim(),
        enabled: formData.get(`social_${p.key}_on`) === "on",
      };
    }

    const footerLocation = {
      text: String(formData.get("footer_location_text") ?? "").trim(),
      enabled: formData.get("footer_location_on") === "on",
    };

    const beforeSettings = await getSiteSettings();
    const before = {
      startPrice: beforeSettings.startPrice,
      startPriceSuffix: beforeSettings.startPriceSuffix,
      phone: beforeSettings.phone,
      whatsapp: beforeSettings.whatsapp,
      cardPrices: beforeSettings.cardPrices,
      social: beforeSettings.social,
      footerLocation: beforeSettings.footerLocation,
    };
    await setSiteSettings({ startPrice, startPriceSuffix, phone, whatsapp, cardPrices, social, footerLocation });
    await logAudit("settings.save", {
      entity: "settings",
      summary: "Updated site settings",
      before: before as unknown as Record<string, unknown>,
      after: { startPrice, startPriceSuffix, phone, whatsapp, cardPrices, social, footerLocation } as unknown as Record<string, unknown>,
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: "Saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save." };
  }
}

export async function uploadMediaAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requireManager();
    const key = String(formData.get("key") ?? "");
    if (!isMediaKey(key)) return { error: "Invalid media slot." };
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a video or image file." };
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return { error: "Please upload a video or image file." };
    const cap = isImage ? 8 : 25;
    if (file.size > cap * 1024 * 1024) return { error: `File must be under ${cap} MB.` };

    await uploadSiteMedia(key, file);
    await logAudit("settings.media", { entity: "settings", entityId: key, summary: `Uploaded ${key} (${isImage ? "image" : "video"})` });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: "Uploaded." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function resetMediaAction(formData: FormData) {
  await requireManager();
  const key = String(formData.get("key") ?? "");
  if (!isMediaKey(key)) return;
  await resetSiteMedia(key);
  await logAudit("settings.media", { entity: "settings", entityId: key, summary: `Reset ${key} to default` });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export async function saveLeadStatusSettingsAction(
  statuses: { id: string; label: string; color: string; description?: string; isSystem?: boolean; enabled?: boolean }[],
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireManager();
    const { setLeadStatusSettings } = await import("@/lib/site-settings");
    await setLeadStatusSettings(statuses);
    await logAudit("settings.lead_statuses", {
      entity: "settings",
      entityId: "lead_statuses",
      summary: `Updated CRM lead statuses (${statuses.length} items configured)`,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/lists");
    revalidatePath("/admin/my-lists");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save lead statuses." };
  }
}
