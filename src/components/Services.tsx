import { Droplets, Sparkles, Shield, Zap, Car, Wind } from "lucide-react";

const services = [
  {
    icon: Droplets,
    title: "Exterior Wash",
    description:
      "Full exterior hand wash with premium pH-balanced soap, wheel cleaning, and spot-free rinse.",
    highlight: false,
  },
  {
    icon: Sparkles,
    title: "Interior Detail",
    description:
      "Deep vacuum, leather conditioning, dashboard polish, and odor elimination for a showroom finish.",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Ceramic Coating",
    description:
      "Professional-grade ceramic protection that repels water, dirt, and UV rays for years.",
    highlight: false,
  },
  {
    icon: Car,
    title: "Full Detail",
    description:
      "Complete top-to-bottom transformation — paint correction, interior deep clean, and sealant.",
    highlight: false,
  },
  {
    icon: Zap,
    title: "Express Wash",
    description:
      "Quick 15-minute premium wash for busy schedules. No compromise on quality.",
    highlight: false,
  },
  {
    icon: Wind,
    title: "Engine Bay Clean",
    description:
      "Safe degreaser treatment and detailing of your engine bay for optimal performance and looks.",
    highlight: false,
  },
];

export default function Services() {
  return (
    <section id="services" className="relative py-20 sm:py-28 px-4">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(13,61,142,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            What We Offer
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Premium Services
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Every service is performed by trained professionals using the finest
            products to ensure your vehicle gets the treatment it deserves.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className={`relative group rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 cursor-default ${
                  service.highlight
                    ? "bg-gradient-to-br from-[#1A5FD4] to-[#0D3D8E] border border-[#1A5FD4] shadow-[0_8px_32px_rgba(26,95,212,0.35)]"
                    : "glass-card hover:border-[#1A5FD4]/30 hover:bg-white/[0.06]"
                }`}
              >
                {service.highlight && (
                  <div className="absolute -top-3 left-6">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#050E21]"
                      style={{ background: "linear-gradient(135deg, #9C7A2A, #C9A84C, #E8CC7A)" }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}

                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 ${
                    service.highlight
                      ? "bg-white/20"
                      : "bg-[#1A5FD4]/15 group-hover:bg-[#1A5FD4]/25"
                  } transition-colors duration-300`}
                >
                  <Icon
                    size={22}
                    className={service.highlight ? "text-white" : "text-[#C9A84C]"}
                  />
                </div>

                <h3
                  className={`text-lg font-bold mb-2 ${
                    service.highlight ? "text-white" : "text-white"
                  }`}
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {service.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    service.highlight ? "text-white/80" : "text-white/50"
                  }`}
                >
                  {service.description}
                </p>

                <div
                  className={`mt-5 text-sm font-semibold flex items-center gap-1 ${
                    service.highlight ? "text-[#E8CC7A]" : "text-[#C9A84C]"
                  } group-hover:gap-2 transition-all duration-200`}
                >
                  Learn more
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
