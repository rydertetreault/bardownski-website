"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/roster", label: "Roster" },
  { href: "/stats", label: "Stats" },
  { href: "/records", label: "Records" },
  { href: "/gallery", label: "Gallery" },
  { href: "/highlights", label: "Highlights" },
  { href: "/news", label: "News" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10"
        animate={{
          backgroundColor: scrolled ? "#1a2744" : "rgba(26, 39, 68, 0.6)",
          backdropFilter: scrolled ? "blur(0px)" : "blur(12px)",
          height: scrolled ? "56px" : "72px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">

            {/* Logo */}
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 relative overflow-hidden rounded">
                  <Image
                    src="/images/logo/BD - logo.png"
                    alt="Bardownski Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight leading-tight text-white">
                    BARDOWNSKI
                  </span>
                  <span className="text-[10px] text-white/50 tracking-widest uppercase leading-tight">
                    Newfoundland
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href.split("#")[0]) && link.href !== "/";

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative text-sm font-medium uppercase tracking-wider transition-colors pb-1"
                    style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}
                  >
                    <span className="hover:text-white transition-colors">{link.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute left-0 bottom-0 w-full h-[2px] rounded-full"
                        style={{ backgroundColor: "#cc1533" }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right side: CTA + Hamburger */}
            <div className="flex items-center gap-4">
              <Link
                href="/#season"
                className="hidden md:inline-flex items-center px-4 py-2 rounded text-xs font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: "#cc1533" }}
              >
                2025 Season
              </Link>

              <button
                className="md:hidden text-white p-1"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </motion.header>

      {/* Full-screen mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
            style={{ backgroundColor: "#0f1a2e" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Background accent */}
            <div
              className="absolute top-0 right-0 w-64 h-64 opacity-[0.07] pointer-events-none"
              style={{
                background: "radial-gradient(circle at top right, #cc1533 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.05] pointer-events-none"
              style={{
                background: "radial-gradient(circle at bottom left, #cc1533 0%, transparent 70%)",
              }}
            />

            {/* Header row: logo + close */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative">
                  <Image
                    src="/images/logo/BD - logo.png"
                    alt="Bardownski Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-white font-bold tracking-tight text-lg">BARDOWNSKI</span>
              </div>
              <button
                className="text-white/60 hover:text-white p-2 rounded-lg transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

            {/* Scrollable nav links */}
            <nav className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href.split("#")[0]) && link.href !== "/";

                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: 0.06 + i * 0.05, duration: 0.3, ease: "easeOut" }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="group flex items-center gap-4 py-3 px-4 rounded-xl transition-all"
                        style={{
                          backgroundColor: isActive ? "rgba(204, 21, 51, 0.12)" : "transparent",
                        }}
                      >
                        {/* Number */}
                        <span
                          className="text-xs font-mono w-6 text-right shrink-0 transition-colors"
                          style={{ color: isActive ? "#cc1533" : "rgba(255,255,255,0.2)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        {/* Active indicator bar */}
                        <span
                          className="w-[3px] h-6 rounded-full shrink-0 transition-all"
                          style={{
                            backgroundColor: isActive ? "#cc1533" : "rgba(255,255,255,0.08)",
                          }}
                        />

                        {/* Label */}
                        <span
                          className="text-2xl font-bold uppercase tracking-wide transition-colors group-hover:text-white"
                          style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}
                        >
                          {link.label}
                        </span>

                        {/* Arrow on active */}
                        {isActive && (
                          <motion.span
                            className="ml-auto"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="#cc1533" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </motion.span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            {/* Bottom section */}
            <div className="shrink-0 px-6 pb-8">
              <div className="h-px mb-5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <Link
                href="/#season"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: "#cc1533" }}
              >
                2025 Season
              </Link>
              <motion.p
                className="text-center text-[10px] tracking-[0.3em] uppercase mt-5"
                style={{ color: "rgba(255,255,255,0.2)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                2026 · Newfoundland
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
