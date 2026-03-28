import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SplashScreen from "@/components/layout/SplashScreen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bardownski.hockey"),
  title: "Bardownski | Hockey Club",
  description: "Official website of Bardownski Hockey Club. Based in Newfoundland. Roster, stats, matches, and news.",
  openGraph: {
    title: "Bardownski | Hockey Club",
    description: "Official website of Bardownski Hockey Club. Based in Newfoundland. Roster, stats, matches, and news.",
    url: "https://www.bardownski.hockey",
    siteName: "Bardownski Hockey Club",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bardownski | Hockey Club",
    description: "Official website of Bardownski Hockey Club. Based in Newfoundland. Roster, stats, matches, and news.",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
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
        <SplashScreen />
        <Navbar />
        <main className="pt-16">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
