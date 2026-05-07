"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone } from "lucide-react";
import { motion, useScroll, useSpring } from "framer-motion";

const navLinks = [
  { label: "Services",     hash: "services"     },
  { label: "How It Works", hash: "how-it-works" },
  { label: "Pricing",      hash: "pricing"      },
  { label: "Testimonials", hash: "testimonials" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pathname = usePathname();
  const onHome = pathname === "/";

  // From the home page, use bare hash so the browser scrolls in place.
  // From any other route, prefix with "/" so we route home + scroll on landing.
  const hrefFor = (hash: string) => (onHome ? `#${hash}` : `/#${hash}`);

  // Page-scroll progress bar (top of viewport)
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver for active section — only meaningful on the home page
  // where the sections actually exist. Skip entirely on other routes.
  useEffect(() => {
    if (!onHome) {
      setActiveId(null);
      return;
    }
    const sections = navLinks
      .map((l) => document.getElementById(l.hash))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry most in view
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [onHome]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#050E21]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] border-b border-[#1A5FD4]/20"
          : "bg-transparent"
      }`}
    >
      {/* Scroll progress strip */}
      <motion.div
        className="absolute left-0 right-0 top-0 h-[2px] origin-left"
        style={{
          scaleX,
          background: "linear-gradient(90deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
          boxShadow: "0 0 10px rgba(201,168,76,0.6)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.06 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-[#1A5FD4]/40 group-hover:ring-[#C9A84C]/60 transition-shadow duration-300"
            >
              <Image
                src="/Logo.png"
                alt="Klicseo Logo"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 640px) 40px, 48px"
              />
            </motion.div>
            <span
              className="text-lg sm:text-xl font-bold tracking-wide text-white group-hover:text-[#C9A84C] transition-colors duration-300"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Klicseo
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const active = onHome && activeId === link.hash;
              return (
                <Link
                  key={link.label}
                  href={hrefFor(link.hash)}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    active ? "text-white" : "text-white/65 hover:text-white"
                  }`}
                >
                  {/* Active pill — slides between links */}
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-md bg-[#1A5FD4]/15 border border-[#1A5FD4]/30"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                  <span
                    className={`absolute -bottom-0.5 left-3 right-3 h-px bg-[#C9A84C] transition-transform duration-300 origin-left ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* CTA + mobile menu */}
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/booking"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#050E21] shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:shadow-[0_8px_28px_rgba(201,168,76,0.6)] transition-shadow duration-300"
                style={{
                  background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)",
                }}
              >
                <Phone size={14} />
                Book Now
              </Link>
            </motion.div>

            <button
              className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#071F4A]/95 backdrop-blur-md border-t border-[#1A5FD4]/20 px-4 py-4 space-y-1">
          {navLinks.map((link, i) => (
            <motion.div
              key={link.label}
              initial={false}
              animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.25, delay: isOpen ? i * 0.04 : 0 }}
            >
              <Link
                href={hrefFor(link.hash)}
                onClick={() => setIsOpen(false)}
                className="block py-3 px-4 text-white/80 hover:text-white hover:bg-[#1A5FD4]/20 rounded-lg transition-colors font-medium"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
          <Link
            href="/booking"
            className="flex items-center justify-center gap-2 mt-3 py-3 px-4 rounded-lg font-semibold text-[#050E21]"
            style={{
              background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)",
            }}
            onClick={() => setIsOpen(false)}
          >
            <Phone size={16} />
            Book Now
          </Link>
        </div>
      </div>
    </header>
  );
}
