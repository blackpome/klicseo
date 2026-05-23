// Client-safe payment types + constants. DB access lives in lib/payments.ts
// (server-only), which re-exports everything here.

export type PaymentStatus = "paid" | "pending";
export const PAYMENT_METHODS = ["cash", "upi", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentRow {
  id: string;
  lead_id: string;
  period: string; // YYYY-MM
  amount: number | null;
  status: PaymentStatus;
  method: string | null;
  paid_at: string | null;
  notes: string | null;
}

export interface PaymentInput {
  lead_id: string;
  period: string;
  amount: number | null;
  status: PaymentStatus;
  method: string | null;
  paid_at: string | null;
  notes: string | null;
}

// Current month as IST wall-clock 'YYYY-MM'.
export function currentPeriod(): string {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 7);
}

export function isValidPeriod(p: string): boolean {
  return /^\d{4}-\d{2}$/.test(p);
}
