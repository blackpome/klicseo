"use client";

import Image from "next/image";
import { ChevronDown, Star, Shield, Clock } from "lucide-react";

const stats = [
  { value: "2,500+", label: "Cars Washed" },
  { value: "4.9★", label: "Average Rating" },
  { value: "100%", label: "Satisfaction" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Deep layered background */}
      <div className="absolute inset-0 bg-[#050E21]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,95,212,0.35) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 80% 80%, rgba(13,61,142,0.2) 0%, transparent 60%)",
        }}
      />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-[#1A5FD4]/10 blur-3xl animate-float" />
      <div
        className="absolute bottom-1/3 -right-20 w-80 h-80 rounded-full bg-[#0D3D8E]/15 blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      {/* Grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 glass-blue text-sm font-medium text-white/80 animate-fade-up">
          <Star size={14} className="text-[#C9A84C]" fill="#C9A84C" />
          Premium Car Wash & Detailing Service
          <Star size={14} className="text-[#C9A84C]" fill="#C9A84C" />
        </div>

        {/* Logo mark */}
        <div className="flex justify-center mb-8 animate-float">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-[#1A5FD4]/30 shadow-[0_0_60px_rgba(26,95,212,0.4)]">
            <Image
              src="/Logo.png"
              alt="Klicseo"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-4 animate-fade-up"
          style={{ fontFamily: "var(--font-playfair)", animationDelay: "0.1s", opacity: 0 }}
        >
          Your Car Deserves{" "}
          <span className="block gold-shimmer">Luxury Care</span>
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.2s", opacity: 0 }}
        >
          Experience the finest car wash and detailing service. We treat every
          vehicle with the precision and care it deserves — leaving it
          immaculate, every time.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 animate-fade-up"
          style={{ animationDelay: "0.3s", opacity: 0 }}
        >
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base text-[#050E21] shadow-[0_4px_24px_rgba(201,168,76,0.4)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.6)] hover:scale-105 transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
            }}
          >
            Book Your Wash
          </a>
          <a
            href="#services"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-base text-white glass-blue hover:bg-[#1A5FD4]/25 hover:scale-105 transition-all duration-300"
          >
            Explore Services
          </a>
        </div>

        {/* Trust badges */}
        <div
          className="flex flex-wrap items-center justify-center gap-6 mb-14 animate-fade-up"
          style={{ animationDelay: "0.4s", opacity: 0 }}
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
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-4 max-w-lg mx-auto animate-fade-up"
          style={{ animationDelay: "0.5s", opacity: 0 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-2xl sm:text-3xl font-bold gold-shimmer mb-1"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#services"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 hover:text-[#C9A84C] transition-colors animate-float"
      >
        <span className="text-xs tracking-widest uppercase">Discover</span>
        <ChevronDown size={20} />
      </a>
    </section>
  );
}
