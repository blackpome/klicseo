import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import LocalSeoContent from "@/components/LocalSeoContent";
import BreadcrumbsJsonLd from "@/components/BreadcrumbsJsonLd";
import { homeDescription, seoKeywords, siteUrl } from "@/lib/seo";

// Below-the-fold client components are split into their own chunks via
// next/dynamic. ssr: true keeps the HTML in the initial response (so the
// markup is in the document for SEO + LCP candidates lower on the page),
// but the client-side hydration JS loads in a separate chunk that doesn't
// compete with the hero LCP. This is the main lever against the
// "long main-thread tasks" + "unused JavaScript" Lighthouse findings —
// framer-motion + the per-card tilt handlers in these components are the
// bulk of the home-route client bundle.
const Pricing = dynamic(() => import("@/components/Pricing"));
const Testimonials = dynamic(() => import("@/components/Testimonials"));
const BookingTeaser = dynamic(() => import("@/components/BookingTeaser"));
const Footer = dynamic(() => import("@/components/Footer"));
const StickyMobileCTA = dynamic(() => import("@/components/StickyMobileCTA"));
const FloatingContact = dynamic(() => import("@/components/FloatingContact"));

export const metadata = {
  description: homeDescription,
  keywords: [...seoKeywords],
  alternates: {
    canonical: siteUrl,
  },
};

export default function Home() {
  return (
    <main className="flex flex-col bg-[#050E21]">
      <BreadcrumbsJsonLd items={[{ name: "Home", path: "/" }]} />
      <Navbar />
      <Hero />
      {/* Sections that contain in-page anchor targets (#services, #pricing) and
          everything between them must NOT use content-visibility: auto — its
          intrinsic-size placeholder reports the wrong layout height before
          render, so hash-link jumps from the hero land in the wrong section.
          Only the deep-bottom sections skip off-screen rendering. */}
      <Services />
      <HowItWorks />
      <Pricing />
      <div className="cv-section"><Testimonials /></div>
      <div className="cv-section"><BookingTeaser /></div>
      <div className="cv-section"><LocalSeoContent /></div>
      <Footer />
      <StickyMobileCTA />
      <FloatingContact />
    </main>
  );
}
