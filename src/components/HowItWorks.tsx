const steps = [
  {
    number: "01",
    title: "Choose Your Package",
    description:
      "Browse our range of premium wash and detailing packages. Select the one that best suits your vehicle and budget.",
  },
  {
    number: "02",
    title: "Book Your Slot",
    description:
      "Pick a convenient date and time. We offer same-day appointments for most services — your schedule is our priority.",
  },
  {
    number: "03",
    title: "We Come to You",
    description:
      "Our mobile team arrives at your location with all the professional equipment and premium products required.",
  },
  {
    number: "04",
    title: "Drive Away Spotless",
    description:
      "Inspect the results, and drive away in a car that looks and feels brand new. Your satisfaction is guaranteed.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-[#071F4A]/40" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 20% 50%, rgba(26,95,212,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[#C9A84C] text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Simple Process
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            How It Works
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Getting your car professionally cleaned has never been easier. Four
            simple steps to a spotless vehicle.
          </p>
          <div className="divider-gold w-24 mx-auto mt-6" />
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Connector line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] right-[-calc(50%-40px)] w-full h-px"
                  style={{
                    background: "linear-gradient(90deg, rgba(201,168,76,0.4) 0%, rgba(201,168,76,0.1) 100%)",
                  }}
                />
              )}

              {/* Number bubble */}
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6 z-10 shadow-[0_0_40px_rgba(201,168,76,0.2)]"
                style={{
                  background: "linear-gradient(135deg, #0D3D8E 0%, #1A5FD4 100%)",
                  border: "2px solid rgba(201,168,76,0.4)",
                }}
              >
                <span
                  className="text-xl font-bold gold-shimmer"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {step.number}
                </span>
              </div>

              <h3
                className="text-lg font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {step.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-[220px]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
