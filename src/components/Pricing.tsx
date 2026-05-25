"use client";

import { Check } from "lucide-react";
import { useRef, MouseEvent } from "react";
import { motion, useSpring, useMotionValue, useMotionTemplate } from "framer-motion";
import AnimatedHeading from "./AnimatedHeading";
import { useServiceDiscounts, useLineBadge } from "./DiscountContext";
import { useSiteSettings } from "./SiteSettingsContext";
import { type PriceLine } from "@/lib/pricing";
import { isCardId } from "@/lib/card-prices-shared";

interface Plan {
  id: string;
  name: string;
  line: PriceLine;
  fromPrice: number;
  billing: string;
  tagline: string;
  features: string[];
  highlight: boolean;
  borderColor: string;
  cta: string;
  href: string;
}

// Things the catalog doesn't store yet (features, default fromPrice, colour,
// CTA, billing unit, "Most Popular" flag). Keyed by legacy_key so when admin
// renames a category the pricing card still finds its preset.
const PLAN_PRESENTATION: Record<string, Omit<Plan, "id" | "name" | "tagline">> = {
  CarDetailing: {
    line: "car_detailing",
    fromPrice: 4999,
    billing: "package",
    features: [
      "Ceramic Sealant Coating",
      "Optional Interior Detailing add-on",
      "Deep gloss & hydrophobic finish",
      "Hand-applied by certified detailers",
      "By appointment at your location",
    ],
    highlight: false,
    borderColor: "#10b981",
    cta: "Book Detailing",
    href: "/booking?service=CarDetailing",
  },
  CarWash: {
    line: "monthly",
    fromPrice: 19,
    billing: "day",
    features: [
      "Daily Monthly Plan (Mon–Sat)",
      "Weekly Thrice Plan ",
      "Free monthly interior cleaning on Daily plan",
      "Trained & insured professionals",
      "Doorstep service — we come to you",
      "Cancel anytime, no contract",
    ],
    highlight: true,
    borderColor: "#3B82F6",
    cta: "Book Car Wash",
    href: "/booking?service=CarWash",
  },
  OneTimeCarWash: {
    line: "one_time_manual",
    fromPrice: 249,
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
    borderColor: "#EC4899",
    cta: "Book One-Time Wash",
    href: "/booking?service=OneTimeCarWash",
  },
};

// Default labels/taglines for when the catalog hasn't loaded yet (initial
// render before SiteSettings hydrate). Order matches the legacy hardcoded list.
const LEGACY_PLAN_NAMES: Record<string, { name: string; tagline: string }> = {
  CarDetailing:   { name: "Car Detailing",                  tagline: "Premium paint & interior care" },
  CarWash:        { name: "Car Wash - Monthly Subscription", tagline: "Doorstep wash subscriptions" },
  OneTimeCarWash: { name: "One-Time Wash",                   tagline: "Single visit, no commitment" },
};

const LEGACY_PLAN_ORDER: string[] = ["CarDetailing", "CarWash", "OneTimeCarWash"];

function buildLegacyPlans(): Plan[] {
  return LEGACY_PLAN_ORDER.flatMap((key) => {
    const p = PLAN_PRESENTATION[key];
    const n = LEGACY_PLAN_NAMES[key];
    if (!p || !n) return [];
    return [{ id: key, name: n.name, tagline: n.tagline, ...p }];
  });
}

/**
 * Build the live card list. Card ORDER is fixed (LEGACY_PLAN_ORDER) and is
 * intentionally decoupled from the Services editor's sort_order — admins can
 * reorder categories in the booking wizard without affecting the landing
 * page's pricing-card layout. The catalog still drives label / tagline /
 * enabled flag so renames and toggles flow through.
 */
function buildPlans(catalog: ReturnType<typeof useSiteSettings>["catalog"]): Plan[] {
  if (!catalog || catalog.categories.length === 0) return buildLegacyPlans();
  const byLegacy = new Map(catalog.categories.map((c) => [c.legacy_key, c] as const));
  return LEGACY_PLAN_ORDER.flatMap((key) => {
    const preset = PLAN_PRESENTATION[key];
    if (!preset) return [];
    const cat = byLegacy.get(key);
    if (cat && !cat.enabled) return [];
    const fallback = LEGACY_PLAN_NAMES[key];
    return [{
      id: key,
      name: cat?.label || fallback?.name || key,
      tagline: cat?.blurb || fallback?.tagline || "",
      ...preset,
    }];
  });
}

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
  // Glare via motion values (no React re-render on mousemove).
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const go = useSpring(0, { stiffness: 150, damping: 22 });
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,${go}) 0%, transparent 60%)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    rx.set((0.5 - y) * 7);
    ry.set((x - 0.5) * 7);
    gx.set(x * 100);
    gy.set(y * 100);
    go.set(0.14);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
    go.set(0);
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

          {/* Mouse-following glare (motion value — no re-render on move) */}
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: glareBg }}
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

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const discounts = useServiceDiscounts();
  const { cardPrices } = useSiteSettings();
  const showBadge = useLineBadge(plan.line);
  const pct = discounts[plan.line] ?? 0;
  // Use the admin's custom card price when its toggle is on; else the default.
  const cp = isCardId(plan.id) ? cardPrices[plan.id] : undefined;
  // `basePrice` is the *net* price — what the customer pays. The strike-through
  // MRP is whatever admin typed in /admin/settings (cardPrices[id].mrp). When
  // it's blank or not greater than basePrice we don't render a strike at all.
  //
  // The "Use custom" toggle only controls whether the *net* uses admin's value
  // or the hard-coded default — the MRP is honoured independently, so admins
  // can leave the default net price and still configure a strike-through.
  const basePrice = cp?.enabled ? cp.price : plan.fromPrice;
  const mrpOverride = cp?.mrp ?? null;
  const hasMrp = mrpOverride != null && mrpOverride > basePrice;
  const strikePrice = hasMrp ? (mrpOverride as number) : basePrice;

  // Diagonal corner ribbon — clips itself to the card's top-right corner.
  // Only show it when there's an MRP to back the % up; otherwise the "X% OFF"
  // would hang in space with no struck-through reference price.
  const ribbon = showBadge && hasMrp && pct > 0 ? (
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
            {showBadge && hasMrp && (
              <span
                className="text-4xl font-bold text-[#DC2626] line-through decoration-[#DC2626] decoration-2 bg-[#DC2626]/15 px-2 py-0.5 rounded-md mr-1"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                ₹{strikePrice.toLocaleString("en-IN")}
              </span>
            )}
            <span
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              ₹{basePrice.toLocaleString("en-IN")}
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
  const { catalog } = useSiteSettings();
  const plans = buildPlans(catalog);
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
