"use client";

import { FaWhatsapp } from "react-icons/fa6";
import { whatsappLink } from "@/lib/phone-shared";

/**
 * Small green WhatsApp-icon link rendered next to phone numbers in the admin
 * UI. Falls back to a disabled visual when the phone is empty so the layout
 * stays steady. Uses the brand icon set per the project's icon conventions.
 */
export default function WhatsAppLink({
  phone,
  label,
  size = 14,
  className = "",
}: {
  phone: string | null | undefined;
  /** Aria-label and tooltip — defaults to a generic chat-open hint. */
  label?: string;
  size?: number;
  className?: string;
}) {
  const has = !!phone && String(phone).replace(/\D/g, "").length >= 10;
  const title = label ?? "Open WhatsApp chat";
  if (!has) {
    return (
      <span
        aria-hidden
        title="No phone number"
        className={`inline-grid h-6 w-6 place-items-center rounded-md bg-white/5 text-white/25 ${className}`}
      >
        <FaWhatsapp size={size} />
      </span>
    );
  }
  return (
    <a
      href={whatsappLink(phone)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      title={title}
      onClick={(e) => e.stopPropagation()}
      className={`inline-grid h-6 w-6 place-items-center rounded-md bg-[#25D366]/10 text-[#25D366] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors ${className}`}
    >
      <FaWhatsapp size={size} />
    </a>
  );
}
