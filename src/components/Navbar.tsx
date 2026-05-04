"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#050E21]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] border-b border-[#1A5FD4]/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-[#1A5FD4]/40 group-hover:ring-[#C9A84C]/60 transition-all duration-300">
              <Image
                src="/Logo.png"
                alt="Klicseo Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span
              className="text-lg sm:text-xl font-bold tracking-wide text-white group-hover:text-[#C9A84C] transition-colors duration-300"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Klicseo
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#C9A84C] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* CTA + mobile menu */}
          <div className="flex items-center gap-3">
            <a
              href="tel:+1234567890"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#050E21] transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)]"
              style={{
                background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)",
              }}
            >
              <Phone size={14} />
              Book Now
            </a>

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
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block py-3 px-4 text-white/80 hover:text-white hover:bg-[#1A5FD4]/20 rounded-lg transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}
          <a
            href="tel:+1234567890"
            className="flex items-center justify-center gap-2 mt-3 py-3 px-4 rounded-lg font-semibold text-[#050E21]"
            style={{
              background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)",
            }}
          >
            <Phone size={16} />
            Book Now
          </a>
        </div>
      </div>
    </header>
  );
}
