"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

// Marketing badge: the listed prices already include the 30% off, so this is
// purely a visual urgency marker — no price math anywhere.
export default function OfferBadge({
  className = "",
  note = "Prices already include the discount",
}: {
  className?: string;
  note?: string | null;
}) {
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
        <span className="tracking-wide">30% OFF</span>
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
