"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, useAnimationControls } from "framer-motion";

const Car3DViewer = dynamic(() => import("./Car3DViewer"), {
  ssr: false,
  loading: () => <div className="h-[260px] sm:h-[320px]" />,
});

type Pkg = "Daily" | "TriWeekly" | "OneTime" | null;

// Vehicle type → 3D model path
const vehicleModelMap: Record<string, string> = {
  "Hatchback":         "/models/bmw.glb",
  "Sedan":             "/models/mercedes.glb",
  "Compact SUV":       "/models/skoda.glb",
  "SUV":               "/models/suv.glb",
  "XUV & Large SUV":   "/models/suv.glb",
  "XUV / Large":       "/models/suv.glb",
};

const configs = {
  Daily: {
    model:     "/models/porsche.glb",
    rimColor:  "#C9A84C",
    glowColor: "rgba(201,168,76,0.45)",
    label:     "Daily Doorstep Wash",
    particles: true,
    shimmer:   true,
    sparkles:  true,
  },
  TriWeekly: {
    model:     "/models/mercedes.glb",
    rimColor:  "#4A8FFF",
    glowColor: "rgba(26,95,212,0.4)",
    label:     "Tri-Weekly Exterior Wash",
    particles: true,
    shimmer:   false,
    sparkles:  false,
  },
  OneTime: {
    model:     "/models/bmw.glb",
    rimColor:  "#9CA8B8",
    glowColor: "rgba(192,200,212,0.3)",
    label:     "One-Time Demo Wash",
    particles: false,
    shimmer:   false,
    sparkles:  false,
  },
};

// Default model shown before a package is selected
const DEFAULT_MODEL = "/models/porsche.glb";
const DEFAULT_RIM   = "#3a5a8a";

function WaterDrop({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full border border-[#1A5FD4]/40 pointer-events-none"
      style={{
        background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(26,95,212,0.3))",
        ...style,
      }}
    />
  );
}

function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute text-[#E8CC7A] pointer-events-none" style={{ fontSize: 12, ...style }}>
      ✦
    </div>
  );
}

interface Props {
  pkg: Pkg;
  vehicleType?: string;
}

export default function CarShowcase({ pkg, vehicleType }: Props) {
  const cfg = pkg ? configs[pkg] : null;
  // Vehicle-type selection overrides the package default model
  const model    = (vehicleType && vehicleModelMap[vehicleType]) ?? cfg?.model ?? DEFAULT_MODEL;
  const rimColor = cfg?.rimColor ?? DEFAULT_RIM;

  // Cinematic zoom-in fires imperatively on package change so the wrapper
  // (and the <Canvas> inside it) stays mounted — re-mounting was racing
  // with Bounds.fit() and pushing the car to the bottom-right corner.
  const cineCtrls = useAnimationControls();
  useEffect(() => {
    if (!pkg) return;
    cineCtrls.set({ scale: 1.4, opacity: 0 });
    cineCtrls.start({
      scale: 1,
      opacity: 1,
      transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] },
    });
  }, [pkg, cineCtrls]);

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      {/* Package glow */}
      <motion.div
        animate={cfg ? { opacity: 1, scale: 1 } : { opacity: 0.3, scale: 0.9 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: cfg
            ? `radial-gradient(ellipse 75% 55% at 50% 65%, ${cfg.glowColor} 0%, transparent 70%)`
            : "radial-gradient(ellipse 60% 45% at 50% 65%, rgba(26,95,212,0.15) 0%, transparent 70%)",
          filter: "blur(16px)",
        }}
      />

      {/* 3D car — cinematic zoom-in driven by `cineCtrls` (see useEffect above).
          No `key` here on purpose: re-mounting forces a Canvas re-fit that
          collides with the scale animation. Imperative animation keeps the
          wrapper (and the Canvas) mounted so Bounds.fit only runs once. */}
      <motion.div
        animate={cineCtrls}
        initial={{ opacity: 1, scale: 1 }}
        style={{ transformOrigin: "center center" }}
        className="relative w-full"
      >
        <Car3DViewer
          model={model}
          rimColor={rimColor}
          vehicleType={vehicleType}
        />

        {/* Water drops for Daily & TriWeekly */}
        {cfg?.particles && (
          <>
            <WaterDrop style={{ width: 8,  height: 8,  top: "18%", left: "14%",  animationDelay: "0s"   }} />
            <WaterDrop style={{ width: 5,  height: 5,  top: "32%", right: "16%", animationDelay: "0.4s" }} />
            <WaterDrop style={{ width: 10, height: 10, top: "12%", left: "52%",  animationDelay: "0.8s" }} />
            <WaterDrop style={{ width: 6,  height: 6,  top: "42%", left: "28%",  animationDelay: "0.2s" }} />
          </>
        )}

        {/* Gold sparkles for Daily */}
        {cfg?.sparkles && (
          <>
            <Sparkle style={{ top: "6%",  left: "12%",  animationDelay: "0s"   }} />
            <Sparkle style={{ top: "22%", right: "10%", animationDelay: "0.3s" }} />
            <Sparkle style={{ top: "48%", left: "6%",   animationDelay: "0.6s" }} />
            <Sparkle style={{ top: "9%",  right: "28%", animationDelay: "0.9s" }} />
          </>
        )}

        {/* Shimmer sweep overlay on top of canvas for Daily */}
        {cfg?.shimmer && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div
              className="absolute top-0 bottom-0 w-16 opacity-25"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(232,204,122,0.7), transparent)",
                animation: "sweepX 2.8s ease-in-out infinite",
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
          className="text-xs font-semibold tracking-widest uppercase mt-2"
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
