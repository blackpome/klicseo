"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AnimatedHeading from "./AnimatedHeading";
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

      {/* Decorative rings — slow counter-rotation for ambient motion */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-[#1A5FD4]/10 pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, transparent 35%, black 70%)",
        }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-[#C9A84C]/10 pointer-events-none"
      />
      {/* Inner ring with dashed border for extra depth */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{
          border: "1px dashed rgba(201,168,76,0.18)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-semibold tracking-[0.15em] uppercase text-[#C9A84C]"
            style={{
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <motion.span
              animate={{ rotate: [0, 18, 0, -18, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={12} />
            </motion.span>
            Ready to shine?
          </motion.div>

          <AnimatedHeading
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "var(--font-playfair)" }}
            lines={[
              { text: "Book Your Premium", block: true },
              { text: "Car Wash Today", shimmer: true },
            ]}
          />

          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto mb-10">
            We come to you — at home, work, or anywhere. Choose your package,
            pick a time, and we&apos;ll handle the rest.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="relative"
            >
              {/* Pulse ring */}
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{ boxShadow: [
                  "0 0 0 0 rgba(201,168,76,0.0)",
                  "0 0 0 14px rgba(201,168,76,0.0)",
                ], opacity: [0.7, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                style={{ boxShadow: "0 0 0 0 rgba(201,168,76,0.5)" }}
              />
              <Link
                href="/booking"
                className="relative flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[#050E21] text-sm shadow-[0_8px_28px_rgba(201,168,76,0.45)] hover:shadow-[0_12px_42px_rgba(201,168,76,0.65)] transition-shadow duration-300"
                style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
              >
                Book Now
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight size={16} />
                </motion.span>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <Link
                href="/booking?package=Premium"
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white/70 glass-card hover:text-white transition-colors"
              >
                Start with Premium
              </Link>
            </motion.div>
          </div>

          <p className="mt-8 text-white/25 text-xs">
            No credit card required · Flexible scheduling · We come to you
          </p>
        </motion.div>
      </div>
    </section>
  );
}
