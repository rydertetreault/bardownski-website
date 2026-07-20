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
      {/* Static dark background */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: "#0f1a2e" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#0b0f1a]" />
      </div>

      {/* Pitch-line motif — center circle + halfway line (PL-club style) */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <svg
          className="absolute -right-40 top-1/2 -translate-y-1/2 h-[130%] opacity-[0.07]"
          viewBox="0 0 600 900"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Halfway line */}
          <line x1="300" y1="0" x2="300" y2="900" stroke="#cc1533" strokeWidth="2" />
          {/* Center circle */}
          <circle cx="300" cy="450" r="220" stroke="#cc1533" strokeWidth="2" />
          <circle cx="300" cy="450" r="8" fill="#cc1533" />
          {/* Penalty box arc */}
          <path
            d="M 600 250 A 260 260 0 0 0 600 650"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </svg>

        {/* Gold chevron strip along the bottom */}
        <svg
          className="absolute bottom-0 left-0 w-full h-24 opacity-[0.05]"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <polyline
              key={i}
              points={`${i * 100},100 ${i * 100 + 50},20 ${i * 100 + 100},100`}
              stroke="#cc1533"
              strokeWidth="3"
              fill="none"
            />
          ))}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center md:items-start text-center md:text-left">
        <motion.div {...fadeUp(0.1)} className="flex items-center gap-3 mb-6">
          <div className="w-0.5 h-5" style={{ backgroundColor: "#cc1533" }} />
          <span
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: "#cc1533" }}
          >
            EA FC 26 · Pro Clubs
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.25)}
          className="text-5xl sm:text-7xl md:text-8xl xl:text-9xl font-black tracking-tighter text-white leading-none mb-4"
        >
          BARDOWNSKI{" "}
          <span style={{ color: "#cc1533" }}>FC</span>
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
                  backgroundColor: "rgba(17,24,39,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 block">
                  Record
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: "#5b9bd5" }}>
                  {record}
                </span>
              </div>
            )}
            {skillRating !== null && (
              <div
                className="px-4 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  backgroundColor: "rgba(17,24,39,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 block">
                  Skill Rating
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: "#5b9bd5" }}>
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
            style={{ backgroundColor: "#cc1533", color: "#ffffff" }}
          >
            Fixtures &amp; Results
          </Link>
          <Link
            href="/fc/highlights"
            className="px-8 py-3.5 border border-white/60 text-white font-bold uppercase tracking-wider text-sm transition-colors rounded hover:border-[#cc1533]"
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
          style={{ borderColor: "rgba(204,21,51,0.5)" }}
        >
          <div className="w-1 h-2 rounded-full" style={{ backgroundColor: "rgba(204,21,51,0.7)" }} />
        </motion.div>
      </motion.div>
    </section>
  );
}
