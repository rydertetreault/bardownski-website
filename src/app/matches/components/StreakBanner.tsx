"use client";

import { motion } from "framer-motion";
import { useHockeyMotionPaused } from "@/components/layout/hockey-motion-preference";

export function StreakBanner({
  streakType,
  streakCount,
  isClubRecord,
}: {
  streakType: "W" | "L";
  streakCount: number;
  isClubRecord: boolean;
}) {
  const motionPaused = useHockeyMotionPaused();
  const isWin = streakType === "W";

  return (
    <motion.div
      initial={false}
      animate={motionPaused ? { opacity: 1, y: 0 } : undefined}
        whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={motionPaused ? { duration: 0 } : { duration: 0.4 }}
      className="mb-6 flex justify-center"
    >
      <div className="relative overflow-hidden rounded-xl border border-border/50 flex w-full max-w-md"
        style={{ background: "linear-gradient(140deg, rgba(13,21,38,0.95) 0%, rgba(18,26,42,0.9) 50%, rgba(10,17,32,0.95) 100%)" }}
      >
        {/* ── Left sidebar: stars & stripes ── */}
        <div className="relative w-10 md:w-12 shrink-0 overflow-hidden">
          {/* Stripes */}
          <div className="absolute inset-0 flex flex-col">
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  backgroundColor: i % 2 === 0 ? "#68c8ce" : "#ffffff",
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="relative flex-1 px-5 md:px-6 py-4 md:py-5">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#68c8ce] via-[#68c8ce]/50 to-transparent" />

          {/* Watermark number */}
          <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 pointer-events-none select-none">
            <span className="text-6xl md:text-7xl font-black tabular-nums leading-none text-white/[0.04]">
              {streakCount}
            </span>
          </div>

          <div className="relative flex items-center gap-4">
            {/* Streak count */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-3xl md:text-4xl font-black tabular-nums text-white leading-none">
                {streakCount}
              </span>
              <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-muted/50 mt-0.5">
                {isWin ? "Wins" : "Losses"}
              </span>
            </div>

            <div className="w-px h-9 bg-white/10 shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                  {isWin ? "Win" : "Loss"} Streak
                </p>
                {isClubRecord && (
                  <span
                    className="bg-[#68c8ce]/15 border border-[#68c8ce]/30 text-[#68c8ce] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shrink-0"
                    style={{
                      clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                    }}
                  >
                    Best in Saved Results
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted/40 uppercase tracking-widest mt-0.5">
                At the close of the saved results
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
