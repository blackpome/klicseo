"use client";

import { Droplets, Sparkles, Car, CalendarDays, Building2, Gift } from "lucide-react";
import { useRef, useState, MouseEvent } from "react";
import { motion } from "framer-motion";
import { SUPPORT_PHONE } from "@/lib/serviceability";
import AnimatedHeading from "./AnimatedHeading";

const phoneDigits = SUPPORT_PHONE.replace(/[\s()\-+]/g, "");

const services = [
  {
    icon: Sparkles,
    title: "Car Detailing",
    description: "Premium ceramic sealant (6-9 month durability, 3 month top-up important). Uses top chemicals to clear swirl marks & minor scratches. Includes tire polish & glass cleaning.",
    highlight: true,
  },
  {
    icon: Car,
    title: "Interior Detailing",
    description: "Foam wash for fabric or specialized chemical clean for leather. Includes dashboard polish, roof, floor, mat, dicky, and AC vent deep cleaning.",
    highlight: false,
  },
  {
    icon: Droplets,
    title: "One Time Wash",
    description: "Choose between manual bucket wash or pressure foam wash. Clears major dirt safely without scratches. Includes tire polish and glass cleaning.",
    highlight: false,
  },
  {
    icon: CalendarDays,
    title: "Monthly Subscription",
    description: "Regular dust removal via wet cloth wipe method, plus monthly once mat cleaning. (Interior deep cleaning available with extra charges).",
    highlight: false,
  },
  {
    icon: Building2,
    title: "Bulk Apartment Cleaning",
    description: "Convenient and cost-effective bulk car wash solutions for apartments and gated communities. Professional service right at your doorstep.",
    highlight: false,
  },
  {
    icon: Gift,
    title: "Referrals",
    description: "Refer for Detailing: Get one free pressure wash. Refer for Monthly Subscription: Get ₹100 discount or cashback.",
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
        className={`p-6 sm:p-7 h-full ${highlight
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
          <AnimatedHeading
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
            lines={[{ text: "Premium Services" }]}
          />
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Every service is performed at your doorstep by trained professionals using the finest products.
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

                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 transition-colors duration-300 ${service.highlight ? "bg-white/20" : "bg-[#1A5FD4]/15"
                    }`}>
                    <Icon size={22} className={service.highlight ? "text-white" : "text-[#C9A84C]"} />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
                    {service.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${service.highlight ? "text-white/80" : "text-white/50"}`}>
                    {service.description}
                  </p>

                  <a
                    href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent("Hi Klicseo, I'd like to learn more about the " + service.title + " service.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-5 text-sm font-semibold inline-flex items-center gap-1 ${service.highlight ? "text-[#E8CC7A]" : "text-[#C9A84C]"
                      } transition-all duration-200 hover:opacity-80`}
                  >
                    Learn more <span>→</span>
                  </a>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
