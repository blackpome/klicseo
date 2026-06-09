// Client-safe metadata for the marketing Pricing cards' editable "from" prices.
// No server-only / no "use client" so both the server settings lib and client
// components can import it.

export type CardId = "CarWash" | "OneTimeCarWash" | "CarDetailing";

export interface CardPrice {
  price: number;         // the net "Starts @" value — what the customer pays
  mrp: number | null;    // optional strike-through MRP. Null = no strike.
  enabled: boolean;      // use this custom price? (false = fall back to the default)
  suffix: string | null; // custom suffix (e.g. "/month"). Null = use default.
}

export type CardPrices = Record<CardId, CardPrice>;

export const CARD_DEFS: { id: CardId; label: string; suffix: string; default: number }[] = [
  { id: "CarWash", label: "Car Wash", suffix: "/day", default: 19 },
  { id: "OneTimeCarWash", label: "One-Time Wash", suffix: "/wash", default: 249 },
  { id: "CarDetailing", label: "Car Detailing", suffix: "/package", default: 4999 },
];

export const CARD_DEFAULTS: CardPrices = Object.fromEntries(
  CARD_DEFS.map((d) => [d.id, { price: d.default, mrp: null, enabled: false }]),
) as CardPrices;

export function isCardId(v: unknown): v is CardId {
  return v === "CarWash" || v === "OneTimeCarWash" || v === "CarDetailing";
}
