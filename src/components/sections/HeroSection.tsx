"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
});

export default function HeroSection() {
  return (
    <section className="relative h-screen flex items-center overflow-hidden">
      {/* Static dark background */}
      <div className="absolute inset-0 z-0 bg-[#0b0f1a]">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/90" />
      </div>

      {/* Diagonal slash accents — red left, light blue right */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <svg
          className="absolute -left-16 top-0 h-full w-[60%] opacity-10"
          viewBox="0 0 400 900"
          preserveAspectRatio="none"
        >
          <polygon points="120,0 220,0 100,900 0,900" fill="#cc1533" />
        </svg>
        <svg
          className="absolute -right-16 top-0 h-full w-[60%] opacity-[0.07]"
          viewBox="0 0 400 900"
          preserveAspectRatio="none"
        >
          <polygon points="280,0 400,0 300,900 180,900" fill="#5b9bd5" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center md:items-start text-center md:text-left">
        {/* Label */}
        <motion.div
          {...fadeUp(0.1)}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-0.5 h-5 bg-[#cc1533]" />
          <span className="text-xs font-bold tracking-[0.25em] uppercase text-[#cc1533]">
            Est. 2020 · Newfoundland
          </span>
        </motion.div>

        {/* Team name */}
        <motion.h1
          {...fadeUp(0.25)}
          className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter text-white leading-none mb-4"
        >
          BARDOWNSKI
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.4)}
          className="text-xl text-white/60 tracking-widest uppercase mb-10"
        >
          Hockey Club
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          {...fadeUp(0.55)}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/highlights"
            className="px-8 py-3.5 bg-[#cc1533] hover:bg-[#a8102a] text-white font-bold uppercase tracking-wider text-sm transition-colors rounded"
          >
            Watch Highlights
          </Link>
          <Link
            href="/roster"
            className="px-8 py-3.5 border border-white/60 hover:border-[#cc1533] text-white font-bold uppercase tracking-wider text-sm transition-colors rounded"
          >
            Meet the Team
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
          className="w-5 h-8 border-2 border-[#5b9bd5]/50 rounded-full flex justify-center pt-1.5"
        >
          <div className="w-1 h-2 bg-[#5b9bd5]/70 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
