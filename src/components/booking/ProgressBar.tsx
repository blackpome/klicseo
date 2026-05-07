"use client";

import { motion } from "framer-motion";

const STEPS = ["Contact", "Location", "Vehicle", "Package", "Confirm"];

export default function ProgressBar({ current }: { current: number }) {
  const total = STEPS.length;
  const safeCurrent = Math.min(Math.max(current, 1), total);
  const percent = Math.round(((safeCurrent - 1) / (total - 1)) * 100);
  const stepName = STEPS[safeCurrent - 1];

  return (
    <div className="w-full mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-[#C9A84C] tracking-widest uppercase">
          {percent}% done
        </span>
        <span className="text-[11px] font-semibold text-white/55 tracking-widest uppercase">
          Step {safeCurrent} <span className="text-white/30">·</span> {stepName}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: "linear-gradient(90deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
