"use client";

import { useState } from "react";
import { Car, AlertTriangle, Check, Lock, Clock, Home, Trees } from "lucide-react";
import type { BookingData } from "./BookingWizard";
import { CATEGORY_COLORS } from "@/lib/pricing";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { stepCopy, builtinCfg, msg } from "@/lib/site-settings-shared";
import CarPicker from "./CarPicker";
import CustomFields from "./CustomFields";

// Callback availability slots. The service visit is confirmed later by the team.
const TIME_SLOTS = [
  "12:00 AM", "1:00 AM",  "2:00 AM",  "3:00 AM",
  "4:00 AM",  "5:00 AM",  "6:00 AM",  "7:00 AM",
  "8:00 AM",  "9:00 AM",  "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM",  "2:00 PM",  "3:00 PM",
  "4:00 PM",  "5:00 PM",  "6:00 PM",  "7:00 PM",
  "8:00 PM",  "9:00 PM",  "10:00 PM", "11:00 PM",
];

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepLocation({ data, update, onNext, onBack }: Props) {
  // Step borders / selected-state tints follow the category color picked in
  // Step 1 (blue for CarWash, green for CarDetailing, pink for OneTimeCarWash)
  // — never gold. Decorative label icons and the bottom Continue button keep
  // their existing brand-gold to stay consistent with the rest of the wizard.
  const accent = data.service ? CATEGORY_COLORS[data.service] : "#C9A84C";
  const accent20 = `${accent}33`; // 20% alpha — focus ring / soft glow
  const booking = useSiteSettings().booking;
  const copy = stepCopy(booking, "schedule");
  // Built-in field toggles (admin-controlled).
  const numCfg = builtinCfg(booking, "schedule", "carNumber");
  const coverCfg = builtinCfg(booking, "schedule", "carCover");
  const gateCfg = builtinCfg(booking, "schedule", "gateAccess");

  const [attempted, setAttempted] = useState(false);

  const brandValid = data.carBrand.trim().length >= 1;
  const modelValid = data.carModel.trim().length >= 1;
  const numberValid = data.carNumber.trim().length >= 3;

  // A built-in field only blocks progress when it's both enabled and required.
  const numberOk = !numCfg.enabled || !numCfg.required || numberValid;
  const coverOk =
    !coverCfg.enabled || !coverCfg.required || data.parkingLocation !== "outside" || data.carCoverChoice !== "";
  const gateOk = !gateCfg.enabled || !gateCfg.required || data.gateAccessConsent;

  const valid =
    brandValid &&
    modelValid &&
    numberOk &&
    data.parkingLocation !== "" &&
    coverOk &&
    gateOk &&
    data.date.length > 0;

  const errBrand    = attempted && !brandValid;
  const errModel    = attempted && !modelValid;
  const errNumber   = attempted && numCfg.enabled && numCfg.required && !numberValid;
  const errParking  = attempted && data.parkingLocation === "";
  const errCarCover = attempted && coverCfg.enabled && coverCfg.required && data.parkingLocation === "outside" && data.carCoverChoice === "";
  const errGate     = attempted && gateCfg.enabled && gateCfg.required && !data.gateAccessConsent;
  const errDate     = attempted && data.date.length === 0;

  function handleContinue() {
    if (valid) {
      setAttempted(false);
      onNext();
    } else {
      setAttempted(true);
    }
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        {copy.title}
      </h2>
      <p className="text-white/45 text-sm mb-4">{copy.subtitle}</p>

      {/* ── Car Brand + Model (DB-backed search, manual fallback) ── */}
      <CarPicker data={data} update={update} accent={accent} errBrand={errBrand} errModel={errModel} />

      {/* ── Registration ── */}
      {numCfg.enabled && (
        <div className="mb-5">
          <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
            <Car size={11} className="inline mr-1" />
            Registration Number{numCfg.required && " *"}
          </label>
          <input
            type="text"
            placeholder="e.g. KA 01 AB 1234"
            value={data.carNumber}
            onChange={(e) => update({ carNumber: e.target.value.toUpperCase() })}
            className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm font-mono tracking-wider focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors ${
              errNumber ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
            }`}
          />
          {errNumber && <p className="text-[11px] text-red-300 mt-1">Enter the registration number.</p>}
        </div>
      )}

      <div className="h-px bg-white/5 my-5" />

      {/* Parking — Inside / Outside */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          {msg(booking, "schedule", "parking_prompt")} *
        </p>
        <div className={`grid grid-cols-2 gap-2 ${errParking ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
          {([
            { id: "inside",  label: "Inside",  blurb: "Garage / basement", Icon: Home  },
            { id: "outside", label: "Outside", blurb: "Driveway / open",   Icon: Trees },
          ] as const).map(({ id, label, blurb, Icon }) => {
            const sel = data.parkingLocation === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  update({
                    parkingLocation: id,
                    carCoverChoice: id === "outside" ? data.carCoverChoice : "",
                  })
                }
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all min-h-[48px] ${
                  sel ? "" : "glass-card hover:border-[#1A5FD4]/40"
                }`}
                style={
                  sel
                    ? { borderColor: accent, background: `${accent}14`, boxShadow: `0 0 14px ${accent20}` }
                    : {}
                }
              >
                <Icon size={14} style={sel ? { color: accent } : undefined} className={sel ? "" : "text-white/50"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 truncate">{blurb}</p>
                </div>
                {sel && (
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accent }} />
                )}
              </button>
            );
          })}
        </div>
        {errParking && <p className="text-[11px] text-red-300 mt-2">Pick where the car will be parked.</p>}
      </div>

      {coverCfg.enabled && data.parkingLocation === "outside" && (
        <>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
              {msg(booking, "schedule", "cover_prompt")}{coverCfg.required && " *"}
            </p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${errCarCover ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
              {([
                {
                  id: "yes",
                  title: "Yes, I have one",
                  note: "Get a Rs.100 discount",
                  warning: "Even after cleaning, the car cover may carry dust, so the car may collect dust again.",
                },
                {
                  id: "no",
                  title: "No car cover",
                  note: "Extra charges may apply",
                  warning: "",
                },
              ] as const).map((option) => {
                const sel = data.carCoverChoice === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ carCoverChoice: option.id })}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      sel ? "" : "glass-card hover:border-[#1A5FD4]/40"
                    }`}
                    style={
                      sel
                        ? { borderColor: accent, background: `${accent}1A`, boxShadow: `0 0 14px ${accent}29` }
                        : {}
                    }
                  >
                    <p className="text-sm font-semibold text-white">{option.title}</p>
                    <p
                      className={`mt-1 text-[11px] ${option.id === "yes" ? "" : "text-red-300"}`}
                      style={option.id === "yes" ? { color: accent } : undefined}
                    >
                      {option.note}
                    </p>
                    {option.warning && (
                      <p className="mt-1.5 text-[11px] leading-snug text-red-300">
                        {option.warning}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {errCarCover && <p className="text-[11px] text-red-300 mt-2">Choose whether you have a car cover.</p>}
          </div>

          <div
            className="mb-4 rounded-xl px-3 py-3 text-[11px] leading-snug text-red-200"
            style={{
              background: "rgba(248, 113, 113, 0.10)",
              border: "1px solid rgba(248, 113, 113, 0.35)",
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-300" />
              <div>
                <p className="font-semibold text-red-100 mb-1">Car cover required</p>
                <p>
                  If the car is parked outside, a car cover is mandatory. Without a cover,
                  extra charges may apply based on the car&apos;s condition.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Gate / access consent */}
      {gateCfg.enabled && (
      <button
        type="button"
        onClick={() => update({ gateAccessConsent: !data.gateAccessConsent })}
        className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border text-left mb-4 transition-all ${
          data.gateAccessConsent
            ? ""
            : errGate
            ? "border-red-400/70 ring-1 ring-red-400/30 bg-white/[0.04]"
            : "glass-card hover:border-[#1A5FD4]/40"
        }`}
        style={data.gateAccessConsent ? { borderColor: accent, background: `${accent}14` } : {}}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border mt-0.5"
          style={
            data.gateAccessConsent
              ? { borderColor: accent, background: accent }
              : { borderColor: "rgba(255,255,255,0.25)" }
          }
        >
          {data.gateAccessConsent && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
            <Lock size={11} className="text-[#C9A84C]" /> Gate / parking access{gateCfg.required && " *"}
          </p>
          <p className="text-[11px] text-white/55 mt-1 leading-snug">
            {msg(booking, "schedule", "gate_text")}
          </p>
          {errGate && <p className="text-[11px] text-red-300 mt-2">Tick this box to confirm gate access.</p>}
        </div>
      </button>
      )}

      {/* Callback availability */}
      <div className="mb-4">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          {msg(booking, "schedule", "callback_prompt")} *
        </label>
        <p className="text-[11px] text-white/45 mb-2">
          Choose a date when you&apos;re free for a quick confirmation call.
        </p>
        <input
          type="date"
          value={data.date}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => update({ date: e.target.value })}
          onFocus={(e) => {
            if (!errDate) {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors [color-scheme:dark] ${
            errDate ? "border-red-400/70 ring-1 ring-red-400/30" : "border-white/10"
          }`}
        />
        {errDate && <p className="text-[11px] text-red-300 mt-1">Pick a callback date.</p>}
      </div>

      {/* Compact callback-time picker. */}
      <div className="mb-6">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          Your free time for the call
        </label>
        <div className="relative">
          <Clock
            size={14}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A84C]"
          />
          <select
            value={data.time}
            onChange={(e) => update({ time: e.target.value })}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${accent20}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.boxShadow = "";
            }}
            className="w-full appearance-none rounded-xl border border-white/10 bg-[#071F4A] py-3.5 pl-10 pr-10 text-sm font-semibold text-white focus:outline-none [color-scheme:dark]"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/35">
            ▼
          </span>
        </div>
      </div>

      {attempted && !valid && (
        <p className="text-[12px] text-red-300 text-center mb-3">
          Please complete the highlighted fields above.
        </p>
      )}

      <CustomFields stepKey="schedule" data={data} update={update} />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-semibold text-sm text-white/60 glass-card hover:text-white active:scale-95 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {msg(booking, "schedule", "continue")}
        </button>
      </div>
    </div>
  );
}
