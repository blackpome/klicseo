"use client";

import Image from "next/image";

interface Props {
  tint: string | null;
  shimmer: boolean;
}

export default function CarCinematic({ tint, shimmer }: Props) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: 220 }}
    >
      {/* Ken Burns — image slightly oversized so zoom never shows edges */}
      <div className="absolute cinema-kb" style={{ inset: "-6%" }}>
        <Image
          src="/cars.jpg"
          alt="Premium car"
          fill
          priority
          className="object-cover object-center"
          style={{ filter: "contrast(1.12) saturate(0.82) brightness(0.92)" }}
          sizes="(max-width: 640px) 100vw, 560px"
        />
      </div>

      {/* Letterbox bars */}
      <div className="absolute top-0 inset-x-0 pointer-events-none" style={{ height: "13%" }} />
      <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{ height: "13%" }} />
      <div
        className="absolute top-0 inset-x-0 pointer-events-none"
        style={{ height: "13%", background: "#050E21" }}
      />
      <div
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        style={{ height: "13%", background: "#050E21" }}
      />

      {/* Cinematic vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 35%, rgba(5,14,33,0.55) 75%, rgba(5,14,33,0.88) 100%)",
        }}
      />

      {/* Bottom bleed into page */}
      <div
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        style={{ height: 72, background: "linear-gradient(to top, #050E21 30%, transparent)" }}
      />

      {/* Per-package colour tint */}
      {tint && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 60% 40%, ${tint} 0%, transparent 70%)` }}
        />
      )}

      {/* Ambient blue rim — left edge */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 35% 70% at 0% 55%, rgba(26,95,212,0.16) 0%, transparent 70%)",
        }}
      />

      {/* Gold shimmer sweep for Daily package */}
      {shimmer && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="cinema-shimmer absolute top-0 bottom-0 w-12" style={{
            background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.18), transparent)",
          }} />
        </div>
      )}

      {/* Animated light streak */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="cinema-streak absolute top-0 bottom-0 w-16" style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)",
          transform: "skewX(-12deg)",
        }} />
      </div>

      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1.0)  translate(0%,     0%);    }
          40%  { transform: scale(1.07) translate(-1.2%,  0.4%);  }
          70%  { transform: scale(1.04) translate( 1.0%, -0.3%);  }
          100% { transform: scale(1.0)  translate(0%,     0%);    }
        }
        .cinema-kb {
          animation: kenBurns 14s ease-in-out infinite;
        }
        @keyframes shimmerSweep {
          0%   { left: -8%; }
          100% { left: 108%; }
        }
        .cinema-shimmer {
          animation: shimmerSweep 2.8s ease-in-out infinite;
        }
        @keyframes streakSweep {
          0%,60% { left: -12%; opacity: 0; }
          65%    { opacity: 1; }
          85%    { opacity: 0; left: 108%; }
          100%   { left: 108%; opacity: 0; }
        }
        .cinema-streak {
          animation: streakSweep 9s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
