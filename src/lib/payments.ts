import "server-only";
import { supabase } from "./supabase";
import type { PaymentInput, PaymentRow } from "./payments-shared";

export * from "./payments-shared";

const COLS = "id,lead_id,period,amount,status,method,paid_at,notes";

/** All payment rows for a given month. */
export async function listPeriodPayments(period: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase().from("payments").select(COLS).eq("period", period);
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

/** A customer's payment history (newest month first). */
export async function getCustomerPayments(leadId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase()
    .from("payments")
    .select(COLS)
    .eq("lead_id", leadId)
    .order("period", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

/** Create or update the payment for a customer+month. */
export async function upsertPayment(input: PaymentInput): Promise<void> {
  const { error } = await supabase()
    .from("payments")
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "lead_id,period" });
  if (error) throw error;
}
