"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Choose Your Package",
    description: "Browse our range of premium wash and detailing packages. Select the one that best suits your vehicle and budget.",
    icon: "📦",
  },
  {
    number: "02",
    title: "Book Your Slot",
    description: "Pick a convenient date and time. We offer same-day appointments for most services — your schedule is our priority.",
    icon: "📅",
  },
  {
    number: "03",
    title: "We Come to You",
    description: "Our mobile team arrives at your location with all the professional equipment and premium products required.",
    icon: "🚗",
  },
  {
    number: "04",
    title: "Drive Away Spotless",
    description: "Inspect the results, and drive away in a car that looks and feels brand new. Your satisfaction is guaranteed.",
    icon: "✨",
  },
];

function Step3D({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  return (
    <div ref={ref} style={{ perspective: "1000px" }}>
      <motion.div
        initial={{ opacity: 0, rotateX: 55, y: 60, scale: 0.88 }}
        animate={inView ? { opacity: 1, rotateX: 0, y: 0, scale: 1 } : {}}
        transition={{
          duration: 0.75,
          delay: index * 0.15,
          ease: "easeOut",
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="flex flex-col items-center text-center relative"
      >
        {/* Connector line (desktop) */}
        {index < steps.length - 1 && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: index * 0.15 + 0.5 }}
            className="hidden lg:block absolute top-10 left-[calc(50%+44px)] h-px origin-left"
            style={{
              width: "calc(100% - 20px)",
              background: "linear-gradient(90deg, rgba(201,168,76,0.5) 0%, rgba(201,168,76,0.1) 100%)",
            }}
          />
        )}

        {/* Number orb */}
        <motion.div
          whileHover={{ scale: 1.08, rotateY: 15 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6 z-10"
          style={{
            background: "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
            border: "2px solid rgba(255,255,255,0.15)",
            boxShadow: "0 0 32px rgba(201,168,76,0.45), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-full" style={{
            background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 55%)",
          }} />
          <span className="text-xl font-bold text-[#050E21] relative z-10" style={{ fontFamily: "var(--font-playfair)" }}>
            {step.number}
          </span>
        </motion.div>

        {/* Card body */}
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(26,95,212,0.25)" }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="glass-card rounded-2xl px-5 py-6 w-full max-w-[230px]"
        >
          <div className="text-2xl mb-3">{step.icon}</div>
          <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            {step.title}
          </h3>
          <p className="text-white/45 text-xs leading-relaxed">{step.description}</p>
        </motion.div>

        {/* Step indicator dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: index * 0.15 + 0.3, type: "spring" }}
          className="mt-4 w-2 h-2 rounded-full"
          style={{ background: "linear-gradient(135deg, #C9A84C, #E8CC7A)" }}
        />
      </motion.div>
    </div>
  );
}

export default function HowItWorks() {
  const titleRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(titleRef, { once: true, amount: 0.1 });

  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 px-4">
      <div className="absolute inset-0 bg-[#071F4A]/40" />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 70% 50% at 20% 50%, rgba(26,95,212,0.1) 0%, transparent 60%)",
      }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 24 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">Simple Process</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
            How It Works
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Four simple steps to a spotless vehicle — easy to book, effortless to experience.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {steps.map((step, i) => (
            <Step3D key={step.number} step={step} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-14"
        >
          <a
            href="#booking"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-bold text-sm text-[#050E21] shadow-[0_4px_24px_rgba(201,168,76,0.4)] hover:shadow-[0_8px_40px_rgba(201,168,76,0.65)] hover:scale-105 transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#9C7A2A 0%,#C9A84C 50%,#E8CC7A 100%)" }}
          >
            Start Your Experience
          </a>
        </motion.div>
      </div>
    </section>
  );
}
