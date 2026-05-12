"use client";

import { motion } from "framer-motion";

const TOTAL_STEPS = 5;
const PREMIUM_GOLD = "#C9A84C";
const PREMIUM_GOLD_LIGHT = "#E8CC7A";

export default function ProgressBar({ current }: { current: number }) {
  const safeCurrent = Math.min(Math.max(current, 1), TOTAL_STEPS);
  const percent = Math.round(((safeCurrent - 1) / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="w-full mb-5">
      <div className="flex items-center mb-1.5">
        <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: PREMIUM_GOLD }}>
          {percent}% done
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${PREMIUM_GOLD}, ${PREMIUM_GOLD_LIGHT})` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
