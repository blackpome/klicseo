"use client";

import { Check } from "lucide-react";
import { useRef, useState, MouseEvent } from "react";
import { motion, useSpring } from "framer-motion";
import AnimatedHeading from "./AnimatedHeading";
import { useServiceDiscounts, useLineBadge } from "./DiscountContext";
import { useSiteSettings } from "./SiteSettingsContext";
import { discountedPrice, type PriceLine } from "@/lib/pricing";
import { isCardId } from "@/lib/card-prices-shared";

// "From" prices reflect the Hatchback tier; the booking flow charges the
// vehicle-tier-specific price from the same source (src/lib/pricing.ts).
const plans = [
  {
    id: "CarDetailing",
    name: "Car Detailing",
    line: "car_detailing" as PriceLine,
    fromPrice: 4999,
    billing: "package",
    tagline: "Premium paint & interior care",
    badge: null as string | null,
    features: [
      "Ceramic Sealant Coating",
      "Optional Interior Detailing add-on",
      "Deep gloss & hydrophobic finish",
      "Hand-applied by certified detailers",
      "By appointment at your location",
    ],
    highlight: false,
    borderColor: "#10b981", // Premium Green
    cta: "Book Detailing",
    href: "/booking?service=CarDetailing",
  },
  {
    id: "CarWash",
    name: "Car Wash - Monthly Subscription",
    line: "monthly" as PriceLine,
    fromPrice: 19,
    billing: "day",
    tagline: "Doorstep wash subscriptions",
    badge: null as string | null,
    features: [
      "Daily Monthly Plan (Mon–Sat)",
      "Weekly Thrice Plan ",
      "Free monthly interior cleaning on Daily plan",
      "Trained & insured professionals",
      "Doorstep service — we come to you",
      "Cancel anytime, no contract",
    ],
    highlight: true,
    borderColor: "#3B82F6", // Premium Blue
    cta: "Book Car Wash",
    href: "/booking?service=CarWash",
  },
  {
    id: "OneTimeCarWash",
    name: "One-Time Wash",
    line: "one_time_manual" as PriceLine,
    fromPrice: 249,
    tagline: "Single visit, no commitment",
    badge: null as string | null,
    billing: "wash",
    features: [
      "Manual hand wash",
      "Machine pressure wash",
      "Optional interior cleaning add-on",
      "Window, glass, tire & wheel clean",
      "No subscription needed",
      "Great if you want to try us first",
    ],
    highlight: false,
    borderColor: "#EC4899", // Vivid Pink — matches OneTimeCarWash in booking
    cta: "Book One-Time Wash",
    href: "/booking?service=OneTimeCarWash",
  },
];

/** 3D tilt + glare + rotating border animation */
function TiltPlanCard({
  children,
  highlight,
  borderColor,
  ribbon,
}: {
  children: React.ReactNode;
  ribbon?: React.ReactNode;
  highlight: boolean;
  borderColor: string;
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
    <motion.div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: rx,
        rotateY: ry,
        perspective: "1100px",
        transformStyle: "preserve-3d",
      }}
      className="relative h-full"
    >
      {/* ── Animated rotating border wrapper ── */}
      <div
        className="relative rounded-2xl h-full overflow-hidden"
        style={{ padding: "3px" }}
      >
        {/* The conic-gradient spinner — must be INSIDE overflow:hidden */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          {/* Expand the spinner so it covers all corners */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "200%",
              height: "200%",
              transform: "translate(-50%, -50%)",
              background: `conic-gradient(from 0deg, transparent 0deg, ${borderColor} 60deg, transparent 120deg, transparent 180deg, ${borderColor} 240deg, transparent 300deg)`,
            }}
          />
        </motion.div>

        {/* ── Inner card (masks spinner to the border only) ── */}
        <div
          className="relative flex flex-col h-full rounded-[15px] overflow-hidden"
          style={{ backgroundColor: "#050E21" }}
        >
          {/* Blue gradient bg for popular/highlight plan */}
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

          {/* Corner offer ribbon (clipped to the card's rounded corner) */}
          {ribbon}

          {/* Content */}
          <div className="relative flex flex-col h-full z-10 p-7">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}

type Plan = (typeof plans)[number];

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const discounts = useServiceDiscounts();
  const { cardPrices } = useSiteSettings();
  const showBadge = useLineBadge(plan.line);
  const pct = discounts[plan.line] ?? 0;
  // Use the admin's custom card price when its toggle is on; else the default.
  const cp = isCardId(plan.id) ? cardPrices[plan.id] : undefined;
  const basePrice = cp?.enabled ? cp.price : plan.fromPrice;
  const discounted = discountedPrice(basePrice, pct);

  // Diagonal corner ribbon — clips itself to the card's top-right corner.
  const ribbon = showBadge ? (
    <div aria-hidden className="pointer-events-none absolute top-0 right-0 z-20 h-[92px] w-[92px] overflow-hidden rounded-tr-[15px]">
      <div
        className="absolute top-[18px] right-[-38px] w-[150px] rotate-45 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
        style={{ background: "linear-gradient(135deg,#DC2626 0%,#F97316 100%)" }}
      >
        {pct}% OFF
      </div>
    </div>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="relative pt-3"
    >
      {/* "Most Popular" badge */}
      {plan.highlight && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <span
            className="px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase text-[#050E21] whitespace-nowrap shadow-[0_4px_14px_rgba(201,168,76,0.4)]"
            style={{ background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }}
          >
            Most Popular
          </span>
        </div>
      )}

      <TiltPlanCard highlight={plan.highlight} borderColor={plan.borderColor} ribbon={ribbon}>
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
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-white/50 text-sm font-medium mr-1">Starts @</span>
            {pct > 0 && (
              <span className="text-white/40 text-lg font-medium line-through mr-1" style={{ fontFamily: "var(--font-playfair)" }}>
                ₹{basePrice.toLocaleString("en-IN")}
              </span>
            )}
            <span
              className="text-4xl font-bold text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              ₹{(pct > 0 ? discounted : basePrice).toLocaleString("en-IN")}
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
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ backgroundColor: `${plan.borderColor}30` }}
              >
                <Check size={11} style={{ color: plan.borderColor }} strokeWidth={3} />
              </div>
              <span className={plan.highlight ? "text-white/85" : "text-white/60"}>
                {feature}
              </span>
            </motion.li>
          ))}
        </ul>

        <a
          href={plan.href}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all duration-300 hover:scale-[1.02] text-[#050E21] shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.55)]"
          style={{
            background: "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
          }}
        >
          {plan.cta}
        </a>
      </TiltPlanCard>
    </motion.div>
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
          <AnimatedHeading
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
            lines={[{ text: "Choose Your Plan" }]}
          />
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Pick a service — final price varies by vehicle type and is confirmed
            at checkout. No hidden fees, no contracts.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-5">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-8">
          All prices inclusive of service charges. Contact us for bulk or corporate bookings.
        </p>
      </div>
    </section>
  );
}
