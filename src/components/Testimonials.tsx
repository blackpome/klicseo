import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Michael T.",
    vehicle: "BMW 5 Series",
    rating: 5,
    text: "Absolutely incredible service. My BMW looked better than the day I picked it up from the dealership. The attention to detail is unmatched.",
    initials: "MT",
  },
  {
    name: "Sarah K.",
    vehicle: "Mercedes GLE",
    rating: 5,
    text: "I booked the Prestige package and couldn't be happier. The team was professional, punctual, and the ceramic coating result is stunning.",
    initials: "SK",
  },
  {
    name: "James R.",
    vehicle: "Audi Q7",
    rating: 5,
    text: "The mobile service is a game-changer. They came to my office, and when I finished work, my car was immaculate. Will never go to a regular wash again.",
    initials: "JR",
  },
  {
    name: "Priya N.",
    vehicle: "Tesla Model 3",
    rating: 5,
    text: "Genuinely the best car wash experience I've had. Professional, thorough, and they treated my Tesla with the care it deserves.",
    initials: "PN",
  },
  {
    name: "David L.",
    vehicle: "Range Rover Sport",
    rating: 5,
    text: "Used Klicseo three times now. Consistent quality every single visit. The Premium package for my Range Rover is worth every cent.",
    initials: "DL",
  },
  {
    name: "Emma W.",
    vehicle: "Porsche Cayenne",
    rating: 5,
    text: "The paint decontamination and clay bar treatment on my Cayenne was flawless. You can tell these guys genuinely love what they do.",
    initials: "EW",
  },
];

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
        <div className="text-center mb-14">
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Client Stories
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            What Our Clients Say
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of satisfied customers who trust Klicseo with their
            prized vehicles.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </div>

        {/* Overall rating */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={20} className="text-[#C9A84C]" fill="#C9A84C" />
            ))}
          </div>
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            4.9
          </span>
          <span className="text-white/40 text-sm">from 480+ reviews</span>
        </div>

        {/* Testimonial grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="glass-card rounded-2xl p-6 hover:border-[#1A5FD4]/30 hover:bg-white/[0.06] transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #1A5FD4, #0D3D8E)",
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.vehicle}</div>
                  </div>
                </div>
                <Quote size={18} className="text-[#C9A84C]/40 group-hover:text-[#C9A84C]/70 transition-colors flex-shrink-0" />
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={13} className="text-[#C9A84C]" fill="#C9A84C" />
                ))}
              </div>

              <p className="text-white/60 text-sm leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
