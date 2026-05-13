"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, CheckCircle, RefreshCw, Sparkles, Droplets, Wrench, Check } from "lucide-react";
import type { BookingData, ServiceCategory } from "./BookingWizard";
import { OPTIONS_BY_CATEGORY, SERVICE_OPTIONS, inr, isServiceOptionId, CATEGORY_COLORS } from "@/lib/pricing";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

const SERVICE_AREA_COLORS: Record<ServiceCategory, string> = {
  CarDetailing: "#0F4C81",
  OneTimeCarWash: "#123E73",
  CarWash: "#1A5FD4",
};

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
      label: "Car Wash",
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
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneValid = data.phone.trim().length >= 8;
  const nameValid = data.name.trim().length >= 2;
  const otpComplete = otp.join("").length === 6;
  const serviceValid = !!data.service && data.serviceOption.length > 0;
  const canProceed = serviceValid && nameValid && phoneValid && data.otpVerified;

  const errCategory = attempted && !data.service;
  const errOption = attempted && !!data.service && !data.serviceOption;
  const errName = attempted && !nameValid;
  const errPhone = attempted && !phoneValid;
  const errOtp = attempted && phoneValid && !data.otpVerified;

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

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function sendOtp() {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setOtpSent(true);
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      update({ otpVerified: false });
    }, 1500);
  }

  function handleOtpChange(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.join("").length === 6) {
      setTimeout(() => update({ otpVerified: true }), 300);
    }
  }

  function handleOtpKey(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
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

      {/* Phone + Send OTP */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <Phone size={10} className="inline mr-1" /> Phone Number *
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            value={data.phone}
            onChange={(e) => {
              update({ phone: e.target.value, otpVerified: false });
              setOtpSent(false);
              setOtp(["", "", "", "", "", ""]);
            }}
            disabled={data.otpVerified}
            className={`flex-1 min-w-0 bg-white/5 border rounded-xl px-3 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none transition-colors disabled:opacity-60 ${errPhone ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
              }`}
            style={!errPhone ? { "--focus-color": activeCategory?.borderColor || "#C9A84C" } as any : {}}
            onFocus={(e) => e.target.style.borderColor = (e.target as any).style.getPropertyValue("--focus-color")}
            onBlur={(e) => e.target.style.borderColor = ""}
          />
          {!data.otpVerified && (
            <button
              onClick={sendOtp}
              disabled={!phoneValid || sending || countdown > 0}
              className={`flex-shrink-0 px-3 py-3.5 rounded-xl text-xs font-bold text-[#050E21] disabled:opacity-40 transition-all active:scale-95 whitespace-nowrap ${errOtp && !otpSent ? "ring-2 ring-red-400/60" : ""
                }`}
              style={{ background: PREMIUM_GRADIENT, minWidth: 80 }}
            >
              {sending ? (
                <RefreshCw size={13} className="animate-spin mx-auto" />
              ) : countdown > 0 ? (
                `${countdown}s`
              ) : otpSent ? (
                "Resend"
              ) : (
                "Send OTP"
              )}
            </button>
          )}
        </div>
        {errPhone && (
          <p className="text-[11px] text-red-300 mt-1">Enter a valid phone number.</p>
        )}
        {errOtp && (
          <p className="text-[11px] text-red-300 mt-1">
            {otpSent ? "Enter the 6-digit code we sent to verify your phone." : "Verify your phone with OTP to continue."}
          </p>
        )}
      </div>

      {/* OTP boxes — responsive sizing to fit all 6 on 320px */}
      <AnimatePresence>
        {otpSent && !data.otpVerified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3">
              Enter 6-Digit OTP
            </label>
            <div className="flex gap-1.5 sm:gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  onKeyDown={(e) => handleOtpKey(e, i)}
                  className={`flex-1 aspect-square text-center text-base sm:text-lg font-bold text-white bg-white/5 border rounded-xl focus:outline-none transition-colors ${errOtp ? "border-red-400/70" : "border-white/15"
                    }`}
                  style={!errOtp ? { 
                    maxWidth: 52, 
                    minWidth: 36,
                    "--focus-color": PREMIUM_GOLD 
                  } as any : { maxWidth: 52, minWidth: 36 }}
                  onFocus={(e) => e.target.style.borderColor = (e.target as any).style.getPropertyValue("--focus-color")}
                  onBlur={(e) => e.target.style.borderColor = ""}
                />
              ))}
            </div>
            {otpComplete && !data.otpVerified && (
              <p className="text-white/40 text-xs mt-2">Verifying…</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verified badge */}
      <AnimatePresence>
        {data.otpVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl"
            style={{ 
              background: "rgba(201,168,76,0.10)", 
              border: `1px solid ${PREMIUM_GOLD}66` 
            }}
          >
            <CheckCircle size={15} style={{ color: PREMIUM_GOLD }} className="flex-shrink-0" />
            <span className="text-sm font-semibold" style={{ color: PREMIUM_GOLD }}>Phone verified</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                  padding: selected ? "3px" : "2.2px",
                  boxShadow: selected
                    ? `0 0 22px ${PREMIUM_GOLD}55`
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
                        ? `conic-gradient(from 0deg, transparent 0deg, ${PREMIUM_GOLD_DARK} 35deg, ${PREMIUM_GOLD} 60deg, ${PREMIUM_GOLD_LIGHT} 85deg, transparent 120deg, transparent 180deg, ${PREMIUM_GOLD_DARK} 215deg, ${PREMIUM_GOLD} 240deg, ${PREMIUM_GOLD_LIGHT} 265deg, transparent 300deg)`
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
                      backgroundColor: SERVICE_AREA_COLORS[c.id],
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: selected
                          ? PREMIUM_GRADIENT
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
                      style={selected ? { background: PREMIUM_GRADIENT } : {}}
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
                          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${errOption ? "text-red-300" : "text-[#C9A84C]/80"
                            }`}>
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
                                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${sel
                                      ? "text-[#050E21]"
                                      : "border-white/10 bg-white/[0.04] text-white/75 hover:text-white hover:border-[#C9A84C]/40 active:scale-[0.99]"
                                    }`}
                                  style={sel ? { background: PREMIUM_GRADIENT } : {}}
                                >
                                  <span className="flex items-center gap-2 text-left leading-tight">
                                    <span
                                      className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${sel ? "border-[#050E21] bg-white/30" : "border-white/30"
                                        }`}
                                    >
                                      {sel && <span className="w-1.5 h-1.5 rounded-full bg-[#050E21]" />}
                                    </span>
                                    <span>
                                      <span className="block font-semibold">{opt.label}</span>
                                      <span className={`block text-[11px] mt-0.5 ${sel ? "text-[#050E21]/70" : "text-white/40"}`}>
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
                              className={`mt-2 w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${data.interiorAddOn
                                  ? "border-[#C9A84C] bg-[rgba(201,168,76,0.08)]"
                                  : "border-white/10 bg-white/[0.04] hover:border-[#1A5FD4]/40"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${data.interiorAddOn ? "border-[#C9A84C]" : "border-white/25"
                                    }`}
                                  style={data.interiorAddOn ? { background: PREMIUM_GRADIENT } : {}}
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
                              <span className="text-xs font-semibold text-[#C9A84C] whitespace-nowrap">
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
