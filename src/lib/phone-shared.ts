// Client-safe phone-link and formatting helpers shared across admin surfaces.

/**
 * Format any phone number for clean UI display without duplicate "+91 +91".
 * Standardizes 10-digit Indian numbers to "+91 XXXXX XXXXX".
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  let digits = raw.replace(/\D/g, "");

  // If 12 digits starting with 91, strip country code to get 10-digit core
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // If 11 digits starting with 0, strip leading zero
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Standard Indian 10-digit mobile
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // If already formatted with + prefix, ensure only single +91 prefix
  if (raw.startsWith("+91") || raw.startsWith("+ 91")) {
    const cleaned = raw.replace(/^\+[\s]*91[\s]*/i, "").trim();
    return `+91 ${cleaned}`;
  }

  return raw;
}

/**
 * Normalizes phone number into international pure digits for wa.me links.
 * Always produces a 12-digit format "91XXXXXXXXXX" for Indian numbers.
 */
export function phoneToIntlDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Build a `https://wa.me/<digits>` link with an optional prefilled message.
 * Returns "#" when the phone is empty so the anchor stays inert.
 */
export function whatsappLink(phone: string | null | undefined, text?: string): string {
  const d = phoneToIntlDigits(phone);
  if (!d) return "#";
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${d}${t}`;
}

/**
 * Build a `tel:<dialable>` link.
 */
export function telLink(phone: string | null | undefined): string {
  const d = phoneToIntlDigits(phone);
  if (!d) return "#";
  return `tel:+${d}`;
}
