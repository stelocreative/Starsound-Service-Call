import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Starsound OS · Service Board",
  description: "Internal service call board for Starsound Audio.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#05070C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable}`}>
      <body className="min-h-full bg-app text-ink">{children}</body>
    </html>
  );
}
