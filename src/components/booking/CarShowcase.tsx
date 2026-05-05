"use client";

import { motion } from "framer-motion";

type Pkg = "Daily" | "TriWeekly" | "OneTime" | null;

const configs = {
  Daily: {
    bodyColor: "#C9A84C",
    glowColor: "rgba(201,168,76,0.5)",
    label: "Daily Doorstep Wash",
    accent: "#E8CC7A",
    particles: true,
    shimmer: true,
    sparkles: true,
  },
  TriWeekly: {
    bodyColor: "#1A5FD4",
    glowColor: "rgba(26,95,212,0.45)",
    label: "Tri-Weekly Exterior Wash",
    accent: "#4A8FFF",
    particles: true,
    shimmer: false,
    sparkles: false,
  },
  OneTime: {
    bodyColor: "#C0C8D4",
    glowColor: "rgba(192,200,212,0.35)",
    label: "One-Time Demo Wash",
    accent: "#9CA8B8",
    particles: false,
    shimmer: false,
    sparkles: false,
  },
};

function CarSVG({ color, accent }: { color: string; accent: string }) {
  return (
    <svg viewBox="0 0 260 110" fill="none" className="w-full h-auto drop-shadow-2xl">
      {/* Shadow */}
      <ellipse cx="130" cy="100" rx="90" ry="8" fill="rgba(0,0,0,0.35)" />

      {/* Body */}
      <rect x="18" y="52" width="224" height="38" rx="10" fill={color} />

      {/* Cabin */}
      <path d="M65 52 Q80 22 115 20 H155 Q188 22 198 52Z" fill={accent} opacity="0.9" />

      {/* Windscreen */}
      <path d="M78 52 Q90 30 115 28 H148 Q168 30 178 52Z" fill="rgba(180,220,255,0.25)" />

      {/* Rear window */}
      <path d="M160 52 Q170 36 185 34 H195 Q200 36 200 52Z" fill="rgba(180,220,255,0.2)" />

      {/* Front bumper */}
      <rect x="220" y="62" width="18" height="20" rx="6" fill={accent} opacity="0.85" />

      {/* Rear bumper */}
      <rect x="22" y="62" width="18" height="20" rx="6" fill={accent} opacity="0.85" />

      {/* Headlights */}
      <ellipse cx="234" cy="66" rx="6" ry="4" fill="#FFF9C4" opacity="0.95" />
      <ellipse cx="234" cy="66" rx="4" ry="2.5" fill="#FFFFFF" />

      {/* Taillights */}
      <ellipse cx="26" cy="66" rx="6" ry="4" fill="#FF4444" opacity="0.85" />

      {/* Wheels */}
      <circle cx="68" cy="90" r="16" fill="#1a1a2e" />
      <circle cx="68" cy="90" r="10" fill="#2a2a3e" />
      <circle cx="68" cy="90" r="5" fill={accent} opacity="0.7" />

      <circle cx="192" cy="90" r="16" fill="#1a1a2e" />
      <circle cx="192" cy="90" r="10" fill="#2a2a3e" />
      <circle cx="192" cy="90" r="5" fill={accent} opacity="0.7" />

      {/* Door line */}
      <line x1="130" y1="54" x2="130" y2="88" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      <line x1="88" y1="54" x2="88" y2="88" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
      <line x1="172" y1="54" x2="172" y2="88" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />

      {/* Shine sweep */}
      <rect x="30" y="30" width="30" height="70" rx="4"
        fill="url(#shine)" opacity="0.18" transform="skewX(-15)" />

      <defs>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WaterDrop({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full border border-[#1A5FD4]/40"
      style={{
        background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(26,95,212,0.3))",
        ...style,
      }}
    />
  );
}

function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute text-[#E8CC7A]" style={{ fontSize: 12, ...style }}>
      ✦
    </div>
  );
}

export default function CarShowcase({ pkg }: { pkg: Pkg }) {
  const cfg = pkg ? configs[pkg] : null;

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      {/* Glow behind car */}
      <motion.div
        animate={cfg ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: cfg
            ? `radial-gradient(ellipse 70% 60% at 50% 60%, ${cfg.glowColor} 0%, transparent 70%)`
            : "none",
          filter: "blur(12px)",
        }}
      />

      {/* Car */}
      <motion.div
        key={pkg}
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[300px] sm:max-w-[360px] px-4"
      >
        {cfg ? (
          <CarSVG color={cfg.bodyColor} accent={cfg.accent} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 opacity-30">
            <CarSVG color="#2a3a5a" accent="#3a4a6a" />
          </div>
        )}

        {/* Water drops for Daily & TriWeekly */}
        {cfg?.particles && (
          <>
            <WaterDrop style={{ width: 8, height: 8, top: "15%", left: "20%", animationDelay: "0s" }} />
            <WaterDrop style={{ width: 5, height: 5, top: "30%", right: "18%", animationDelay: "0.4s" }} />
            <WaterDrop style={{ width: 10, height: 10, top: "10%", left: "55%", animationDelay: "0.8s" }} />
            <WaterDrop style={{ width: 6, height: 6, top: "40%", left: "30%", animationDelay: "0.2s" }} />
          </>
        )}

        {/* Gold sparkles for Daily */}
        {cfg?.sparkles && (
          <>
            <Sparkle style={{ top: "5%", left: "15%", animationDelay: "0s" }} />
            <Sparkle style={{ top: "20%", right: "12%", animationDelay: "0.3s" }} />
            <Sparkle style={{ top: "45%", left: "8%", animationDelay: "0.6s" }} />
            <Sparkle style={{ top: "8%", right: "30%", animationDelay: "0.9s" }} />
          </>
        )}

        {/* Shimmer sweep for Daily */}
        {cfg?.shimmer && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
            style={{ animation: "shimmerSweep 2.5s ease-in-out infinite" }}
          >
            <div
              className="absolute top-0 bottom-0 w-16 opacity-20"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(232,204,122,0.8), transparent)",
                animation: "sweepX 2.5s ease-in-out infinite",
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Package label */}
      {cfg && (
        <motion.p
          key={`label-${pkg}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-xs font-semibold tracking-widest uppercase mt-3"
          style={{ color: cfg.glowColor.replace("rgba", "rgb").replace(/,\s*[\d.]+\)/, ")") }}
        >
          {cfg.label}
        </motion.p>
      )}

      <style>{`
        @keyframes sweepX {
          0%   { left: -10%; }
          100% { left: 110%; }
        }
      `}</style>
    </div>
  );
}
