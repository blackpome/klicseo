"use client";

import { Check } from "lucide-react";
import { useState } from "react";

type VehicleTier = "hatchback" | "sedan" | "suv";

const vehicleOptions: { label: string; tier: VehicleTier; example: string }[] = [
  { label: "Hatchback",    tier: "hatchback", example: "Swift, i10, Tiago, Celerio, i20" },
  { label: "Sedan",        tier: "sedan",     example: "Honda City, Verna, Ciaz, Slavia" },
  { label: "Compact SUV",  tier: "sedan",     example: "Nexon, Venue, Brezza, Sonet" },
  { label: "SUV",          tier: "suv",       example: "Creta, Seltos, Duster, Grand Vitara" },
  { label: "XUV / Large",  tier: "suv",       example: "XUV 700, Harrier, Safari, Fortuner" },
];

const plans = [
  {
    id: "Daily",
    name: "Package 1 — Daily",
    price: { hatchback: 1000, sedan: 1099, suv: 1199 },
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
    price: { hatchback: 649, sedan: 699, suv: 749 },
    billing: "per month",
    tagline: "3× per week, outer wash only",
    badge: "Offer closes soon 🛑" as string | null,
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
    name: "One-Time / Demo",
    price: { hatchback: 299, sedan: 349, suv: 399 },
    billing: "one time",
    tagline: "Single manual wash, no commitment",
    badge: null as string | null,
    features: [
      "Full exterior hand wash",
      "Window & glass cleaning",
      "Tire & wheel clean",
      "Air freshener",
      "No subscription needed",
      "Great way to try us first",
    ],
    highlight: false,
    cta: "Book a Demo Wash",
  },
];

export default function Pricing() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const vehicleTier = vehicleOptions[selectedIdx].tier;

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
        <div className="text-center mb-12">
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Transparent Pricing
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Choose Your Plan
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base mb-8">
            Monthly doorstep car wash — no hidden fees, no contracts. We come to you.
          </p>
          <div className="divider-gold w-24 mx-auto mb-10" />

          {/* Vehicle type toggle */}
          <div className="inline-flex flex-wrap justify-center items-center glass-card rounded-xl p-1 gap-1">
            {vehicleOptions.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setSelectedIdx(i)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  selectedIdx === i
                    ? "text-[#050E21] shadow-[0_2px_12px_rgba(201,168,76,0.3)]"
                    : "text-white/60 hover:text-white"
                }`}
                style={
                  selectedIdx === i
                    ? { background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }
                    : {}
                }
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-2">
            e.g. {vehicleOptions[selectedIdx].example}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                plan.highlight
                  ? "shadow-[0_8px_48px_rgba(26,95,212,0.4)] border border-[#1A5FD4]/60"
                  : "glass-card hover:border-[#1A5FD4]/25"
              }`}
              style={
                plan.highlight
                  ? { background: "linear-gradient(145deg, #1A5FD4 0%, #0D3D8E 100%)" }
                  : {}
              }
            >
              {/* Offer badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide text-white whitespace-nowrap"
                    style={{ background: "rgba(239,68,68,0.9)" }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Popular badge for highlight */}
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase text-[#050E21] whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4 mt-1">
                <h3
                  className="text-xl font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {plan.name}
                </h3>
                <p className="text-white/50 text-sm">{plan.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                    ₹{plan.price[vehicleTier].toLocaleString("en-IN")}
                  </span>
                  <span className="text-white/50 text-sm mb-1.5">/ {plan.billing}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
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
                  </li>
                ))}
              </ul>

              <a
                href={`/booking?package=${plan.id}`}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all duration-300 hover:scale-[1.02] ${
                  plan.highlight
                    ? "text-[#050E21] shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.6)]"
                    : "text-[#050E21] hover:shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
                }`}
                style={{
                  background: "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-8">
          All prices inclusive of service charges. Contact us for bulk or corporate bookings.
        </p>
      </div>
    </section>
  );
}
