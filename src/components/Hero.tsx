"use client";

import Image from "next/image";
import { ChevronDown, Star, Shield, Clock } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import BubbleParticles from "./BubbleParticles";
import Magnetic from "./Magnetic";
import AnimatedHeading from "./AnimatedHeading";
import { useSiteSettings } from "./SiteSettingsContext";
import { resolveMedia } from "@/lib/site-settings-shared";

const stats = [
  { value: "2,500+", label: "Cars Washed" },
  { value: "4.9★", label: "Average Rating" },
  { value: "100%", label: "Satisfaction" },
];

// Smooth-scroll in-page anchor clicks. Native `href="#id"` navigation computes
// the target offset from the *current* layout — but the marketing page's
// `cv-section` wrappers (content-visibility: auto) reserve a placeholder
// height for sections that haven't been rendered yet. On mobile, that
// placeholder is shorter than the real section, so clicking `#pricing` from
// the hero lands inside HowItWorks instead. `scrollIntoView` forces a layout
// pass that expands intermediate sections to their real height first.
function smoothAnchorClick(e: React.MouseEvent<HTMLAnchorElement>) {
  const href = e.currentTarget.getAttribute("href") ?? "";
  if (!href.startsWith("#") || href.length < 2) return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Keep the URL in sync so back/forward + share-the-link still work.
  if (history.pushState) history.pushState(null, "", href);
}

