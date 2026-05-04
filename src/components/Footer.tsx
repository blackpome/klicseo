import Image from "next/image";
import { Globe, Share2, ExternalLink, MapPin, Phone, Mail } from "lucide-react";

const footerLinks = {
  Services: ["Exterior Wash", "Interior Detail", "Ceramic Coating", "Full Detail", "Express Wash", "Engine Bay Clean"],
  Company: ["About Us", "Our Team", "Careers", "Blog", "Press"],
  Support: ["Contact Us", "FAQs", "Pricing", "Terms of Service", "Privacy Policy"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5">
      {/* Gold divider at top */}
      <div className="divider-gold" />

      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #071F4A/30 0%, #050E21 100%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-[#1A5FD4]/40">
                <Image src="/Logo.png" alt="Klicseo" fill className="object-cover" />
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

            {/* Social links */}
            <div className="flex gap-3">
              {[Globe, Share2, ExternalLink].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg glass-card flex items-center justify-center text-white/40 hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav links */}
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
                      className="text-sm text-white/40 hover:text-white transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact row */}
        <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 mb-10">
          <div className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <MapPin size={15} className="text-[#C9A84C] flex-shrink-0" />
            <span>Sydney, Melbourne & Brisbane, AU</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <Phone size={15} className="text-[#C9A84C] flex-shrink-0" />
            <a href="tel:+1234567890">+1 (234) 567-890</a>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <Mail size={15} className="text-[#C9A84C] flex-shrink-0" />
            <a href="mailto:hello@klicseo.com">hello@klicseo.com</a>
          </div>
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
