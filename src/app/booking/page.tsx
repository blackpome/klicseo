import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingWizard from "@/components/booking/BookingWizard";
import OfferBadge from "@/components/OfferBadge";
import { bookingDescription, siteUrl } from "@/lib/seo";

export const metadata = {
  title: `Book Doorstep Car Wash`,
  description: bookingDescription,
  alternates: {
    canonical: `${siteUrl}/booking`,
  },
};

export default function BookingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#050E21]">
      <Navbar />

      <div className="flex-1 relative pt-16 sm:pt-20">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(26,95,212,0.18) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center px-4 pt-6 pb-10">
          {/* Header */}
          <div className="text-center mb-1 w-full max-w-2xl">
            <p className="text-[#C9A84C] text-xs font-semibold tracking-[0.2em] uppercase mb-1.5">
              Premium Car Care at your doorstep
            </p>
            <h1
              className="text-2xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Book Your Service
            </h1>
            <OfferBadge className="mt-3" note="Listed prices already include the 30% off" />
          </div>

          <Suspense fallback={null}>
            <BookingWizard />
          </Suspense>
        </div>
      </div>

      <Footer />
    </main>
  );
}
