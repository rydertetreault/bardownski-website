"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const hockeyLinks = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/roster", label: "Roster" },
  { href: "/stats", label: "Stats" },
  { href: "/records", label: "Records" },
  { href: "/gallery", label: "Gallery" },
  { href: "/highlights", label: "Highlights" },
  { href: "/news", label: "News" },
];

const fcLinks = [
  { href: "/fc", label: "Home" },
  { href: "/fc/fixtures", label: "Fixtures" },
  { href: "/fc/squad", label: "Squad" },
  { href: "/fc/stats", label: "Stats" },
  { href: "/fc/records", label: "Records" },
  { href: "/fc/gallery", label: "Gallery" },
  { href: "/fc/highlights", label: "Highlights" },
  { href: "/fc/news", label: "News" },
];

const GOLD = "#cc1533";

function useIsLinkActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/fc") return pathname === "/fc";
    return pathname.startsWith(href.split("#")[0]);
  };
}

/* ────────────────────────────────────────────────────────────────────────
   Hockey header — original navy/red design (logo + underline links)
   ──────────────────────────────────────────────────────────────────────── */
function HockeyHeader({
  scrolled,
  onOpenMobile,
}: {
  scrolled: boolean;
  onOpenMobile: () => void;
}) {
  const isLinkActive = useIsLinkActive();

  return (
    <motion.header
      key="hockey-header"
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10"
      initial={{ x: "-100%" }}
      animate={{
        x: 0,
        backgroundColor: scrolled ? "#1a2744" : "rgba(26, 39, 68, 0.6)",
        backdropFilter: scrolled ? "blur(0px)" : "blur(12px)",
        height: scrolled ? "56px" : "72px",
      }}
      exit={{ x: "-100%" }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
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
            {hockeyLinks.map((link) => {
              const isActive = isLinkActive(link.href);
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
                      layoutId="hockey-nav-underline"
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
              href="/fc"
              className="hidden md:inline-flex items-center px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: GOLD, color: "#ffffff" }}
            >
              Bardownski FC
            </Link>

            <button
              className="md:hidden text-white p-1"
              onClick={onOpenMobile}
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
  );
}

/* ────────────────────────────────────────────────────────────────────────
   FC header — Premier League club style: solid gold utility strip on top,
   flat dark bar, text-only wordmark, full-height links with thick gold
   active bar. No crest/logo.
   ──────────────────────────────────────────────────────────────────────── */
function FcHeader({
  scrolled,
  onOpenMobile,
}: {
  scrolled: boolean;
  onOpenMobile: () => void;
}) {
  const isLinkActive = useIsLinkActive();

  return (
    <motion.header
      key="fc-header"
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* ── Gold utility strip (collapses on scroll) ── */}
      <motion.div
        animate={{ height: scrolled ? 0 : 32, opacity: scrolled ? 0 : 1 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
        style={{ backgroundColor: GOLD }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ffffff]">
            EA FC 26 · Pro Clubs
          </span>
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ffffff]/70 hover:text-[#ffffff] transition-colors"
          >
            Bardownski Hockey ↗
          </Link>
        </div>
      </motion.div>

      {/* ── Main bar ── */}
      <div
        className="h-16"
        style={{
          backgroundColor: "#0f1a2e",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full gap-6">
            {/* Text-only wordmark */}
            <Link href="/fc" className="shrink-0 group">
              <span className="text-xl font-black tracking-tighter text-white leading-none">
                BARDOWNSKI{" "}
                <span
                  className="transition-colors"
                  style={{ color: GOLD }}
                >
                  FC
                </span>
              </span>
            </Link>

            {/* Desktop Nav — full-height items, thick gold active bar */}
            <nav className="hidden md:flex items-stretch h-full flex-1 justify-end">
              {fcLinks.map((link) => {
                const isActive = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative flex items-center px-4 text-[12px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
                    style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)" }}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="fc-nav-bar"
                        className="absolute left-0 right-0 bottom-0 h-[3px]"
                        style={{ backgroundColor: GOLD }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Hamburger */}
            <button
              className="md:hidden text-white p-1"
              onClick={onOpenMobile}
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
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Shared mobile overlay (themed per mode; FC shows text wordmark, no logo)
   ──────────────────────────────────────────────────────────────────────── */
function MobileOverlay({
  isFc,
  onClose,
}: {
  isFc: boolean;
  onClose: () => void;
}) {
  const isLinkActive = useIsLinkActive();
  const navLinks = isFc ? fcLinks : hockeyLinks;
  const accent = isFc ? GOLD : "#cc1533";
  const accentSoft = isFc ? "rgba(204,21,51,0.12)" : "rgba(204,21,51,0.12)";

  return (
    <motion.div
      key="mobile-menu"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{ backgroundColor: isFc ? "#0f1a2e" : "#0f1a2e" }}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Background accent */}
      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-[0.07] pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${accent} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.05] pointer-events-none"
        style={{
          background: `radial-gradient(circle at bottom left, ${accent} 0%, transparent 70%)`,
        }}
      />

      {/* Header row: wordmark + close */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          {!isFc && (
            <div className="w-10 h-10 relative">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski Logo"
                fill
                className="object-contain"
              />
            </div>
          )}
          <span className="text-white font-bold tracking-tight text-lg">
            BARDOWNSKI
            {isFc && <span style={{ color: GOLD }}> FC</span>}
          </span>
        </div>
        <button
          className="text-white/60 hover:text-white p-2 rounded-lg transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          onClick={onClose}
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
            const isActive = isLinkActive(link.href);
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
                  onClick={onClose}
                  className="group flex items-center gap-4 py-3 px-4 rounded-xl transition-all"
                  style={{
                    backgroundColor: isActive ? accentSoft : "transparent",
                  }}
                >
                  <span
                    className="text-xs font-mono w-6 text-right shrink-0 transition-colors"
                    style={{ color: isActive ? accent : "rgba(255,255,255,0.2)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="w-[3px] h-6 rounded-full shrink-0 transition-all"
                    style={{
                      backgroundColor: isActive ? accent : "rgba(255,255,255,0.08)",
                    }}
                  />
                  <span
                    className="text-2xl font-bold uppercase tracking-wide transition-colors group-hover:text-white"
                    style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}
                  >
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.span
                      className="ml-auto"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke={accent} viewBox="0 0 24 24">
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
          href={isFc ? "/" : "/fc"}
          onClick={onClose}
          className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            backgroundColor: isFc ? "#cc1533" : GOLD,
            color: isFc ? "#ffffff" : "#ffffff",
          }}
        >
          {isFc ? "Bardownski Hockey" : "Bardownski FC"}
        </Link>
        <motion.p
          className="text-center text-[10px] tracking-[0.3em] uppercase mt-5"
          style={{ color: "rgba(255,255,255,0.2)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isFc ? "2026 · EA FC Pro Clubs" : "2026 · Newfoundland"}
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const isFc = pathname === "/fc" || pathname.startsWith("/fc/");

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

  // Close mobile menu when navigating to a new page
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {isFc ? (
          <FcHeader
            key="fc"
            scrolled={scrolled}
            onOpenMobile={() => setMobileOpen(true)}
          />
        ) : (
          <HockeyHeader
            key="hockey"
            scrolled={scrolled}
            onOpenMobile={() => setMobileOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <MobileOverlay isFc={isFc} onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
