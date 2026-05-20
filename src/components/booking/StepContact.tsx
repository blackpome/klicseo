"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, Sparkles, Droplets, Wrench, Check } from "lucide-react";
import type { BookingData, ServiceCategory } from "./BookingWizard";
import { OPTIONS_BY_CATEGORY, SERVICE_OPTIONS, inr, isServiceOptionId, CATEGORY_COLORS } from "@/lib/pricing";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

// Service categories shown as cards. Sub-options are pulled from OPTIONS_BY_CATEGORY
// in src/lib/pricing.ts so labels and prices stay in sync everywhere.
const categories: {
  id: ServiceCategory;
  label: string;
  blurb: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  // Visual `pkg` used by CarShowcase when the category is chosen but no
  // sub-option yet. Nullable for detailing.
  defaultPkg: BookingData["pkg"];
  borderColor: string;
}[] = [
    {
      id: "CarDetailing",
      label: "Car Detailing",
      blurb: "Premium paint & interior care",
      icon: Sparkles,
      defaultPkg: null,
      borderColor: CATEGORY_COLORS.CarDetailing,
    },
    {
      id: "OneTimeCarWash",
      label: "One-Time Car Wash",
      blurb: "Single visit, no commitment",
      icon: Wrench,
      defaultPkg: "OneTime",
      borderColor: CATEGORY_COLORS.OneTimeCarWash,
    },
    {
      id: "CarWash",
      label: "Car Wash - Monthly Subscription",
      blurb: "Subscription doorstep wash",
      icon: Droplets,
      defaultPkg: "Daily",
      borderColor: CATEGORY_COLORS.CarWash,
    },
  ];

// CarShowcase visual hint derived from the chosen sub-option.
const optionToPkg: Record<string, BookingData["pkg"]> = {
  Monthly: "Daily",
  WeeklyThrice: "TriWeekly",
  OneTimeManual: "OneTime",
  OneTimeMachine: "OneTime",
  CeramicSealant: null,
  InteriorDetailing: null,
};

const PREMIUM_GOLD = "#C9A84C";
const PREMIUM_GOLD_DARK = "#9C7A2A";
const PREMIUM_GOLD_LIGHT = "#E8CC7A";
const PREMIUM_GRADIENT = `linear-gradient(135deg, ${PREMIUM_GOLD_DARK}, ${PREMIUM_GOLD}, ${PREMIUM_GOLD_LIGHT})`;

