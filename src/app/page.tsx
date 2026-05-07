import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import BookingTeaser from "@/components/BookingTeaser";
import Footer from "@/components/Footer";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import FloatingContact from "@/components/FloatingContact";

export default function Home() {
  return (
    <main className="flex flex-col bg-[#050E21]">
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <BookingTeaser />
      <Footer />
      <StickyMobileCTA />
      <FloatingContact />
    </main>
  );
}
