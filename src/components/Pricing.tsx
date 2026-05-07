"use client";

import { Check } from "lucide-react";
import { useRef, useState, MouseEvent } from "react";
import { motion, useSpring } from "framer-motion";

const plans = [
  {
    id: "Daily",
    name: "Package 1 — Daily",
    fromPrice: 1000,
    billing: "per month",
    tagline: "Mon – Sat, full month service",
    badge: null as string | null,
    features: [
      "Exterior hand wash every weekday",
      "Monthly once free interior cleaning",
      "Doorstep — we come to you",
      "Trained & insured professionals",
      "Flexible scheduling, 6 days",
      "Guaranteed satisfaction",
    ],
    highlight: true,
    cta: "Book Daily Plan",
  },
  {
    id: "TriWeekly",
    name: "Package 2 — Tri-Weekly",
    fromPrice: 649,
    billing: "per month",
    tagline: "3× per week, outer wash only",
    badge: "Offer closes soon" as string | null,
    features: [
      "Exterior hand wash 3× a week",
      "Full month service",
      "Outer body & glass cleaning",
      "Doorstep — we come to you",
      "Flexible scheduling",
      "No contract required",
    ],
    highlight: false,
    cta: "Book Tri-Weekly",
  },
  {
    id: "OneTime",
    name: "One-Time Wash",
    fromPrice: 299,
    billing: "one time",
    tagline: "Single manual wash, no commitment",
    badge: null as string | null,
    features: [
      "Full exterior hand wash",
      "Window & glass cleaning",
      "Tire & wheel clean",
      "Air freshener",
      "No subscription needed",
      "Single visit, no long-term plan",
    ],
    highlight: false,
    cta: "Book One-Time Wash",
  },
];

/** 3D tilt + glare on hover, with smooth spring restore. */
function TiltPlanCard({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    rx.set((0.5 - y) * 7);
    ry.set((x - 0.5) * 7);
    setGlare({ x: x * 100, y: y * 100, o: 0.14 });
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
    setGlare({ x: 50, y: 50, o: 0 });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: "1100px" }}
      className="h-full"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className={`relative rounded-2xl p-7 flex flex-col h-full transition-shadow duration-300 overflow-hidden ${
          highlight
            ? "border border-[#1A5FD4]/60 shadow-[0_8px_48px_rgba(26,95,212,0.4)]"
            : "glass-card hover:border-[#1A5FD4]/25"
        }`}
      >
        {/* Solid gradient bg for highlight plan */}
        {highlight && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(145deg, #1A5FD4 0%, #0D3D8E 100%)" }}
          />
        )}

        {/* Mouse-following glare */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.o}) 0%, transparent 60%)`,
            transition: "opacity 0.18s ease",
          }}
        />

        {/* Content sits above bg/glare */}
        <div className="relative flex flex-col h-full">{children}</div>
      </motion.div>

      {/* Animated halo around highlight card — outside the tilted layer so it
          stays parallel to the page; inside its own non-clipping wrapper. */}
      {highlight && (
        <motion.div
          aria-hidden
          className="absolute -inset-1 rounded-[1.25rem] pointer-events-none -z-10"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(201,168,76,0.0)",
              "0 0 28px 6px rgba(201,168,76,0.30)",
              "0 0 0 0 rgba(201,168,76,0.0)",
            ],
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28 px-4">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 80% 30%, rgba(26,95,212,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Transparent Pricing
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Choose Your Plan
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Monthly doorstep car wash — no hidden fees, no contracts. Final price
            is calculated by your vehicle type at checkout.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </motion.div>

        {/* Pricing cards — top padding leaves room for the floating badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Floating badges live OUTSIDE the tilted card so they stay
                  flat to the page and don't get clipped. */}
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <span
                    className="px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase text-[#050E21] whitespace-nowrap shadow-[0_4px_14px_rgba(201,168,76,0.4)]"
                    style={{ background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }}
                  >
                    Most Popular
                  </span>
                </div>
              )}
              {plan.badge && !plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide text-white whitespace-nowrap shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                    style={{ background: "rgba(239,68,68,0.92)" }}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <TiltPlanCard highlight={plan.highlight}>
                <div className="mb-4">
                  <h3
                    className="text-xl font-bold text-white mb-1"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-white/50 text-sm">{plan.tagline}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-white/50 text-sm font-medium mr-1">From</span>
                    <span
                      className="text-4xl font-bold text-white"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      ₹{plan.fromPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-white/50 text-sm">/ {plan.billing}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <motion.li
                      key={feature}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.4, delay: 0.4 + idx * 0.06 }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                          plan.highlight ? "bg-white/20" : "bg-[#C9A84C]/20"
                        }`}
                      >
                        <Check
                          size={11}
                          className={plan.highlight ? "text-white" : "text-[#C9A84C]"}
                          strokeWidth={3}
                        />
                      </div>
                      <span className={plan.highlight ? "text-white/85" : "text-white/60"}>
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <a
                  href={`/booking?package=${plan.id}`}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all duration-300 hover:scale-[1.02] text-[#050E21] shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.55)]"
                  style={{
                    background:
                      "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
                  }}
                >
                  {plan.cta}
                </a>
              </TiltPlanCard>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-8">
          All prices inclusive of service charges. Contact us for bulk or corporate bookings.
        </p>
      </div>
    </section>
  );
}