export default function StepContact({ data, update, onNext }: Props) {
  const [attempted, setAttempted] = useState(false);

  const phoneValid = data.phone.trim().length >= 8;
  const nameValid = data.name.trim().length >= 2;
  const serviceValid = !!data.service && data.serviceOption.length > 0;
  const canProceed = serviceValid && nameValid && phoneValid;

  const errCategory = attempted && !data.service;
  const errOption = attempted && !!data.service && !data.serviceOption;
  const errName = attempted && !nameValid;
  const errPhone = attempted && !phoneValid;

  function handleContinue() {
    if (canProceed) {
      setAttempted(false);
      onNext();
    } else {
      setAttempted(true);
    }
  }

  const activeCategory = categories.find((c) => c.id === data.service);
  const activeOptionIds = activeCategory ? OPTIONS_BY_CATEGORY[activeCategory.id] : [];
  const selectedOptionDef = isServiceOptionId(data.serviceOption) ? SERVICE_OPTIONS[data.serviceOption] : null;
  const addOn = selectedOptionDef?.addOn;

  function selectServiceCategory(c: (typeof categories)[number]) {
    if (c.id === data.service) return;
    update({
      service: c.id,
      serviceOption: "",
      interiorAddOn: false,
      pkg: c.defaultPkg,
    });
  }

  function selectServiceOption(optionId: string) {
    update({
      serviceOption: optionId,
      pkg: optionToPkg[optionId] ?? null,
      interiorAddOn: false,
    });
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Contact Details
      </h2>
      <p className="text-white/45 text-sm mb-5">We&apos;ll use this to confirm your booking.</p>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <User size={10} className="inline mr-1" /> Full Name *
        </label>
        <input
          type="text"
          placeholder="Your full name"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors ${errName ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
            }`}
          style={!errName ? { "--focus-color": activeCategory?.borderColor || "#C9A84C" } as any : {}}
          onFocus={(e) => e.target.style.borderColor = (e.target as any).style.getPropertyValue("--focus-color")}
          onBlur={(e) => e.target.style.borderColor = ""}
        />
        {errName && (
          <p className="text-[11px] text-red-300 mt-1">Enter your full name (at least 2 characters).</p>
        )}
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <Phone size={10} className="inline mr-1" /> Phone Number *
        </label>
        <input
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={data.phone}
          onChange={(e) => update({ phone: e.target.value })}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors ${errPhone ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
            }`}
          style={!errPhone ? { "--focus-color": activeCategory?.borderColor || "#C9A84C" } as any : {}}
          onFocus={(e) => e.target.style.borderColor = (e.target as any).style.getPropertyValue("--focus-color")}
          onBlur={(e) => e.target.style.borderColor = ""}
        />
        {errPhone && (
          <p className="text-[11px] text-red-300 mt-1">Enter a valid phone number.</p>
        )}
      </div>

      {/* Service required */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Service Required *
        </p>
        <div className={`flex flex-col gap-3 ${errCategory ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
          {categories.map((c) => {
            const selected = data.service === c.id;
            const Icon = c.icon;

            return (
              <div
                key={c.id}
                className="transition-all duration-300 relative rounded-[14px] overflow-hidden"
                style={{
                  padding: selected ? "4.5px" : "3px",
                  boxShadow: selected
                    ? `0 0 24px ${c.borderColor}66`
                    : `0 0 8px ${c.borderColor}15`,
                }}
              >
                {/* Animated Rotating Border - Always Runs */}
                <motion.div
                  className="absolute pointer-events-none"
                  style={{ inset: 0, width: "100%", height: "100%", zIndex: 0 }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "200%",
                      height: "200%",
                      transform: "translate(-50%, -50%)",
                      background: selected
                        ? `conic-gradient(from 0deg, transparent 0deg, ${c.borderColor}99 35deg, ${c.borderColor} 60deg, ${c.borderColor}CC 85deg, transparent 120deg, transparent 180deg, ${c.borderColor}99 215deg, ${c.borderColor} 240deg, ${c.borderColor}CC 265deg, transparent 300deg)`
                        : `conic-gradient(from 0deg, transparent 0deg, ${c.borderColor}60 60deg, transparent 120deg, transparent 180deg, ${c.borderColor}60 240deg, transparent 300deg)`,
                    }}
                  />
                </motion.div>

                <div
                  className="relative z-10 flex flex-col h-full overflow-hidden bg-[#050E21]"
                  style={{ borderRadius: selected ? "11px" : "11.8px" }}
                >
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectServiceCategory(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 min-h-[48px] hover:brightness-110"
                    style={{
                      background: selected
                        ? `linear-gradient(135deg, ${c.borderColor}F2 0%, ${c.borderColor}E6 100%)`
                        : `linear-gradient(135deg, ${c.borderColor}E6 0%, ${c.borderColor}D9 100%)`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: selected
                          ? `linear-gradient(135deg, ${c.borderColor}DD, ${c.borderColor}, ${c.borderColor}AA)`
                          : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <Icon size={14} className={selected ? "text-[#050E21]" : "text-white/40"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${selected ? "text-white" : "text-white/85"}`}>
                        {c.label}
                      </p>
                      <p className="text-[11px] text-white/45 mt-0.5">{c.blurb}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest flex-shrink-0 px-2 py-1 rounded-md ${selected ? "text-[#050E21]" : "text-white/30 border border-white/10"
                        }`}
                      style={selected ? { background: `linear-gradient(135deg, ${c.borderColor}DD, ${c.borderColor}, ${c.borderColor}AA)` } : {}}
                    >
                      {selected ? "Selected" : "Select"}
                    </span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={`px-3 pt-3 pb-3 ${errOption ? "ring-2 ring-inset ring-red-400/70" : ""}`}
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                            style={errOption ? { color: "rgb(252 165 165)" } : { color: `${c.borderColor}CC` }}
                          >
                            Choose Option *
                          </p>
                          {errOption && (
                            <p className="text-[11px] text-red-300 mb-2">Please pick one option below.</p>
                          )}
                          <div className="flex flex-col gap-2">
                            {activeOptionIds.map((id) => {
                              const opt = SERVICE_OPTIONS[id];
                              const sel = data.serviceOption === id;
                              return (
                                <button
                                  key={id}
                                  onClick={() => selectServiceOption(id)}
                                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${sel
                                      ? "text-white"
                                      : "bg-white/[0.04] text-white/75 hover:text-white active:scale-[0.99]"
                                    }`}
                                  style={
                                    sel
                                      ? {
                                          background: `${c.borderColor}1F`,
                                          border: `2px solid ${c.borderColor}`,
                                          boxShadow: `0 0 14px ${c.borderColor}33`,
                                        }
                                      : { border: "1.5px solid rgba(255,255,255,0.10)" }
                                  }
                                  onMouseEnter={(e) => {
                                    if (!sel) e.currentTarget.style.borderColor = `${c.borderColor}66`;
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!sel) e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                                  }}
                                >
                                  <span className="flex items-center gap-2 text-left leading-tight">
                                    <span
                                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2"
                                      style={{ borderColor: sel ? c.borderColor : "rgba(255,255,255,0.30)" }}
                                    >
                                      {sel && (
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ background: c.borderColor }}
                                        />
                                      )}
                                    </span>
                                    <span>
                                      <span className="block font-semibold">{opt.label}</span>
                                      <span className={`block text-[11px] mt-0.5 ${sel ? "text-white/70" : "text-white/40"}`}>
                                        {opt.blurb}
                                      </span>
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {addOn && (
                            <button
                              type="button"
                              onClick={() => update({ interiorAddOn: !data.interiorAddOn })}
                              className="mt-2 w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-all"
                              style={
                                data.interiorAddOn
                                  ? { borderColor: c.borderColor, background: `${c.borderColor}14` }
                                  : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border"
                                  style={
                                    data.interiorAddOn
                                      ? {
                                          borderColor: c.borderColor,
                                          background: `linear-gradient(135deg, ${c.borderColor}DD, ${c.borderColor}, ${c.borderColor}AA)`,
                                        }
                                      : { borderColor: "rgba(255,255,255,0.25)" }
                                  }
                                >
                                  {data.interiorAddOn && <Check size={11} className="text-[#050E21]" strokeWidth={3} />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white leading-tight">{addOn.label}</p>
                                  <p className="text-[11px] text-white/45 mt-0.5">
                                    {selectedOptionDef?.category === "CarDetailing"
                                      ? `Pair full interior detailing with ${selectedOptionDef.shortLabel}`
                                      : "Add interior cleaning to this visit"}
                                  </p>
                                </div>
                              </div>
                              <span
                                className="text-xs font-semibold whitespace-nowrap"
                                style={{ color: c.borderColor }}
                              >
                                +{inr(Math.min(...Object.values(addOn.price)))}
                              </span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
        {errCategory && (
          <p className="text-[11px] text-red-300 mt-2">Please select a service to continue.</p>
        )}
      </div>

      {attempted && !canProceed && (
        <p className="text-[12px] text-red-300 text-center mt-4">
          Please complete the highlighted fields above.
        </p>
      )}

      <button
        onClick={handleContinue}
        className="w-full mt-3 py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 active:scale-[0.98]"
        style={{ background: PREMIUM_GRADIENT }}
      >
        Continue →
      </button>
    </div>
  );
}
