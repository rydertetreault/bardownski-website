"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CHAMPIONSHIP } from "@/lib/championship";

export default function ChampionshipBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative z-20"
    >
      <Link
        href="/news/10"
        className="block group relative overflow-hidden border-y border-amber-400/40"
        style={{
          background:
            "linear-gradient(90deg, rgba(11,15,26,0.95) 0%, rgba(34,26,8,0.85) 25%, rgba(56,42,12,0.85) 50%, rgba(34,26,8,0.85) 75%, rgba(11,15,26,0.95) 100%)",
        }}
      >
        {/* Pulsing background glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(244,211,94,0.22) 0%, transparent 65%)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(244,211,94,0.25) 50%, transparent 100%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 0.8,
          }}
        />

        {/* Top + bottom hairlines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 py-5 md:py-6 flex items-center justify-center gap-4 md:gap-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="shrink-0"
          >
            <TrophyIcon className="w-7 h-7 md:w-9 md:h-9 text-amber-300 drop-shadow-[0_0_8px_rgba(244,211,94,0.7)]" />
          </motion.div>

          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-100/80">
              {CHAMPIONSHIP.season}
            </span>
            <span
              className="text-base md:text-2xl font-black uppercase tracking-[0.25em] md:tracking-[0.3em] bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent leading-tight"
              style={{ textShadow: "0 0 24px rgba(244,211,94,0.35)" }}
            >
              Club Finals Champions
            </span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-100/80 mt-2 md:mt-3">
              {CHAMPIONSHIP.division} · {CHAMPIONSHIP.recordInRun}
            </span>
          </div>

          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="shrink-0"
          >
            <TrophyIcon className="w-7 h-7 md:w-9 md:h-9 text-amber-300 drop-shadow-[0_0_8px_rgba(244,211,94,0.7)]" />
          </motion.div>
        </div>

        {/* Hover-only "read story" hint */}
        <div className="absolute bottom-1 right-3 text-[9px] text-amber-200/0 group-hover:text-amber-200/80 uppercase tracking-widest font-bold transition-colors">
          Read the story →
        </div>
      </Link>
    </motion.div>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2h10v2h3v3a4 4 0 0 1-4 4h-.35A5.001 5.001 0 0 1 13 14.9V17h2v2H9v-2h2v-2.1A5.001 5.001 0 0 1 7.35 11H7a4 4 0 0 1-4-4V4h3V2zm0 4H5v1a2 2 0 0 0 2 2V6zm10 3a2 2 0 0 0 2-2V6h-2v3zM6 21h12v2H6v-2z" />
    </svg>
  );
}
