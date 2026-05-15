import {
  businessEmail,
  businessName,
  businessPhone,
  homeDescription,
  primaryCity,
  serviceAreas,
  serviceAreaText,
  siteUrl,
} from "@/lib/seo";
import { SUPPORT_PHONE } from "@/lib/serviceability";

const faqs = [
  {
    question: "What does Klicseo do?",
    answer:
      "Klicseo provides doorstep car wash, car detailing, and one-time wash services in Chennai. Customers can book monthly subscriptions, weekly wash plans, demo washes, and detailing appointments.",
  },
  {
    question: "Which areas in Chennai does Klicseo serve?",
    answer: `Klicseo focuses on ${serviceAreaText} in Chennai, with serviceability checked during booking based on the selected service and your location.`,
  },
  {
    question: "Does Klicseo offer one-time wash and car detailing?",
    answer:
      "Yes. Klicseo offers one-time manual wash, machine wash, ceramic sealant coating, and interior add-on options along with recurring doorstep car wash plans.",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AutoWash",
      "@id": `${siteUrl}/#business`,
      name: businessName,
      url: siteUrl,
      telephone: SUPPORT_PHONE,
      email: businessEmail,
      description: homeDescription,
      areaServed: serviceAreas.map((area) => ({
        "@type": "Place",
        name: `${area}, ${primaryCity}`,
      })),
      address: {
        "@type": "PostalAddress",
        addressLocality: primaryCity,
        addressCountry: "IN",
      },
      serviceType: [
        "Doorstep car wash",
        "Car detailing",
        "One-time wash",
        "Monthly car wash subscription",
        "Weekly car wash",
        "Ceramic sealant coating",
      ],
      sameAs: [siteUrl],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: businessName,
      description: homeDescription,
      inLanguage: "en-IN",
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export default function LocalSeoContent() {
  return (
    <section className="relative px-4 py-20 sm:py-24">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 20%, rgba(26,95,212,0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">
            Chennai Service Areas
          </p>
          <h2
            className="mb-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Doorstep Car Wash in Chennai
          </h2>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-white/55 sm:text-base">
            Klicseo is a doorstep car wash service in Chennai for customers looking for
            regular car wash plans, one-time wash visits, and premium car detailing
            without driving to a shop.
          </p>
          <div className="divider-gold mx-auto mt-6 w-24" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card rounded-2xl p-6 sm:p-7">
            <h3
              className="mb-3 text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Areas We Focus On
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-white/55">
              We currently want strong visibility for local searches around these
              Chennai neighborhoods where customers look for doorstep car wash and car
              detailing services.
            </p>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[#1A5FD4]/30 bg-[#1A5FD4]/12 px-3 py-2 text-sm font-medium text-white/85"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-7">
            <h3
              className="mb-3 text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              What People Search For
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-white/60">
              <p>
                Customers typically search for terms like doorstep car wash in Chennai,
                car wash near Ullagaram, one-time wash in Nanganallur, or car detailing
                in Adambakkam.
              </p>
              <p>
                Klicseo covers recurring car wash subscriptions, one-time manual wash,
                machine wash, ceramic sealant coating, and interior detailing add-ons.
              </p>
              <p>
                Contact:{" "}
                <a className="text-[#C9A84C]" href={`tel:${businessPhone.replace(/\s+/g, "")}`}>
                  {businessPhone}
                </a>{" "}
                or{" "}
                <a className="text-[#C9A84C]" href={`mailto:${businessEmail}`}>
                  {businessEmail}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 glass-card rounded-2xl p-6 sm:p-7">
          <h3
            className="mb-4 text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Frequently Asked Questions
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-2 text-sm font-semibold text-white">{faq.question}</p>
                <p className="text-sm leading-relaxed text-white/55">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
