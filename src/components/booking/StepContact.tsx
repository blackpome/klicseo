"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, CheckCircle, RefreshCw, Sparkles, Droplets, Wrench, Check } from "lucide-react";
import type { BookingData, ServiceCategory } from "./BookingWizard";
import { OPTIONS_BY_CATEGORY, SERVICE_OPTIONS, fromPrice, inr, isServiceOptionId } from "@/lib/pricing";

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
}[] = [
  { id: "CarWash",        label: "Car Wash",          blurb: "Subscription doorstep wash",         icon: Droplets, defaultPkg: "Daily"   },
  { id: "OneTimeCarWash", label: "One-Time Car Wash", blurb: "Single visit, no commitment",        icon: Wrench,   defaultPkg: "OneTime" },
  { id: "CarDetailing",   label: "Car Detailing",     blurb: "Premium paint & interior care",      icon: Sparkles, defaultPkg: null      },
];

// CarShowcase visual hint derived from the chosen sub-option.
const optionToPkg: Record<string, BookingData["pkg"]> = {
  Monthly:           "Daily",
  WeeklyThrice:      "TriWeekly",
  OneTimeManual:     "OneTime",
  OneTimeMachine:    "OneTime",
  PowerShine:        null,
  CeramicSealant:    null,
  InteriorDetailing: null,
};

export default function StepContact({ data, update, onNext }: Props) {
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneValid = data.phone.trim().length >= 8;
  const nameValid  = data.name.trim().length >= 2;
  const otpComplete = otp.join("").length === 6;
  const serviceValid = !!data.service && data.serviceOption.length > 0;
  const canProceed  = serviceValid && nameValid && phoneValid && data.otpVerified;

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

      {/* Service required */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Service Required *
        </p>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((c) => {
            const selected = data.service === c.id;
            const Icon = c.icon;
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectServiceCategory(c)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 min-h-[48px] ${
                  selected
                    ? "border-[#C9A84C] shadow-[0_0_14px_rgba(201,168,76,0.2)]"
                    : "glass-card hover:border-[#1A5FD4]/40"
                }`}
                style={selected ? { background: "rgba(201,168,76,0.08)" } : {}}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: selected
                      ? "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)"
                      : "rgba(26,95,212,0.15)",
                  }}
                >
                  <Icon size={14} className={selected ? "text-[#050E21]" : "text-[#C9A84C]"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{c.label}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">{c.blurb}</p>
                </div>
                {selected && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {activeCategory && (
            <motion.div
              key={activeCategory.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mt-3 mb-2">
                Choose Option
              </p>
              <div className="flex flex-col gap-2">
                {activeOptionIds.map((id) => {
                  const opt = SERVICE_OPTIONS[id];
                  const sel = data.serviceOption === id;
                  return (
                    <button
                      key={id}
                      onClick={() => selectServiceOption(id)}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                        sel
                          ? "text-[#050E21] border-[#C9A84C]"
                          : "glass-card text-white/70 hover:text-white hover:border-[#C9A84C]/40 active:scale-[0.99]"
                      }`}
                      style={sel ? { background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" } : {}}
                    >
                      <span className="text-left leading-tight">
                        <span className="block font-semibold">{opt.label}</span>
                        <span className={`block text-[11px] mt-0.5 ${sel ? "text-[#050E21]/70" : "text-white/40"}`}>
                          {opt.blurb}
                        </span>
                      </span>
                      <span className={`text-xs font-semibold whitespace-nowrap ${sel ? "text-[#050E21]" : "text-[#C9A84C]"}`}>
                        from {inr(fromPrice(id))}
                        {opt.recurring === "monthly" ? "/mo" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {addOn && (
                <button
                  type="button"
                  onClick={() => update({ interiorAddOn: !data.interiorAddOn })}
                  className={`mt-2 w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    data.interiorAddOn
                      ? "border-[#C9A84C] bg-[rgba(201,168,76,0.08)]"
                      : "glass-card hover:border-[#1A5FD4]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                        data.interiorAddOn ? "border-[#C9A84C]" : "border-white/25"
                      }`}
                      style={data.interiorAddOn ? { background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" } : {}}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors"
        />
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
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors disabled:opacity-60"
          />
          {!data.otpVerified && (
            <button
              onClick={sendOtp}
              disabled={!phoneValid || sending || countdown > 0}
              className="flex-shrink-0 px-3 py-3.5 rounded-xl text-xs font-bold text-[#050E21] disabled:opacity-40 transition-all active:scale-95 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)", minWidth: 80 }}
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
                  className="flex-1 aspect-square text-center text-base sm:text-lg font-bold text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors"
                  style={{ maxWidth: 52, minWidth: 36 }}
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
            style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            <CheckCircle size={15} className="text-[#C9A84C] flex-shrink-0" />
            <span className="text-sm font-semibold text-[#C9A84C]">Phone verified</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full mt-5 py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        Continue →
      </button>
    </div>
  );
}
