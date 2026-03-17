"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
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
                2026 Season
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
            className="fixed inset-0 z-[60] flex flex-col"
            style={{ backgroundColor: "#1a2744" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Close button */}
            <div className="flex justify-end px-6 pt-5">
              <button
                className="text-white p-1"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Centered logo */}
            <div className="flex justify-center mt-8 mb-12">
              <div className="w-20 h-20 relative">
                <Image
                  src="/images/logo/BD - logo.png"
                  alt="Bardownski Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Staggered nav links */}
            <nav className="flex flex-col items-center gap-6 px-6 flex-1">
              {navLinks.map((link, i) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href.split("#")[0]) && link.href !== "/";

                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.3, ease: "easeOut" }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-4xl font-extrabold uppercase tracking-tight transition-colors"
                      style={{ color: isActive ? "#cc1533" : "#ffffff" }}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Bottom tagline */}
            <motion.p
              className="text-center text-xs tracking-[0.3em] uppercase pb-10"
              style={{ color: "rgba(255,255,255,0.3)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              2026 · Newfoundland
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
