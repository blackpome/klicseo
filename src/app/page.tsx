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
      <Navbar />
      <Hero />
      {/* Below-the-fold sections skip off-screen rendering for smoother scroll */}
      <div className="cv-section"><Services /></div>
      <div className="cv-section"><HowItWorks /></div>
      <div className="cv-section"><Pricing /></div>
      <div className="cv-section"><Testimonials /></div>
      <div className="cv-section"><BookingTeaser /></div>
      <div className="cv-section"><LocalSeoContent /></div>
      <Footer />
      <StickyMobileCTA />
      <FloatingContact />
    </main>
  );
}
