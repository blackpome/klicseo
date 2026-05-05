"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, PenLine, ChevronRight } from "lucide-react";
import type { BookingData } from "./BookingWizard";

const vehicleData: { type: string; icon: string; models: string[] }[] = [
  { type: "Hatchback",      icon: "🚗", models: ["Swift","i10","Tiago","Celerio","WagonR","i20","Kwid","Santro"] },
  { type: "Sedan",          icon: "🚙", models: ["Honda City","Verna","Ciaz","Amaze","Slavia","Dzire"] },
  { type: "Compact SUV",    icon: "🚐", models: ["Nexon","Venue","Brezza","Sonet","Kiger","Punch"] },
  { type: "SUV",            icon: "🛻", models: ["Creta","Seltos","Duster","Grand Vitara","Hyryder"] },
  { type: "XUV & Large SUV",icon: "🚌", models: ["XUV 700","Harrier","Safari","Scorpio","Fortuner","Innova","Gloster"] },
];

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepVehicle({ data, update, onNext, onBack }: Props) {
  const [customModel, setCustomModel] = useState(
    data.carModel && !vehicleData.find((v) => v.type === data.vehicleType)?.models.includes(data.carModel)
      ? data.carModel : ""
  );
  const [showCustom, setShowCustom] = useState(false);

  const selectedVehicle = vehicleData.find((v) => v.type === data.vehicleType);

  function handleTypeSelect(type: string) {
    if (type !== data.vehicleType) {
      update({ vehicleType: type, carModel: "" });
      setCustomModel("");
      setShowCustom(false);
    }
  }

  function handleModelSelect(model: string) {
    update({ carModel: model });
    setShowCustom(false);
    setCustomModel("");
  }

  function handleCustomToggle() {
    setShowCustom(true);
    update({ carModel: "" });
  }

  const modelValid = data.carModel.trim().length >= 2 || (showCustom && customModel.trim().length >= 2);
  const valid = data.vehicleType && modelValid && data.carNumber.trim().length >= 3;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
        Your Vehicle
      </h2>
      <p className="text-white/45 text-sm mb-4">Select your car type and model.</p>

      {/* ── Car Type ── */}
      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
        Car Type
      </p>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {vehicleData.map((v) => {
          const selected = data.vehicleType === v.type;
          return (
            <motion.button
              key={v.type}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTypeSelect(v.type)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 min-h-[48px] ${
                selected
                  ? "border-[#C9A84C] shadow-[0_0_14px_rgba(201,168,76,0.2)]"
                  : "glass-card hover:border-[#1A5FD4]/40"
              }`}
              style={selected ? { background: "rgba(201,168,76,0.08)" } : {}}
            >
              <span className="text-xl flex-shrink-0 w-7 text-center leading-none">{v.icon}</span>
              <span className="flex-1 text-sm font-semibold text-white">{v.type}</span>
              {selected
                ? <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" }} />
                : <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
              }
            </motion.button>
          );
        })}
      </div>

      {/* ── Car Model ── */}
      <AnimatePresence>
        {data.vehicleType && selectedVehicle && (
          <motion.div
            key={data.vehicleType}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mb-4"
          >
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
              Car Model
            </p>

            <div className="flex flex-wrap gap-2 mb-2">
              {selectedVehicle.models.map((model) => {
                const sel = data.carModel === model && !showCustom;
                return (
                  <button
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 min-h-[40px] ${
                      sel
                        ? "text-[#050E21] border-[#C9A84C]"
                        : "glass-card text-white/70 hover:text-white hover:border-[#C9A84C]/40 active:scale-95"
                    }`}
                    style={sel ? { background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" } : {}}
                  >
                    {model}
                  </button>
                );
              })}

              {/* Other chip */}
              <button
                onClick={handleCustomToggle}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border min-h-[40px] transition-all duration-200 ${
                  showCustom
                    ? "text-[#050E21] border-[#C9A84C]"
                    : "glass-card text-white/45 hover:text-white border-dashed"
                }`}
                style={showCustom ? { background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" } : {}}
              >
                <PenLine size={12} />
                Other
              </button>
            </div>

            <AnimatePresence>
              {showCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="e.g. Mahindra Thar, MG Hector…"
                    value={customModel}
                    onChange={(e) => { setCustomModel(e.target.value); update({ carModel: e.target.value }); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors mt-1"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {data.carModel && !showCustom && (
              <p className="text-[11px] text-[#C9A84C]/80 mt-1.5">
                ✓ <span className="font-semibold">{data.carModel}</span> selected
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Registration ── */}
      <div className="mb-5">
        <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">
          <Car size={11} className="inline mr-1" />
          Registration Number *
        </label>
        <input
          type="text"
          placeholder="e.g. KA 01 AB 1234"
          value={data.carNumber}
          onChange={(e) => update({ carNumber: e.target.value.toUpperCase() })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm font-mono tracking-wider focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 transition-colors"
        />
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
          disabled={!valid}
          className="flex-[2] py-4 rounded-xl font-bold text-sm text-[#050E21] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
