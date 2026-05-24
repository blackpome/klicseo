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

/** YYYY-MM of an ISO timestamp, interpreted in IST. */
export function periodFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t + 330 * 60 * 1000).toISOString().slice(0, 7);
}

/** Inclusive list of YYYY-MM periods from `from` → `to`. Returns [] when
 *  `to` precedes `from` or either is invalid. Capped at 600 to be safe. */
export function periodsBetween(from: string, to: string): string[] {
  if (!isValidPeriod(from) || !isValidPeriod(to)) return [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: string[] = [];
  let y = fy, m = fm;
  for (let safety = 0; safety < 600; safety++) {
    if (y > ty || (y === ty && m > tm)) break;
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