// Hero background plays these in sequence, looping back to the first when the
// last finishes. Files live in /public.
export default function Hero() {
  const { startPrice, media } = useSiteSettings();
  const hero = resolveMedia(media, "heroVideo");
  const heroSrc = hero.url;
  // For the bundled defaults we ship a same-name JPG poster so the LCP frame
  // paints instantly (~70 KB) instead of waiting on the 2 MB video. Admin
  // uploads fall back to no poster.
  const heroPoster = /^\/car-detail-\d+\.mp4$/.test(heroSrc)
    ? heroSrc.replace(/\.mp4$/, ".jpg")
    : undefined;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Kick off autoplay. Browser autoplay rules require muted + playsInline (set
  // on the element below). On iOS Safari, if autoPlay doesn't fire we retry on
  // the first user interaction so the dirt→clean reveal still plays on mobile.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const onInteract = () => tryPlay();
    window.addEventListener("touchstart", onInteract, { once: true, passive: true });
    window.addEventListener("scroll", onInteract, { once: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("scroll", onInteract);
    };
  }, [heroSrc]);

  // Mouse parallax — drives logo & orbs with subtle depth
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  // Logo: small offset (foreground)
  const logoX = useTransform(sx, (v) => v * 18);
  const logoY = useTransform(sy, (v) => v * 18);
  // Orbs: stronger offset (parallax background, opposite direction = depth feel)
  const orbAX = useTransform(sx, (v) => v * -40);
  const orbAY = useTransform(sy, (v) => v * -40);
  const orbBX = useTransform(sx, (v) => v * -55);
  const orbBY = useTransform(sy, (v) => v * -55);

  useEffect(() => {
    // Parallax is mouse-only; skip on touch devices (where mousemove fires
    // synthetically on every tap) and when the OS asks for reduced motion.
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduce) return;
    let raf = 0;
    let nextX = 0;
    let nextY = 0;
    const apply = () => {
      raf = 0;
      mx.set(nextX);
      my.set(nextY);
    };
    const onMove = (e: MouseEvent) => {
      nextX = (e.clientX / window.innerWidth) - 0.5;
      nextY = (e.clientY / window.innerHeight) - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mx, my]);

  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden px-4 pb-0">

      {/* Backgrounds */}
      <div className="absolute inset-0 bg-[#050E21]" />

      {/* Cinematic detailing video — a single looping clip (managed in admin). */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute inset-0 pointer-events-none"
      >
        {hero.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={heroSrc} src={heroSrc} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <video
            key={heroSrc}
            ref={(el) => {
              videoRef.current = el;
              // iOS Safari only honours autoplay if `muted` is the DOM *property*
              // (not just the attribute React sets via JSX).
              if (el) {
                el.muted = true;
                el.defaultMuted = true;
              }
            }}
            src={heroSrc}
            muted
            loop
            autoPlay
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            poster={heroPoster}
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </motion.div>

      {/* Top + bottom vignette: a moody dark band at the very top and bottom
          of the frame (deep enough to hide the source watermark in either
          corner) while the middle stays clear so the dirt-to-clean
          transformation footage still reads. Bottom also keeps the
          headline / CTAs / stats legible. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #050E21 0%, rgba(5,14,33,0.95) 9%, rgba(5,14,33,0.6) 18%, rgba(5,14,33,0.3) 38%, rgba(5,14,33,0.75) 68%, rgba(5,14,33,0.98) 88%, #050E21 100%)",
        }}
      />

      {/* Radial edge vignette — fades the video into the navy on all four
          edges (left/right included) so the footage has no hard borders. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 80% at 50% 45%, transparent 40%, rgba(5,14,33,0.45) 75%, rgba(5,14,33,0.85) 100%)",
        }}
      />

      {/* Brand radial accents — kept light so the video stays visible. */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,95,212,0.18) 0%, transparent 70%)",
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 50% 40% at 80% 80%, rgba(13,61,142,0.10) 0%, transparent 60%)",
      }} />

      {/* Orbs — parallax */}
      <motion.div
        style={{ x: orbAX, y: orbAY }}
        className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-[#1A5FD4]/10 blur-3xl pointer-events-none animate-float"
      />
      <motion.div
        style={{ x: orbBX, y: orbBY, animationDelay: "1.5s" }}
        className="absolute bottom-1/3 -right-20 w-80 h-80 rounded-full bg-[#0D3D8E]/15 blur-3xl pointer-events-none animate-float"
      />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Bubbles */}
      <BubbleParticles count={32} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center pt-24 pb-16">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 glass-blue text-sm font-medium text-white/80"
        >
          <Star size={14} className="text-[#C9A84C]" fill="#C9A84C" />
          Premium Doorstep Car Care
          <Star size={14} className="text-[#C9A84C]" fill="#C9A84C" />
        </motion.div>

        {/* Logo — parallax + ambient pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          style={{ x: logoX, y: logoY }}
          className="flex justify-center mb-8 animate-float"
        >
          <motion.div
            whileHover={{ scale: 1.06, rotate: 4 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-[#1A5FD4]/30 shadow-[0_0_60px_rgba(26,95,212,0.4)]"
          >
            <Image src="/Logo.png" alt="Klicseo" fill className="object-cover" priority sizes="(max-width: 640px) 96px, 128px" />
            {/* Sweeping shine */}
            <div
              className="absolute inset-0 pointer-events-none opacity-50"
              style={{
                background: "linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)",
                backgroundSize: "200% 200%",
                animation: "logoShine 4s linear infinite",
              }}
            />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <AnimatedHeading
          as="h1"
          trigger="mount"
          delay={0.35}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
          shimmerClassName="hero-accent"
          lines={[
            { text: "Luxury Car Care," },
            { text: "At Your Doorstep", shimmer: true },
          ]}
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          No queues, no driving out. Our detailing studio comes to your
          doorstep — washing, detailing, and protecting your car with showroom
          precision while it stays right where you parked it.
        </motion.p>

        {/* Hero "Book Now from ₹19" pill. Background is a single brand-blue
            fill (no gradient) for a cleaner, more confident look on the
            page; the ₹19 stays solid premium red so the price is the only
            chromatic accent inside the button. Padding is generous and the
            row is items-center so the big number and small copy share a
            common vertical axis. */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
          className="flex justify-center mb-5"
        >
          <Magnetic className="w-full sm:w-auto">
            <div className="relative inline-block w-full sm:w-auto">
              {/* Warm aura behind the pill — breathing halo matching the
                  offer badge's red→amber treatment. */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={{ opacity: [0.4, 0.65, 0.4], scale: [1, 1.05, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  background: "rgba(249,115,22,0.6)",
                  filter: "blur(24px)",
                }}
              />
              <motion.a
                href="/booking?package=Daily"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className="relative w-full sm:w-auto inline-flex items-center justify-center text-center px-10 sm:px-12 py-5 sm:py-6 rounded-full font-semibold text-base text-white overflow-hidden transition-shadow duration-300"
                style={{
                  // Offer-badge look: solid red→amber gradient with a warm
                  // glow and a subtle top highlight so the pill reads as the
                  // headline deal.
                  background: "linear-gradient(135deg, #DC2626 0%, #F97316 100%)",
                  boxShadow:
                    "0 10px 34px rgba(220,38,38,0.50), 0 0 0 1px rgba(255,255,255,0.18) inset, 0 1px 0 rgba(255,255,255,0.35) inset",
                }}
              >
                {/* Diagonal shimmer sweep — kept for the catchy glint */}
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
                  initial={{ x: "-100%" }}
                  animate={{ x: "400%" }}
                  transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
                  style={{
                    background:
                      "linear-gradient(75deg, transparent 0%, rgba(255,255,255,0.30) 50%, transparent 100%)",
                    filter: "blur(4px)",
                  }}
                />
                <span className="relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap">
                  <motion.span
                    aria-hidden
                    animate={{ scale: [1, 1.18, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex flex-shrink-0"
                  >
                    {/* <Flame size={20} fill="#FFE08A" className="text-[#FFE08A]" /> */}
                  </motion.span>
                  <span className="inline-flex flex-col items-start leading-none">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/85 mb-0.5">
                      Doorstep Car Wash
                    </span>
                    <span className="leading-none">Book Now · Starts @ </span>
                  </span>
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block text-4xl sm:text-5xl font-extrabold leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                    style={{ fontFamily: "var(--font-playfair)", color: "#FFFFFF" }}
                  >
                    ₹{startPrice}
                  </motion.span>
                  <span className="leading-none text-white/85">/day</span>
                </span>
              </motion.a>
            </div>
          </Magnetic>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <Magnetic className="w-full sm:w-auto">
            <motion.a
              href="#pricing"
              onClick={smoothAnchorClick}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base text-[#050E21] shadow-[0_4px_24px_rgba(201,168,76,0.4)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.6)] transition-shadow duration-300"
              style={{ background: "linear-gradient(135deg,#9C7A2A 0%,#C9A84C 50%,#E8CC7A 100%)" }}
            >
              Pricing
            </motion.a>
          </Magnetic>
          <Magnetic className="w-full sm:w-auto">
            <motion.a
              href="#services"
              onClick={smoothAnchorClick}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base text-white glass-blue hover:bg-[#1A5FD4]/25 transition-colors duration-300"
            >
              Explore Services
            </motion.a>
          </Magnetic>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-center gap-6 mb-14"
        >
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Shield size={16} className="text-[#C9A84C]" />
            Insured & Bonded
          </div>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Clock size={16} className="text-[#C9A84C]" />
            Same-Day Service
          </div>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Star size={16} className="text-[#C9A84C]" fill="#C9A84C" />
            5-Star Rated
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="text-center cursor-default"
            >
              <div className="text-2xl sm:text-3xl font-bold gold-shimmer mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#services"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 mb-8 flex flex-col items-center gap-1 text-white/30 hover:text-[#C9A84C] transition-colors"
      >
        <span className="text-xs tracking-widest uppercase">Discover</span>
        <ChevronDown size={20} />
      </motion.a>

      <style>{`
        @keyframes logoShine {
          0%   { background-position: -100% -100%; }
          100% { background-position: 200% 200%; }
        }
      `}</style>
    </section>
  );
}
