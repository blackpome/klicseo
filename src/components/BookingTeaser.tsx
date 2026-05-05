"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export default function BookingTeaser() {
  return (
    <section className="relative py-20 sm:py-28 px-4 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #050E21 0%, #071F4A 50%, #050E21 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(26,95,212,0.2) 0%, transparent 65%)",
        }}
      />

      {/* Decorative rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-[#1A5FD4]/10 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-[#C9A84C]/5 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-semibold tracking-[0.15em] uppercase text-[#C9A84C]"
            style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}>
            <Sparkles size={12} />
            Ready to shine?
          </div>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Book Your Premium
            <span className="gold-shimmer block mt-1">Car Wash Today</span>
          </h2>

          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto mb-10">
            We come to you — at home, work, or anywhere. Choose your package, pick a time, and we&apos;ll handle the rest.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/booking"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[#050E21] text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_rgba(201,168,76,0.5)]"
              style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
            >
              Book Now
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/booking?package=Premium"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white/70 glass-card hover:text-white transition-all"
            >
              Start with Premium
            </Link>
          </div>

          <p className="mt-8 text-white/25 text-xs">
            No credit card required · Flexible scheduling · We come to you
          </p>
        </motion.div>
      </div>
    </section>
  );
}
