"use client";

import { useEffect, useState } from "react";

interface Bubble {
  id: number;
  size: number;       // px — capped smaller on mobile via CSS clamp
  left: number;       // % from left
  delay: number;      // s animation delay
  duration: number;   // s rise duration
  swayDuration: number;
  swayAmount: number; // px horizontal drift
  opacity: number;
  blur: boolean;
  color: "blue" | "gold" | "white";
}

const COLORS = {
  blue:  "26,95,212",
  gold:  "201,168,76",
  white: "255,255,255",
} as const;

function makeBubbles(count: number): Bubble[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    // Smaller on mobile — kept in a modest range
    size:         10 + Math.random() * 28,
    left:         3  + Math.random() * 94,
    delay:        Math.random() * 14,
    duration:     9  + Math.random() * 9,
    swayDuration: 3  + Math.random() * 4,
    swayAmount:   14 + Math.random() * 22,
    opacity:      0.18 + Math.random() * 0.38,
    blur:         Math.random() > 0.68,
    color: (["blue","blue","blue","gold","white"] as const)[
      Math.floor(Math.random() * 5)
    ],
  }));
}

export default function BubbleParticles({ count = 28 }: { count?: number }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [mounted, setMounted] = useState(false);

  // Client-only — avoids SSR/hydration mismatch. Fewer bubbles on small screens
  // and none when the user prefers reduced motion (decorative only).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const n = reduce ? 0 : isMobile ? Math.round(count / 2) : count;
    // Client-only init (random values + media queries) — must run post-mount to
    // avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBubbles(makeBubbles(n));
    setMounted(true);
  }, [count]);

  /* Build per-bubble sway keyframes with real px values (CSS vars in
     @keyframes are unreliable across browsers).  Rise is shared. */
  const swayCSS = bubbles
    .map(
      (b) => `
      @keyframes sway-${b.id} {
        0%,100% { transform: translateX(0px); }
        30%     { transform: translateX(${b.swayAmount}px); }
        65%     { transform: translateX(-${Math.round(b.swayAmount * 0.7)}px); }
      }`
    )
    .join("");

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1, opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease" }}
    >
      <style>{`
        /* Shared rise animation — uses a large fixed px value so it works
           on iOS Safari where 100vh ≠ visible viewport height */
        @keyframes bubble-rise {
          0%   { transform: translateY(1400px); opacity: 0; }
          7%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(-80px);  opacity: 0; }
        }
        ${swayCSS}
      `}</style>

      {bubbles.map((b) => {
        const rgb = COLORS[b.color];
        const size = `clamp(8px, ${b.size}px, ${b.size}px)`;

        return (
          /* OUTER — vertical rise only (translateY) */
          <div
            key={b.id}
            style={{
              position:  "absolute",
              bottom:    0,
              left:      `${b.left}%`,
              width:     size,
              height:    size,
              willChange: "transform",
              animation: `bubble-rise ${b.duration}s ${b.delay}s ease-in infinite`,
              animationFillMode: "backwards",
            }}
          >
            {/* INNER — horizontal sway only (translateX) + visual */}
            <div
              style={{
                width:     "100%",
                height:    "100%",
                borderRadius: "50%",
                willChange: "transform",
                animation: `sway-${b.id} ${b.swayDuration}s ${b.delay}s ease-in-out infinite`,
                /* Glassy soap-bubble look */
                background: `radial-gradient(
                  circle at 30% 26%,
                  rgba(255,255,255,0.65)  0%,
                  rgba(255,255,255,0.12) 28%,
                  rgba(${rgb},${(b.opacity * 0.55).toFixed(2)}) 65%,
                  rgba(${rgb},${b.opacity.toFixed(2)}) 100%
                )`,
                border:    `1px solid rgba(${rgb},0.38)`,
                boxShadow: [
                  `inset 0 -3px 6px rgba(${rgb},0.18)`,
                  `0 0 ${Math.round(b.size * 0.55)}px rgba(${rgb},0.14)`,
                ].join(","),
                filter:    b.blur ? "blur(1px)" : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
