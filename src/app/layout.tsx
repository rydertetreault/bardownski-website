import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/layout/Navbar";
import SiteFooter from "@/components/layout/SiteFooter";
import SplashScreen from "@/components/layout/SplashScreen";
import SiteTheme from "@/components/layout/SiteTheme";
import "./globals.css";
import "./hockey-theme.css";
import "@/components/layout/site-widths.css";
import "@/components/layout/club-marks.css";
import "@/components/layout/shared-footer.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bardownski | Hockey Club",
  description: "Official website of Bardownski Hockey Club. Based in Newfoundland. Roster, stats, matches, and news.",
  icons: {
    icon: [
      { url: "/images/logo/B-logo.png", sizes: "512x512", type: "image/png" },
      { url: "/images/logo/b-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/images/logo/b-apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteTheme>
          <SplashScreen />
          <Navbar />
          <main className="site-main">{children}</main>
          <SiteFooter />
        </SiteTheme>
        <Analytics />
      </body>
    </html>
  );
}
