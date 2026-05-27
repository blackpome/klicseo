import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import BookingTeaser from "@/components/BookingTeaser";
import LocalSeoContent from "@/components/LocalSeoContent";
import Footer from "@/components/Footer";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import FloatingContact from "@/components/FloatingContact";
import BreadcrumbsJsonLd from "@/components/BreadcrumbsJsonLd";
import { homeDescription, seoKeywords, siteUrl } from "@/lib/seo";

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
