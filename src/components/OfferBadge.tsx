"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useMaxDiscount } from "./DiscountContext";

// Marketing badge driven by the live discounts. By default it shows the highest
// active discount ("Up to 25% OFF") and hides itself when nothing is discounted.
// Pass `percent` to show a specific service's discount (e.g. on a pricing card).
export default function OfferBadge({
  className = "",
  note = "Prices already include the discount",
  percent,
  prefix,
}: {
  className?: string;
  note?: string | null;
  percent?: number;
  prefix?: string;
}) {
  const maxDiscount = useMaxDiscount();
  const pct = percent ?? maxDiscount;
  if (!pct || pct <= 0) return null;
  const label = `${prefix ? `${prefix} ` : percent == null ? "Up to " : ""}${pct}% OFF`;
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-[0_4px_18px_rgba(220,38,38,0.45)]"
        style={{ background: "linear-gradient(135deg, #DC2626 0%, #F97316 100%)" }}
      >
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <Flame size={15} fill="#FFE08A" className="text-[#FFE08A]" />
        </motion.span>
        <span className="tracking-wide">{label}</span>
        <span className="w-px h-3.5 bg-white/40" />
        <motion.span
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="font-semibold uppercase text-[11px] tracking-widest"
        >
          Closes soon
        </motion.span>
      </motion.div>
      {note && <p className="text-[11px] text-white/45">{note}</p>}
    </div>
  );
}
