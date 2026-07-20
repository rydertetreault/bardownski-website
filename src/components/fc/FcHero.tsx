"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
});

export default function FcHero({
  record,
  skillRating,
}: {
  record: string | null;
  skillRating: number | null;
}) {
  return (
    <section className="relative h-[92vh] min-h-[560px] flex items-center overflow-hidden -mt-16 pt-16">
      {/* Video background */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: "#141518" }}>
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          src="/fc/videos/fc-highlight-1.mp4"
          poster="/fc/images/fc-highlight-1-poster.webp"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#1b1d21]" />
      </div>

      {/* Diagonal gold slash accents (PL-club style) */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <svg
          className="absolute -left-16 top-0 h-full w-[60%] opacity-[0.08]"
          viewBox="0 0 400 900"
          preserveAspectRatio="none"
        >
          <polygon points="120,0 220,0 100,900 0,900" fill="#c9a227" />
        </svg>
        <svg
          className="absolute -right-16 top-0 h-full w-[60%] opacity-[0.06]"
          viewBox="0 0 400 900"
          preserveAspectRatio="none"
        >
          <polygon points="280,0 400,0 300,900 180,900" fill="#ffffff" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center md:items-start text-center md:text-left">
        <motion.div {...fadeUp(0.1)} className="flex items-center gap-3 mb-6">
          <div className="w-0.5 h-5" style={{ backgroundColor: "#c9a227" }} />
          <span
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: "#c9a227" }}
          >
            EA FC 26 · Pro Clubs
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.25)}
          className="text-5xl sm:text-7xl md:text-8xl xl:text-9xl font-black tracking-tighter text-white leading-none mb-4"
        >
          BARDOWNSKI{" "}
          <span style={{ color: "#c9a227" }}>FC</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.4)}
          className="text-xl text-white/60 tracking-widest uppercase mb-8"
        >
          Football Club
        </motion.p>

        {/* Live stat chips */}
        {(record || skillRating) && (
          <motion.div {...fadeUp(0.5)} className="flex items-center gap-4 mb-10">
            {record && (
              <div
                className="px-4 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  backgroundColor: "rgba(36,39,44,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 block">
                  Record
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: "#e6c964" }}>
                  {record}
                </span>
              </div>
            )}
            {skillRating !== null && (
              <div
                className="px-4 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  backgroundColor: "rgba(36,39,44,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 block">
                  Skill Rating
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: "#e6c964" }}>
                  {skillRating}
                </span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div {...fadeUp(0.6)} className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/fc/fixtures"
            className="px-8 py-3.5 font-bold uppercase tracking-wider text-sm transition-all rounded hover:brightness-110"
            style={{ backgroundColor: "#c9a227", color: "#141414" }}
          >
            Fixtures &amp; Results
          </Link>
          <Link
            href="/fc/highlights"
            className="px-8 py-3.5 border border-white/60 text-white font-bold uppercase tracking-wider text-sm transition-colors rounded hover:border-[#c9a227]"
          >
            Watch Highlights
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-5 h-8 border-2 rounded-full flex justify-center pt-1.5"
          style={{ borderColor: "rgba(201,162,39,0.5)" }}
        >
          <div className="w-1 h-2 rounded-full" style={{ backgroundColor: "rgba(201,162,39,0.7)" }} />
        </motion.div>
      </motion.div>
    </section>
  );
}
