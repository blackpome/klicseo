"use client";

import { useState } from "react";
import { Phone, Copy, Check } from "lucide-react";
import { formatPhone, telLink } from "@/lib/phone-shared";
import WhatsAppLink from "./WhatsAppLink";

export default function PhoneCell({
  phone,
  name,
  showCallButton = true,
  showCopyButton = true,
  showWhatsApp = true,
  compact = false,
  className = "",
}: {
  phone: string | null | undefined;
  name?: string | null;
  showCallButton?: boolean;
  showCopyButton?: boolean;
  showWhatsApp?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!phone) {
    return <span className="text-white/30 text-xs">—</span>;
  }

  const formatted = formatPhone(phone);
  const telHref = telLink(phone);
  const rawDigits = phone.replace(/\D/g, "");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const toCopy =
        rawDigits.length === 12 && rawDigits.startsWith("91")
          ? rawDigits.slice(2)
          : rawDigits.length === 10
          ? rawDigits
          : phone.trim();
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
        <a
          href={telHref}
          className="text-[#C9A84C] hover:underline focus:outline-none transition-colors"
          title={`Call ${formatted}`}
          onClick={(e) => e.stopPropagation()}
        >
          {formatted}
        </a>

        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy phone number"}
            aria-label="Copy phone number"
            className={`p-1 rounded transition-all flex items-center gap-1 ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied && <span className="text-[9px] font-sans font-semibold text-emerald-300">Copied</span>}
          </button>
        )}

        {showWhatsApp && (
          <WhatsAppLink
            phone={phone}
            label={`WhatsApp ${name ?? formatted}`}
            size={12}
            className="!h-5 !w-5"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Phone Number with Click-to-Call and 1-Click Copy */}
      <div className="flex items-center gap-1.5 font-mono text-xs text-white/90 font-medium">
        <a
          href={telHref}
          className="hover:text-[#C9A84C] hover:underline focus:outline-none transition-colors"
          title={`Call ${formatted}`}
          onClick={(e) => e.stopPropagation()}
        >
          {formatted}
        </a>

        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied to clipboard!" : "Copy phone number"}
            aria-label="Copy phone number"
            className={`p-1 rounded transition-all flex items-center gap-1 ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied && <span className="text-[10px] font-sans font-semibold text-emerald-300">Copied</span>}
          </button>
        )}
      </div>

      {/* Action Buttons: Call, WhatsApp */}
      {(showCallButton || showWhatsApp) && (
        <div className="flex items-center gap-1.5 pt-0.5">
          {showCallButton && (
            <a
              href={telHref}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#C9A84C]/20 text-[#E8CC7A] text-[10px] font-semibold transition-colors border border-white/10"
              title="Call customer via phone dialer"
            >
              <Phone size={10} /> Call
            </a>
          )}

          {showWhatsApp && (
            <WhatsAppLink
              phone={phone}
              label={`WhatsApp ${name ?? formatted}`}
              size={12}
              className="!h-5 !w-5"
            />
          )}
        </div>
      )}
    </div>
  );
}
