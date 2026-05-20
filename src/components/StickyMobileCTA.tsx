"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Always-visible mobile booking CTA across every section EXCEPT the hero —
// the hero has its own dedicated cyan/blue Book Now pill, so showing this
// one on top would just duplicate the call. We use an IntersectionObserver
// on #hero to know when to slide ourselves out of the way; when the user
// scrolls past the hero, the sticky CTA returns.
export default function StickyMobileCTA() {
  const [inHero, setInHero] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) {
      setInHero(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInHero(entry.isIntersecting),
      // Trigger as soon as ANY part of the hero is on screen — we don't want
      // the sticky to fight the hero pill for attention, even if just the
      // bottom of the hero is visible.
      { threshold: 0.01 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{
        y: inHero ? 120 : 0,
        opacity: inHero ? 0 : 1,
        pointerEvents: inHero ? "none" : "auto",
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed bottom-3 left-3 right-3 z-40 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative">
        {/* Pulsing aura — sits behind the pill, never blocks taps */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(135deg,#22D3EE,#3B82F6,#6366F1)",
            filter: "blur(18px)",
            opacity: 0.7,
          }}
        />

        <Link
          href="/booking"
          className="relative flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 active:scale-[0.98] transition-transform overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#22D3EE 0%,#3B82F6 50%,#6366F1 100%)",
            boxShadow:
              "0 10px 30px rgba(59,130,246,0.50), 0 0 0 1px rgba(255,255,255,0.14) inset",
          }}
        >
          {/* Diagonal shimmer sweep — periodic glint to draw the eye */}
          <motion.span
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
            initial={{ x: "-100%" }}
            animate={{ x: "350%" }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(75deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
              filter: "blur(4px)",
            }}
          />

          <span className="relative text-left">
            <span className="block text-[10px] font-semibold text-white/80 uppercase tracking-widest">
              Mobile car wash
            </span>
            <span className="block text-base font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              Book Now · From ₹19/day
            </span>
          </span>

          {/* Arrow chip — white circle for high contrast against the gradient */}
          <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.25)] flex-shrink-0">
            <ArrowRight size={18} className="text-[#3B82F6]" strokeWidth={2.75} />
          </span>
        </Link>
      </div>
    </motion.div>
  );
}
