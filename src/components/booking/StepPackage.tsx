"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import TransformationLoop from "./TransformationLoop";
import type { BookingData } from "./BookingWizard";
import {
  OPTIONS_BY_CATEGORY,
  SERVICE_OPTIONS,
  priceFor,
  tierForVehicleType,
  tierLabel,
  inr,
} from "@/lib/pricing";

const optionToPkg: Record<string, BookingData["pkg"]> = {
  Monthly:           "Daily",
  WeeklyThrice:      "TriWeekly",
  OneTimeManual:     "OneTime",
  OneTimeMachine:    "OneTime",
  CeramicSealant:    null,
  InteriorDetailing: null,
};

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPackage({ data, update, onNext, onBack }: Props) {
  const [attempted, setAttempted] = useState(false);
  const tier = tierForVehicleType(data.vehicleType);
  const category = data.service;
  const optionIds = category ? OPTIONS_BY_CATEGORY[category] : [];
  const selectedOption = data.serviceOption;
  const selectedDef = selectedOption ? SERVICE_OPTIONS[selectedOption as keyof typeof SERVICE_OPTIONS] : undefined;
  const errOption = attempted && !selectedDef;

  function handleContinue() {
    if (selectedDef) {
      setAttempted(false);
      onNext();
    } else {
      setAttempted(true);
    }
  }

  function selectOption(id: string) {
    if (id === selectedOption) return;
    update({
      serviceOption: id,
      pkg: optionToPkg[id] ?? null,
      interiorAddOn: false,
    });
  }

  function toggleAddOn() {
    update({ interiorAddOn: !data.interiorAddOn });
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Your Package
      </h2>
      <p className="text-white/45 text-sm mb-3">Pricing for your {tierLabel[tier]}.</p>

      <TransformationLoop label={selectedDef?.shortLabel} />

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

      {/* Empty-state — no service category yet */}
      {!category && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-[12px] text-amber-200/90 mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Pick a service on the contact step to see prices.</span>
        </div>
      )}

      {/* Option cards for the chosen category */}
      <div className={`grid grid-cols-1 gap-3 mb-1 mt-2 ${errOption ? "rounded-xl ring-2 ring-red-400/60 p-1" : ""}`}>
        {optionIds.map((id) => {
          const opt = SERVICE_OPTIONS[id];
          const selected = selectedOption === id;
          const p = priceFor(id, data.vehicleType, false);
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.985 }}
              onClick={() => selectOption(id)}
              className={`relative text-left rounded-xl p-4 border transition-all duration-300 ${
                selected
                  ? "border-[#C9A84C] shadow-[0_0_20px_rgba(201,168,76,0.25)]"
                  : "glass-card hover:border-[#1A5FD4]/40"
              }`}
              style={
                selected
                  ? { background: "linear-gradient(145deg,rgba(201,168,76,0.1),rgba(5,14,33,0.9))" }
                  : {}
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                      {opt.label}
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
                  <p className="text-white/40 text-[11px] mb-1">{opt.blurb}</p>
                  {opt.addOn && (
                    <p className="text-[10px] text-white/35">
                      {opt.addOn.label}: +{inr(opt.addOn.price[tier])}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0 ml-1">
                  <div className="text-lg sm:text-xl font-bold gold-shimmer" style={{ fontFamily: "var(--font-playfair)" }}>
                    {p ? inr(p.base) : "—"}
                  </div>
                  <div className="text-white/35 text-[10px]">
                    {opt.recurring === "monthly" ? "/mo" : "one time"}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
      {errOption && <p className="text-[11px] text-red-300 mt-2 mb-3">Pick an option to continue.</p>}
      {!errOption && <div className="mb-3" />}

      {/* Interior add-on — Ceramic Sealant / One-Time Manual */}
      {selectedDef?.addOn && (
        <button
          onClick={toggleAddOn}
          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border text-left mb-4 transition-all ${
            data.interiorAddOn
              ? "border-[#C9A84C] bg-[rgba(201,168,76,0.08)]"
              : "glass-card hover:border-[#1A5FD4]/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                data.interiorAddOn
                  ? "border-[#C9A84C]"
                  : "border-white/25"
              }`}
              style={data.interiorAddOn ? { background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" } : {}}
            >
              {data.interiorAddOn && <Check size={11} className="text-[#050E21]" strokeWidth={3} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{selectedDef.addOn.label}</p>
              <p className="text-[11px] text-white/45 mt-0.5">
                {selectedDef.category === "CarDetailing"
                  ? `Pair full interior detailing with ${selectedDef.shortLabel}`
                  : "Add interior cleaning to this visit"}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-[#C9A84C] whitespace-nowrap">
            +{inr(selectedDef.addOn.price[tier])}
          </span>
        </button>
      )}

      {/* Total preview */}
      {selectedDef && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
          style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <div>
            <p className="text-white/60 text-sm leading-none">Estimated total</p>
            <p className="text-white/35 text-[10px] mt-0.5">
              {selectedDef.recurring === "monthly" ? "per month" : "one time"} · {tierLabel[tier]}
            </p>
          </div>
          <span className="text-2xl font-bold gold-shimmer" style={{ fontFamily: "var(--font-playfair)" }}>
            {(() => {
              const p = priceFor(selectedOption, data.vehicleType, data.interiorAddOn);
              return p ? inr(p.total) : "—";
            })()}
          </span>
        </div>
      )}

      {attempted && !selectedDef && (
        <p className="text-[12px] text-red-300 text-center mb-3">
          Please pick an option above to continue.
        </p>
      )}

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
          Review Booking →
        </button>
      </div>
    </div>
  );
}
