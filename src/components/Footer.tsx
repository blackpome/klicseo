"use client";

import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";
import { FaInstagram, FaFacebook, FaYoutube, FaXTwitter, FaWhatsapp, FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { businessEmail, primaryCity, serviceAreaText } from "@/lib/seo";
import { useSiteSettings } from "./SiteSettingsContext";
import { SOCIAL_PLATFORMS, type SocialKey } from "@/lib/site-settings-shared";

const SOCIAL_ICON: Record<SocialKey, IconType> = {
  instagram: FaInstagram,
  facebook: FaFacebook,
  youtube: FaYoutube,
  x: FaXTwitter,
  whatsapp: FaWhatsapp,
  linkedin: FaLinkedin,
};

// Each platform's official brand color, applied as the tile background.
// Instagram uses its signature radial gradient; X is black (its official mark
// on light surfaces) — we keep a faint ring so it reads on the dark footer.
const SOCIAL_BG: Record<SocialKey, string> = {
  instagram:
    "radial-gradient(circle at 30% 110%, #FFDB7A 0%, #FFC758 8%, #F09433 25%, #E6683C 45%, #DC2743 60%, #CC2366 75%, #BC1888 90%)",
  facebook: "#1877F2",
  youtube: "#FF0000",
  x: "#000000",
  whatsapp: "#25D366",
  linkedin: "#0A66C2",
};

const footerLinks = {
  Services: ["Exterior Wash", "Interior Detail", "Ceramic Coating", "Full Detail", "Express Wash", "Engine Bay Clean"],
  Company:  ["About Us", "Our Team", "Careers", "Blog", "Press"],
  Support:  ["Contact Us", "FAQs", "Pricing", "Terms of Service", "Privacy Policy"],
};

export default function Footer() {
  const { phone: businessPhone, social, footerLocation } = useSiteSettings();
  const socialLinks = SOCIAL_PLATFORMS.filter((p) => social[p.key].enabled && social[p.key].url.trim());
  const locationText = footerLocation.text.trim() || `${primaryCity} · ${serviceAreaText}`;
  const showLocation = footerLocation.enabled;
  return (
    <footer className="relative border-t border-white/5">
      <div className="divider-gold" />

      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(7,31,74,0.3) 0%, #050E21 100%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-[#1A5FD4]/40 transition-transform hover:rotate-6 hover:scale-105">
                <Image src="/Logo.png" alt="Klicseo" fill className="object-cover" sizes="44px" />
              </div>
              <span
                className="text-xl font-bold text-white"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Klicseo
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-[260px] mb-6">
              Premium car wash and detailing service. We bring the luxury
              experience to your doorstep.
            </p>

            {/* Social — only the platforms toggled on in admin */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((p) => {
                  const Icon = SOCIAL_ICON[p.key];
                  return (
                    <a
                      key={p.key}
                      href={social[p.key].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={p.label}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white ring-1 ring-white/10 shadow-sm transition-transform hover:-translate-y-0.5 hover:scale-110 active:scale-95"
                      style={{ background: SOCIAL_BG[p.key] }}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nav columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-[0.15em] mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="group inline-flex items-center text-sm text-white/40 hover:text-white transition-colors duration-200"
                    >
                      <span
                        className="block h-px w-0 bg-[#C9A84C] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"
                      />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact row */}
        <div
          className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 mb-10"
        >
          {[
            showLocation ? { icon: MapPin, text: locationText, href: undefined } : null,
            { icon: Phone, text: businessPhone, href: `tel:${businessPhone.replace(/\s+/g, "")}` },
            { icon: Mail, text: businessEmail, href: `mailto:${businessEmail}` },
          ].filter((r): r is { icon: typeof MapPin; text: string; href: string | undefined } => r !== null).map(({ icon: Icon, text, href }) => {
            const inner = (
              <>
                <Icon size={15} className="text-[#C9A84C] flex-shrink-0" />
                <span>{text}</span>
              </>
            );
            return href ? (
              <a key={text} href={href} className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white transition-colors">
                {inner}
              </a>
            ) : (
              <div key={text} className="flex items-center gap-2.5 text-sm text-white/50">
                {inner}
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Klicseo. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">
            Crafted with care for your vehicle
          </p>
        </div>
      </div>
    </footer>
  );
}
