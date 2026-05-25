// Client-safe phone-link helpers shared across admin surfaces.
//
// Numbers in the DB are stored as the customer typed them (after encryption).
// They may be 10-digit local, +91-prefixed, or have spaces/punctuation. Both
// `wa.me/` and `tel:` need different normalisations:
//   * wa.me wants pure digits with a country code — we assume +91 (Chennai) for
//     a 10-digit local number, otherwise honour whatever digits are present.
//   * tel: accepts the raw string verbatim minus whitespace, so the dialler
//     can preserve a +country prefix the user typed.

export function phoneToIntlDigits(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/** Build a `https://wa.me/<digits>` link with an optional prefilled message.
 *  Returns "#" when the phone is empty so the anchor stays inert. */
export function whatsappLink(phone: string | null | undefined, text?: string): string {
  const d = phoneToIntlDigits(phone);
  if (!d) return "#";
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${d}${t}`;
}

export function telLink(phone: string | null | undefined): string {
  const raw = String(phone ?? "").replace(/\s+/g, "");
  return raw ? `tel:${raw}` : "#";
}
