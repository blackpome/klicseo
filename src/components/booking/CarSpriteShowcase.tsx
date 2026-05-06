"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Sprite sheet: 1024×1024, 2 cols × 3 rows → each frame 512×341px
const FRAME_W_SRC = 512;
const FRAME_H_SRC = 1024 / 3;  // ≈ 341.33
const DISPLAY_H   = 260;
const SCALE        = DISPLAY_H / FRAME_H_SRC;
const SHEET_PX     = 1024 * SCALE;         // displayed sheet size (square)
const FRAME_PX_W   = FRAME_W_SRC * SCALE;  // displayed frame width ≈ 390

// Shot sequence: [col, row] in the sprite grid
// Ordered for a cinematic "walk-around" reveal
const SHOTS = [
  { col: 1, row: 0, label: "Side Profile"  },
  { col: 1, row: 1, label: "Front ¾"       },
  { col: 1, row: 2, label: "Low Angle"     },
  { col: 0, row: 0, label: "Aerial View"   },
  { col: 0, row: 2, label: "Dynamic"       },
  { col: 0, row: 1, label: "Rear ¾"        },
] as const;

// Ken Burns motion per shot
const KB = [
  { s0: 1.00, s1: 1.07, x0:  0, x1: -8,  y0: 0,  y1:  2 },
  { s0: 1.06, s1: 1.00, x0:  8, x1:  0,  y0: 2,  y1:  0 },
  { s0: 1.08, s1: 1.02, x0:  0, x1:  8,  y0: 4,  y1:  0 },
  { s0: 1.00, s1: 1.10, x0:  0, x1:  0,  y0: 0,  y1:  8 },
  { s0: 1.06, s1: 1.00, x0: -8, x1:  0,  y0: 0,  y1: -4 },
  { s0: 1.02, s1: 1.08, x0:  4, x1: -4,  y0: 0,  y1:  0 },
];

const DURATION_MS = 3800;

export default function CarSpriteShowcase() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % SHOTS.length), DURATION_MS);
    return () => clearInterval(t);
  }, []);

  const shot = SHOTS[idx];
  const kb   = KB[idx];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        height: DISPLAY_H,
        // Light studio background — white car bg blends naturally
        background: "linear-gradient(145deg, #bfcfde 0%, #dde7ef 50%, #c8d6e3 100%)",
      }}
    >
      {/* ── Animated frame ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          className="absolute inset-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: kb.s0, x: kb.x0, y: kb.y0 }}
            animate={{ scale: kb.s1, x: kb.x1, y: kb.y1 }}
            transition={{ duration: DURATION_MS / 1000, ease: "easeInOut" }}
          >
            {/* Clipping window — one frame's width × full display height */}
            <div style={{ width: FRAME_PX_W, height: DISPLAY_H, overflow: "hidden", flexShrink: 0 }}>
              <img
                src="/car-sprite.png"
                alt=""
                draggable={false}
                style={{
                  position: "relative",
                  width:  SHEET_PX,
                  height: SHEET_PX,
                  top:  -(shot.row * DISPLAY_H),
                  left: -(shot.col * FRAME_PX_W),
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* ── Cinematic overlays ── */}

      {/* Vignette: dark edges, bright centre (studio spotlight look) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 68% 72% at 50% 50%, transparent 25%, rgba(5,14,33,0.5) 72%, rgba(5,14,33,0.92) 100%)",
      }} />
      {/* Bottom bleed into page bg */}
      <div className="absolute bottom-0 inset-x-0 h-14 pointer-events-none" style={{
        background: "linear-gradient(to top, #050E21, transparent)",
      }} />
      {/* Top bleed */}
      <div className="absolute top-0 inset-x-0 h-8 pointer-events-none" style={{
        background: "linear-gradient(to bottom, rgba(5,14,33,0.55), transparent)",
      }} />
      {/* Blue rim — upper right */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 45% 55% at 88% 18%, rgba(26,95,212,0.22) 0%, transparent 70%)",
      }} />
      {/* Gold fill — lower left */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 40% 45% at 12% 88%, rgba(201,168,76,0.14) 0%, transparent 70%)",
      }} />

      {/* ── HUD ── */}
      <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            transition={{ duration: 0.3 }}
            className="text-[9px] font-bold tracking-[0.25em] uppercase"
            style={{ color: "rgba(201,168,76,0.75)" }}
          >
            {shot.label}
          </motion.span>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {SHOTS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                height: 4,
                width:  i === idx ? 14 : 4,
                background: i === idx ? "#C9A84C" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
