"use client";

import Image from "next/image";
import { Globe, Share2, ExternalLink, MapPin, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { businessEmail, primaryCity, serviceAreaText } from "@/lib/seo";
import { useSiteSettings } from "./SiteSettingsContext";

const footerLinks = {
  Services: ["Exterior Wash", "Interior Detail", "Ceramic Coating", "Full Detail", "Express Wash", "Engine Bay Clean"],
  Company:  ["About Us", "Our Team", "Careers", "Blog", "Press"],
  Support:  ["Contact Us", "FAQs", "Pricing", "Terms of Service", "Privacy Policy"],
};

export default function Footer() {
  const { phone: businessPhone } = useSiteSettings();
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="col-span-2 lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                whileHover={{ rotate: 8, scale: 1.06 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-[#1A5FD4]/40"
              >
                <Image src="/Logo.png" alt="Klicseo" fill className="object-cover" sizes="44px" />
              </motion.div>
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

            {/* Social — magnetic hover */}
            <div className="flex gap-3">
              {[Globe, Share2, ExternalLink].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.15, y: -3, rotate: -4 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 380, damping: 18 }}
                  className="w-9 h-9 rounded-lg glass-card flex items-center justify-center text-white/40 hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-colors duration-200"
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Nav columns */}
          {Object.entries(footerLinks).map(([title, links], colIdx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.1 + colIdx * 0.08 }}
            >
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
            </motion.div>
          ))}
        </div>

        {/* Contact row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 mb-10"
        >
          {[
            { icon: MapPin, text: `${primaryCity} · ${serviceAreaText}`, href: undefined },
            { icon: Phone, text: businessPhone, href: `tel:${businessPhone.replace(/\s+/g, "")}` },
            { icon: Mail, text: businessEmail, href: `mailto:${businessEmail}` },
          ].map(({ icon: Icon, text, href }) => {
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
        </motion.div>

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
