import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import {
  businessName,
  homeDescription,
  primaryCity,
  seoKeywords,
  siteUrl,
} from "@/lib/seo";
import { DiscountProvider } from "@/components/DiscountContext";
import { getDiscountConfig } from "@/lib/discounts";
import { SiteSettingsProvider } from "@/components/SiteSettingsContext";
import { getSiteSettings } from "@/lib/site-settings";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  // Display font — headings use 600/700/800 almost exclusively.
  weight: ["600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // Body font — no font-light (300) usage in the codebase.
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `Doorstep Car Wash in ${primaryCity} | ${businessName}`,
    template: `%s | ${businessName} Doorstep Car Wash ${primaryCity}`,
  },
  description: homeDescription,
  keywords: [...seoKeywords],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `Doorstep Car Wash in ${primaryCity} | ${businessName}`,
    description: homeDescription,
    siteName: businessName,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Doorstep Car Wash in ${primaryCity} | ${businessName}`,
    description: homeDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "Automotive Services",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ percents, badges, percentsByLineId, badgesByLineId }, site] = await Promise.all([getDiscountConfig(), getSiteSettings()]);
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full`}
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <body className="min-h-full flex flex-col bg-[#050E21] text-white">
        <SiteSettingsProvider value={site}>
          <DiscountProvider
            discounts={percents}
            badges={badges}
            percentsByLineId={percentsByLineId}
            badgesByLineId={badgesByLineId}
          >
            {children}
          </DiscountProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
