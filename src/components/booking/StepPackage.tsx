"use client";

import { motion } from "framer-motion";
import { Check, Clock, AlertCircle } from "lucide-react";
import CarShowcase from "./CarShowcase";
import type { BookingData } from "./BookingWizard";

const packages = [
  {
    id: "Daily" as const,
    label: "Package 1 — Daily",
    price: { hatchback: 1000, sedan: 1099, suv: 1199 },
    tagline: "Mon – Sat, full month",
    badge: null as string | null,
    features: [
      "Exterior hand wash every weekday",
      "Monthly once free interior cleaning",
      "Doorstep service at your location",
      "Trained & insured professionals",
    ],
    highlight: true,
  },
  {
    id: "TriWeekly" as const,
    label: "Package 2 — Tri-Weekly",
    price: { hatchback: 649, sedan: 699, suv: 749 },
    tagline: "3× per week, full month",
    badge: "Offer closes soon" as string | null,
    features: [
      "Exterior wash 3 days a week",
      "Full month service",
      "Outer body & glass only",
      "Doorstep service at your location",
    ],
    highlight: false,
  },
  {
    id: "OneTime" as const,
    label: "One-Time Wash",
    price: { hatchback: 299, sedan: 349, suv: 399 },
    tagline: "Single manual wash",
    badge: null as string | null,
    features: [
      "Full exterior hand wash",
      "Window & glass cleaning",
      "No commitment required",
      "Single visit, no subscription",
    ],
    highlight: false,
  },
];

type PriceTier = "hatchback" | "sedan" | "suv";

// Map the vehicle type chosen in StepVehicle → price tier.
const tierByVehicleType: Record<string, PriceTier> = {
  "Hatchback":         "hatchback",
  "Sedan":             "sedan",
  "Compact SUV":       "sedan",
  "SUV":               "suv",
  "XUV & Large SUV":   "suv",
};

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPackage({ data, update, onNext, onBack }: Props) {
  const tier: PriceTier = tierByVehicleType[data.vehicleType] ?? "sedan";

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Choose Your Package
      </h2>
      <p className="text-white/45 text-sm mb-3">Monthly doorstep car wash — we come to you.</p>

      {/* Car showcase — model is driven by the vehicle type chosen in StepVehicle */}
      <CarShowcase pkg={data.pkg} vehicleType={data.vehicleType} />

      {/* Vehicle summary — already chosen in the previous step */}
      {data.vehicleType && (
        <div className="mt-3 mb-4 flex items-center justify-center gap-2 text-[11px] text-white/55">
          <span>Pricing for</span>
          <span className="px-2.5 py-1 rounded-md font-semibold text-[#050E21]"
                style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}>
            {data.vehicleType}
          </span>
          {data.carModel && <span className="text-white/40">· {data.carModel}</span>}
        </div>
      )}

      {/* Package cards */}
      <div className="grid grid-cols-1 gap-3 mb-5 mt-2">
        {packages.map((pkg) => {
          const selected = data.pkg === pkg.id;
          return (
            <motion.button
              key={pkg.id}
              whileTap={{ scale: 0.985 }}
              onClick={() => update({ pkg: pkg.id })}
              className={`relative text-left rounded-xl p-4 border transition-all duration-300 ${
                selected
                  ? "border-[#C9A84C] shadow-[0_0_20px_rgba(201,168,76,0.25)]"
                  : pkg.highlight
                  ? "border-[#1A5FD4]/40 hover:border-[#1A5FD4]/60"
                  : "glass-card hover:border-[#1A5FD4]/40"
              }`}
              style={
                selected
                  ? { background: "linear-gradient(145deg,rgba(201,168,76,0.1),rgba(5,14,33,0.9))" }
                  : pkg.highlight
                  ? { background: "linear-gradient(145deg,rgba(26,95,212,0.08),rgba(5,14,33,0.8))" }
                  : {}
              }
            >
              {pkg.badge && (
                <span
                  className="absolute -top-2.5 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase text-white whitespace-nowrap"
                  style={{ background: "rgba(239,68,68,0.9)" }}
                >
                  <AlertCircle size={8} className="inline" /> {pkg.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-3">
                {/* Left: title + tagline + features */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                      {pkg.label}
                    </span>
                    {selected && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" }}
                      >
                        <Check size={9} className="text-[#050E21]" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={9} className="text-white/40 flex-shrink-0" />
                    <p className="text-white/40 text-[11px]">{pkg.tagline}</p>
                  </div>
                  {/* Single column on mobile, 2 cols on sm+ */}
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/50">
                        <Check size={9} className="text-[#C9A84C] mt-0.5 flex-shrink-0" strokeWidth={3} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: exact price for selected vehicle type */}
                <div className="text-right flex-shrink-0 ml-1">
                  <div className="text-lg sm:text-xl font-bold gold-shimmer" style={{ fontFamily: "var(--font-playfair)" }}>
                    ₹{pkg.price[tier].toLocaleString("en-IN")}
                  </div>
                  <div className="text-white/35 text-[10px]">{pkg.id === "OneTime" ? "one time" : "/mo"}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-semibold text-sm text-white/60 glass-card hover:text-white active:scale-95 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.pkg}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          Review Booking →
        </button>
      </div>
    </div>
  );
}
