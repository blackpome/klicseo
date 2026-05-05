"use client";

import { Droplets, Sparkles, Shield, Zap, Car, Wind } from "lucide-react";
import { useRef, useState, MouseEvent } from "react";
import { motion } from "framer-motion";

const services = [
  {
    icon: Droplets,
    title: "Exterior Wash",
    description: "Full exterior hand wash with premium pH-balanced soap, wheel cleaning, and spot-free rinse.",
    highlight: false,
  },
  {
    icon: Sparkles,
    title: "Interior Detail",
    description: "Deep vacuum, leather conditioning, dashboard polish, and odor elimination for a showroom finish.",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Ceramic Coating",
    description: "Professional-grade ceramic protection that repels water, dirt, and UV rays for years.",
    highlight: false,
  },
  {
    icon: Car,
    title: "Full Detail",
    description: "Complete top-to-bottom transformation — paint correction, interior deep clean, and sealant.",
    highlight: false,
  },
  {
    icon: Zap,
    title: "Express Wash",
    description: "Quick 15-minute premium wash for busy schedules. No compromise on quality.",
    highlight: false,
  },
  {
    icon: Wind,
    title: "Engine Bay Clean",
    description: "Safe degreaser treatment and detailing of your engine bay for optimal performance and looks.",
    highlight: false,
  },
];

function TiltCard({ children, highlight }: { children: React.ReactNode; highlight: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, glareOpacity: 0 });

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    setStyle({
      rotateX: (0.5 - y) * 16,
      rotateY: (x - 0.5) * 16,
      glareX: x * 100,
      glareY: y * 100,
      glareOpacity: 0.12,
    });
  }

  function onMouseLeave() {
    setStyle({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, glareOpacity: 0 });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ perspective: "900px" }}
    >
      <div
        style={{
          transform: `rotateX(${style.rotateX}deg) rotateY(${style.rotateY}deg)`,
          transition: "transform 0.12s ease-out",
          transformStyle: "preserve-3d",
          position: "relative",
          overflow: "hidden",
          background: highlight ? "linear-gradient(145deg,#1A5FD4 0%,#0D3D8E 100%)" : undefined,
          borderRadius: "1rem",
        }}
        className={`p-6 sm:p-7 h-full ${
          highlight
            ? "border border-[#1A5FD4] shadow-[0_8px_32px_rgba(26,95,212,0.35)]"
            : "glass-card hover:border-[#1A5FD4]/30"
        }`}
      >
        {/* Glare overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${style.glareX}% ${style.glareY}%, rgba(255,255,255,${style.glareOpacity}) 0%, transparent 65%)`,
            transition: "opacity 0.15s",
          }}
        />

        {children}
      </div>
    </div>
  );
}

export default function Services() {
  return (
    <section id="services" className="relative py-20 sm:py-28 px-4">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(13,61,142,0.12) 0%, transparent 70%)",
      }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">What We Offer</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
            Premium Services
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Every service is performed by trained professionals using the finest products.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
                className="relative pt-3"
              >
                {/* Badge outside TiltCard so overflow:hidden doesn't clip it */}
                {service.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#050E21] whitespace-nowrap"
                      style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}
                <TiltCard highlight={service.highlight}>

                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 transition-colors duration-300 ${
                    service.highlight ? "bg-white/20" : "bg-[#1A5FD4]/15"
                  }`}>
                    <Icon size={22} className={service.highlight ? "text-white" : "text-[#C9A84C]"} />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
                    {service.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${service.highlight ? "text-white/80" : "text-white/50"}`}>
                    {service.description}
                  </p>

                  <div className={`mt-5 text-sm font-semibold flex items-center gap-1 ${
                    service.highlight ? "text-[#E8CC7A]" : "text-[#C9A84C]"
                  } transition-all duration-200`}>
                    Learn more <span>→</span>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
