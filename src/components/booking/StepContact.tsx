"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, CheckCircle, RefreshCw, Sparkles, Droplets, Wrench } from "lucide-react";
import type { BookingData, ServiceCategory } from "./BookingWizard";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

// Service hierarchy used at the very first step. Picking a category narrows
// the options shown beneath; both must be set before Continue is enabled.
const services: {
  id: ServiceCategory;
  label: string;
  blurb: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  options: string[];
  // Picking this category implies a downstream `pkg` for the existing pricing
  // step. Detailing has no implied pkg (different flow).
  defaultPkg: BookingData["pkg"];
}[] = [
  {
    id: "CarWash",
    label: "Car Wash",
    blurb: "Subscription doorstep wash",
    icon: Droplets,
    options: ["Monthly", "Weekly Thrice", "One-Time"],
    defaultPkg: "Daily",
  },
  {
    id: "CarDetailing",
    label: "Car Detailing",
    blurb: "Premium paint & finish",
    icon: Sparkles,
    options: ["Ceramic Sealant Coating", "Powershine Treatment"],
    defaultPkg: null,
  },
  {
    id: "OneTimeCarWash",
    label: "One-Time Car Wash",
    blurb: "Single visit, no commitment",
    icon: Wrench,
    options: ["Manual", "Machine"],
    defaultPkg: "OneTime",
  },
];

// When the user picks a sub-option that maps cleanly onto an existing package,
// pre-fill `pkg` so StepPackage doesn't ask again.
const optionToPkg: Record<string, BookingData["pkg"]> = {
  "Monthly":       "Daily",
  "Weekly Thrice": "TriWeekly",
  "One-Time":      "OneTime",
  "Manual":        "OneTime",
  "Machine":       "OneTime",
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

  const activeService = services.find((s) => s.id === data.service);

  function selectServiceCategory(s: (typeof services)[number]) {
    if (s.id === data.service) return;
    update({ service: s.id, serviceOption: "", pkg: s.defaultPkg });
  }

  function selectServiceOption(option: string) {
    const mapped = optionToPkg[option];
    update({
      serviceOption: option,
      ...(mapped !== undefined ? { pkg: mapped } : {}),
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
          {services.map((s) => {
            const selected = data.service === s.id;
            const Icon = s.icon;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectServiceCategory(s)}
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
                  <p className="text-sm font-semibold text-white leading-tight">{s.label}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">{s.blurb}</p>
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
          {activeService && (
            <motion.div
              key={activeService.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mt-3 mb-2">
                Choose Option
              </p>
              <div className="flex flex-wrap gap-2">
                {activeService.options.map((opt) => {
                  const sel = data.serviceOption === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => selectServiceOption(opt)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 min-h-[40px] ${
                        sel
                          ? "text-[#050E21] border-[#C9A84C]"
                          : "glass-card text-white/70 hover:text-white hover:border-[#C9A84C]/40 active:scale-95"
                      }`}
                      style={sel ? { background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" } : {}}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
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
