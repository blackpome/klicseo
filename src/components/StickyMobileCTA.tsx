"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Appears after the user scrolls past the hero so it doesn't compete with the
// already-visible Book Your Wash CTA.
const REVEAL_AFTER_PX = 480;

export default function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > REVEAL_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ y: visible ? 0 : 96, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-3 left-3 right-3 z-40 sm:hidden"
    >
      <Link
        href="/booking"
        className="flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 shadow-[0_8px_32px_rgba(201,168,76,0.35)] active:scale-[0.98] transition-transform"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        <span className="text-left">
          <span className="block text-[10px] font-semibold text-[#050E21]/70 uppercase tracking-widest">
            Mobile car wash
          </span>
          <span className="block text-base font-bold text-[#050E21]">
            Book Now · From ₹249
          </span>
        </span>
        <ArrowRight size={20} className="text-[#050E21] flex-shrink-0" strokeWidth={2.5} />
      </Link>
    </motion.div>
  );
}
