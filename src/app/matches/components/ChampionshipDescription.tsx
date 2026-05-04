"use client";

import { motion } from "framer-motion";

export default function ChampionshipDescription({
  description,
}: {
  description: string;
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden border border-amber-400/40 mb-6"
      style={{
        background:
          "linear-gradient(135deg, rgba(11,15,26,0.95) 0%, rgba(34,26,8,0.85) 50%, rgba(11,15,26,0.95) 100%)",
      }}
    >
      {/* Top hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(244,211,94,0.18) 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.8,
        }}
      />

      <div className="relative px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5 text-amber-300"
          >
            <path d="M7 2h10v2h3v3a4 4 0 0 1-4 4h-.35A5.001 5.001 0 0 1 13 14.9V17h2v2H9v-2h2v-2.1A5.001 5.001 0 0 1 7.35 11H7a4 4 0 0 1-4-4V4h3V2zm0 4H5v1a2 2 0 0 0 2 2V6zm10 3a2 2 0 0 0 2-2V6h-2v3zM6 21h12v2H6v-2z" />
          </svg>
          <span
            className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300"
            style={{ textShadow: "0 0 12px rgba(244,211,94,0.45)" }}
          >
            Championship Clincher
          </span>
        </div>
        <div className="space-y-3">
          {description.split(/\n\n+/).map((p, i) => (
            <p key={i} className="text-sm text-amber-50/85 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
