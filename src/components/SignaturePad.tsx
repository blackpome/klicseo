"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

// Drawn-signature pad. Exposes the current strokes as a PNG data URL via
// `onChange`, called whenever the user lifts the pen / clears. Handles mouse
// + touch input; HiDPI-aware via devicePixelRatio.
export default function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#ffffff";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function pointFrom(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    last.current = pointFrom(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pointFrom(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  }

  function onUp() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    emit();
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasInk) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      <div
        className="relative rounded-lg border border-white/15 bg-white/[0.03] overflow-hidden touch-none"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
        {!hasInk && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/30 text-sm">
            Sign here
          </div>
        )}
      </div>
      <div className="flex justify-end mt-1">
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-white"
        >
          <Eraser size={11} /> Clear
        </button>
      </div>
    </div>
  );
}
