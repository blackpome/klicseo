"use client";

import { motion } from "framer-motion";

const STEPS = [
  { full: "Package",  short: "Pkg"  },
  { full: "Vehicle",  short: "Car"  },
  { full: "Contact",  short: "OTP"  },
  { full: "Location", short: "Addr" },
  { full: "Confirm",  short: "Done" },
];

export default function ProgressBar({ current }: { current: number }) {
  return (
    <div className="w-full mb-6">
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {STEPS.map((s, i) => (
          <span
            key={s.full}
            className={`text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300 ${
              i + 1 <= current ? "text-[#C9A84C]" : "text-white/25"
            }`}
          >
            <span className="hidden xs:inline sm:inline">{s.full}</span>
            <span className="xs:hidden sm:hidden">{s.short}</span>
          </span>
        ))}
      </div>

      {/* Track */}
      <div className="relative h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: "linear-gradient(90deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          initial={{ width: 0 }}
          animate={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-1.5">
        {STEPS.map((s, i) => {
          const done   = i + 1 < current;
          const active = i + 1 === current;
          return (
            <div
              key={s.full}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                active ? "scale-125 ring-2 ring-[#C9A84C]/40" : done ? "scale-110" : "bg-white/15"
              }`}
              style={done || active ? { background: "linear-gradient(135deg,#9C7A2A,#E8CC7A)" } : {}}
            />
          );
        })}
      </div>

      {/* Mobile step counter */}
      <p className="text-center text-[10px] text-white/30 mt-2 sm:hidden">
        Step {current} of {STEPS.length}
      </p>
    </div>
  );
}
