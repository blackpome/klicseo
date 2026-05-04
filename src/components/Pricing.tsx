"use client";

import { Check } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    name: "Essential",
    price: { sedan: 29, suv: 39 },
    tagline: "Perfect for regular maintenance",
    features: [
      "Exterior hand wash",
      "Window cleaning",
      "Tire & wheel clean",
      "Exterior dry & shine",
      "Air freshener",
    ],
    highlight: false,
    cta: "Book Essential",
  },
  {
    name: "Premium",
    price: { sedan: 59, suv: 79 },
    tagline: "Our most popular package",
    features: [
      "Everything in Essential",
      "Interior vacuum",
      "Dashboard & console wipe",
      "Seat & upholstery clean",
      "Leather conditioning",
      "Engine bay rinse",
    ],
    highlight: true,
    cta: "Book Premium",
  },
  {
    name: "Prestige",
    price: { sedan: 119, suv: 149 },
    tagline: "The ultimate luxury experience",
    features: [
      "Everything in Premium",
      "Full paint decontamination",
      "Clay bar treatment",
      "Machine polish",
      "Ceramic sealant coat",
      "Hand wax & buff",
      "Priority scheduling",
    ],
    highlight: false,
    cta: "Book Prestige",
  },
];

export default function Pricing() {
  const [vehicleType, setVehicleType] = useState<"sedan" | "suv">("sedan");

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
            No hidden fees. Luxury care at transparent prices — choose the
            package that matches your needs.
          </p>
          <div className="divider-gold w-24 mx-auto mb-10" />

          {/* Vehicle type toggle */}
          <div className="inline-flex items-center glass-card rounded-full p-1 gap-1">
            <button
              onClick={() => setVehicleType("sedan")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                vehicleType === "sedan"
                  ? "text-[#050E21] shadow-[0_2px_12px_rgba(201,168,76,0.3)]"
                  : "text-white/60 hover:text-white"
              }`}
              style={
                vehicleType === "sedan"
                  ? { background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }
                  : {}
              }
            >
              Sedan / Hatch
            </button>
            <button
              onClick={() => setVehicleType("suv")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                vehicleType === "suv"
                  ? "text-[#050E21] shadow-[0_2px_12px_rgba(201,168,76,0.3)]"
                  : "text-white/60 hover:text-white"
              }`}
              style={
                vehicleType === "suv"
                  ? { background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }
                  : {}
              }
            >
              SUV / 4WD
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
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
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase text-[#050E21] whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }}
                  >
                    Best Value
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className="text-xl font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {plan.name}
                </h3>
                <p className="text-white/50 text-sm">{plan.tagline}</p>
              </div>

              <div className="mb-7">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                    ${plan.price[vehicleType]}
                  </span>
                  <span className="text-white/50 text-sm mb-1.5">/ wash</span>
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
                href="#booking"
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
          All prices include GST. Prices may vary for oversized vehicles.
          Contact us for a custom quote.
        </p>
      </div>
    </section>
  );
}
