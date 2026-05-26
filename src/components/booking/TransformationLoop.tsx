"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { resolveMedia } from "@/lib/site-settings-shared";

interface Props {
  // Overrides the admin-managed package media if provided (always a video).
  src?: string;
  // Optional caption rendered under the frame in gold tracking-wide caps.
  label?: string;
}

export default function TransformationLoop({ src, label }: Props) {
  const { media } = useSiteSettings();
  const resolved = resolveMedia(media, "packageVideo");
  const videoSrc = src ?? resolved.url;
  const isImage = !src && resolved.type === "image";
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // iOS Safari only respects autoplay if `muted` is the DOM property — not
    // just the JSX attribute React serialises. Same trick used in the hero.
    v.muted = true;
    v.defaultMuted = true;
    v.play().catch(() => {});
  }, [videoSrc, isImage]);

  return (
    <div className="relative">
      {/* Soft gold halo behind the video frame so the rounded card reads as
          "premium" and ties into the gold accents in the rest of the wizard. */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 50% 65%, rgba(201,168,76,0.28) 0%, transparent 70%)",
          filter: "blur(22px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative rounded-2xl overflow-hidden border border-[#C9A84C]/30 shadow-[0_8px_32px_rgba(201,168,76,0.18)]"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={videoSrc} alt="" aria-hidden className="w-full h-[260px] sm:h-[320px] object-cover" />
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            autoPlay
            loop
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            poster="/car_wash.jpeg"
            aria-hidden
            className="w-full h-[260px] sm:h-[320px] object-cover"
          />
        )}

        {/* Bottom vignette so the brand pill below stays readable on bright
            frames of the video. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 55%, rgba(5,14,33,0.55) 100%)",
          }}
        />

        {/* Top-left caption — anchors the video to the brand and tells the
            user what they're looking at. */}
        <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-black/45 backdrop-blur-md border border-[#C9A84C]/30 text-[9px] font-bold tracking-[0.18em] uppercase text-[#C9A84C]">
          Dirt → Spotless
        </div>
      </motion.div>

      {label && (
        <motion.p
          key={`label-${label}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center text-xs font-semibold tracking-[0.18em] uppercase mt-3 text-[#C9A84C]"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
