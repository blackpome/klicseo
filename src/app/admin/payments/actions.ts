"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin-auth";
import { upsertPayment, isValidPeriod, PAYMENT_METHODS, type PaymentStatus } from "@/lib/payments";
import { logAudit } from "@/lib/audit";

export async function savePaymentAction(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  try {
    await requirePermission("leads.manage");

    const lead_id = String(formData.get("lead_id") ?? "");
    const period = String(formData.get("period") ?? "");
    if (!lead_id || !isValidPeriod(period)) return { error: "Bad request." };

    const status: PaymentStatus = formData.get("status") === "paid" ? "paid" : "pending";
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const amount = amountRaw === "" ? null : Math.max(0, Math.round(Number(amountRaw)));
    const methodRaw = String(formData.get("method") ?? "").trim();
    const method = (PAYMENT_METHODS as readonly string[]).includes(methodRaw) ? methodRaw : null;
    const paidRaw = String(formData.get("paid_at") ?? "").trim();
    // Auto-stamp today's date when marking paid with no date entered.
    const paid_at = status === "paid" ? (paidRaw || new Date().toISOString().slice(0, 10)) : (paidRaw || null);
    const notes = String(formData.get("notes") ?? "").trim() || null;

    await upsertPayment({
      lead_id,
      period,
      amount: amount != null && Number.isFinite(amount) ? amount : null,
      status,
      method,
      paid_at,
      notes,
    });

    await logAudit("payment.save", {
      entity: "payment",
      entityId: lead_id,
      summary: `Payment ${period} → ${status}${amount != null ? ` (₹${amount})` : ""}`,
      metadata: { period, status, amount, method },
    });
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/${lead_id}`);
    return { ok: status === "paid" ? "Marked paid" : "Saved" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn’t save." };
  }
}
