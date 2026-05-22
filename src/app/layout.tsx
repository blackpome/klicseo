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
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${businessName} | Doorstep Car Wash in ${primaryCity}`,
    template: `%s | ${businessName}`,
  },
  description: homeDescription,
  keywords: [...seoKeywords],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${businessName} | Doorstep Car Wash in ${primaryCity}`,
    description: homeDescription,
    siteName: businessName,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessName} | Doorstep Car Wash in ${primaryCity}`,
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ percents, badges }, site] = await Promise.all([getDiscountConfig(), getSiteSettings()]);
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full`}
      style={{ fontFamily: "var(--font-inter)" }}
    >
      <body className="min-h-full flex flex-col bg-[#050E21] text-white">
        <SiteSettingsProvider value={site}>
          <DiscountProvider discounts={percents} badges={badges}>
            {children}
          </DiscountProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
