"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, User, CheckCircle, RefreshCw } from "lucide-react";
import type { BookingData } from "./BookingWizard";

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepContact({ data, update, onNext, onBack }: Props) {
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneValid = data.phone.trim().length >= 8;
  const nameValid  = data.name.trim().length >= 2;
  const otpComplete = otp.join("").length === 6;
  const canProceed  = nameValid && phoneValid && data.otpVerified;

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

      <div className="flex gap-3 mt-5">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-semibold text-sm text-white/60 glass-card hover:text-white active:scale-95 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
