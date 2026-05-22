"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-auth";
import { setSiteSettings } from "@/lib/site-settings";
import { CARD_DEFS, type CardPrices } from "@/lib/card-prices-shared";

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

    const phone = String(formData.get("phone") ?? "").trim();
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();
    if (!phone) return { error: "Phone number is required." };
    if (!whatsapp) return { error: "WhatsApp number is required." };

    const cardPrices = {} as CardPrices;
    for (const d of CARD_DEFS) {
      const p = Number(String(formData.get(`card_${d.id}_price`) ?? "").trim());
      cardPrices[d.id] = {
        price: Number.isFinite(p) && p >= 0 ? Math.round(p) : d.default,
        enabled: formData.get(`card_${d.id}_on`) === "on",
      };
    }

    await setSiteSettings({ startPrice, phone, whatsapp, cardPrices });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: "Saved." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save." };
  }
}
