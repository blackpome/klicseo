"use client";

import { Star, Quote } from "lucide-react";
import { useRef, useState, MouseEvent } from "react";
import { motion, useSpring } from "framer-motion";
import AnimatedHeading from "./AnimatedHeading";

const testimonials = [
  {
    name: "Dinesh K.",
    vehicle: "Hyundai Creta",
    rating: 5,
    text: "Absolutely incredible service. My Creta looked better than the day I picked it up from the dealership. The attention to detail is unmatched.",
    initials: "DK",
  },
  {
    name: "Lakshmi N.",
    vehicle: "Honda City",
    rating: 5,
    text: "I booked the Prestige package and couldn't be happier. The team was professional, punctual, and the ceramic coating result is stunning.",
    initials: "LN",
  },
  {
    name: "Arun V.",
    vehicle: "Tata Nexon",
    rating: 5,
    text: "The doorstep service is a game-changer. They came to my office, and when I finished work, my car was immaculate. Will never go to a regular wash again.",
    initials: "AV",
  },
  {
    name: "Kavya S.",
    vehicle: "Maruti Swift",
    rating: 5,
    text: "Genuinely the best car wash experience I've had. Professional, thorough, and they treated my Swift with the care it deserves.",
    initials: "KS",
  },
  {
    name: "Senthil K.",
    vehicle: "Toyota Innova",
    rating: 5,
    text: "Used Klicseo three times now. Consistent quality every single visit. The Premium package for my Innova is worth every rupee.",
    initials: "SK",
  },
  {
    name: "Divya R.",
    vehicle: "Hyundai i20",
    rating: 5,
    text: "The paint decontamination and clay bar treatment on my i20 was flawless. You can tell these guys genuinely love what they do.",
    initials: "DR",
  },
];

function TiltTestimonial({
  t,
  index,
}: {
  t: typeof testimonials[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    rx.set((0.5 - y) * 6);
    ry.set((x - 0.5) * 6);
    setGlare({ x: x * 100, y: y * 100, o: 0.1 });
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
    setGlare({ x: 50, y: 50, o: 0 });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "1000px" }}
      className="group"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative glass-card rounded-2xl p-6 hover:border-[#1A5FD4]/30 transition-colors duration-300 h-full"
      >
        {/* Glare */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.o}) 0%, transparent 60%)`,
            transition: "opacity 0.18s ease",
          }}
        />

        <div className="relative" style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.08, rotate: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1A5FD4, #0D3D8E)" }}
              >
                {t.initials}
              </motion.div>
              <div>
                <div className="font-semibold text-white text-sm">{t.name}</div>
                <div className="text-white/40 text-xs">{t.vehicle}</div>
              </div>
            </div>
            <Quote
              size={18}
              className="text-[#C9A84C]/40 group-hover:text-[#C9A84C]/80 transition-colors flex-shrink-0"
            />
          </div>

          {/* Stars — pop in one by one */}
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: t.rating }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.08 + 0.25 + i * 0.05,
                  type: "spring",
                  stiffness: 320,
                }}
              >
                <Star size={13} className="text-[#C9A84C]" fill="#C9A84C" />
              </motion.div>
            ))}
          </div>

          <p className="text-white/60 text-sm leading-relaxed">{t.text}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-20 sm:py-28 px-4">
      <div className="absolute inset-0 bg-[#071F4A]/30" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(13,61,142,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Client Stories
          </p>
          <AnimatedHeading
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
            lines={[{ text: "What Our Clients Say" }]}
          />
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of satisfied customers who trust Klicseo with their
            prized vehicles.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </motion.div>

        {/* Overall rating */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: -8, rotate: -20 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07, type: "spring", stiffness: 260 }}
              >
                <Star size={20} className="text-[#C9A84C]" fill="#C9A84C" />
              </motion.div>
            ))}
          </div>
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            4.9
          </span>
          <span className="text-white/40 text-sm">from 480+ reviews</span>
        </motion.div>

        {/* Testimonial grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <TiltTestimonial key={t.name} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
