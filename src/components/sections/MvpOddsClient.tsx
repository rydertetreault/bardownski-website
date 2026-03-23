"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "@/components/ui/Animate";
import { getNickname } from "@/lib/nicknames";

/* ── Info Modal ── */

function MvpInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-navy border border-border rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold uppercase tracking-wider mb-4">
          How MVP Odds Are Calculated
        </h3>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <p className="text-white/80">
            Every player gets a <span className="text-white font-semibold">per-game rating</span> based
            on their stats, multiplied by <span className="text-white font-semibold">sqrt(games played)</span> to
            reward volume without letting it dominate.
          </p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#cc1533] mb-2">
              Skater Score
            </h4>
            <div className="bg-navy-dark/50 rounded-lg p-3 space-y-1 text-xs font-mono">
              <p>PPG <span className="text-muted/60">* 20</span> <span className="text-muted/40">// offensive production</span></p>
              <p>Goals/GP <span className="text-muted/60">* 15</span> <span className="text-muted/40">// goal scoring</span></p>
              <p>+/- per GP <span className="text-muted/60">* 8</span> <span className="text-muted/40">// two-way impact</span></p>
              <p>GWG/GP <span className="text-muted/60">* 30</span> <span className="text-muted/40">// clutch factor</span></p>
              <p>Shot % <span className="text-muted/60">* 0.3</span> <span className="text-muted/40">// efficiency</span></p>
              <p>Hits/GP <span className="text-muted/60">* 0.5</span> <span className="text-muted/40">// physicality</span></p>
              <p>Takeaways/GP <span className="text-muted/60">* 0.5</span> <span className="text-muted/40">// defense</span></p>
              <p>Giveaways/GP <span className="text-muted/60">* -0.3</span> <span className="text-muted/40">// turnover penalty</span></p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#cc1533] mb-2">
              Goalie Score
            </h4>
            <div className="bg-navy-dark/50 rounded-lg p-3 space-y-1 text-xs font-mono">
              <p>Save % <span className="text-muted/60">* 0.5</span> <span className="text-muted/40">// core goalie stat</span></p>
              <p>10 - GAA <span className="text-muted/60">* 3</span> <span className="text-muted/40">// goals against efficiency</span></p>
              <p>Shutouts/GP <span className="text-muted/60">* 20</span> <span className="text-muted/40">// elite performances</span></p>
              <p>SO Periods/GP <span className="text-muted/60">* 30</span> <span className="text-muted/40">// consistency</span></p>
              <p>Win % <span className="text-muted/60">* 0.3</span> <span className="text-muted/40">// results</span></p>
              <p>Saves/GP <span className="text-muted/60">* 0.3</span> <span className="text-muted/40">// workload</span></p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#cc1533] mb-2">
              Why sqrt(GP)?
            </h4>
            <p>
              A player with 200 games doesn&apos;t get 4x the score of someone with 50
              games - they get ~2x. You can&apos;t just rack up games with average stats
              to climb the board, but playing more games with good stats does reward you.
              Part-time players with inflated rate stats from small samples get naturally pulled down.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#cc1533] mb-2">
              Odds Conversion
            </h4>
            <p>
              Scores are normalized against the top player, raised to the 3rd power
              to create separation, then converted to probabilities and American odds.
              Minimum 5 GP to qualify.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MvpInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-5 h-5 rounded-full border border-border text-[10px] font-bold text-muted hover:text-white hover:border-white/40 transition-colors cursor-pointer flex items-center justify-center"
        title="How are odds calculated?"
      >
        i
      </button>
      {open && <MvpInfoModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function MvpOddsAnimations({ children }: { children: ReactNode }) {
  return <FadeUp>{children}</FadeUp>;
}

export interface BannerEntry {
  name: string;
  nickname: string;
  isGoalie: boolean;
  probability: number;
  americanOdds: string;
}

export function MvpOddsSpin({ entries }: { entries: BannerEntry[] }) {
  const [active, setActive] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const advance = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActive((prev) => (prev + 1) % entries.length);
      setIsTransitioning(false);
    }, 300);
  }, [entries.length]);

  useEffect(() => {
    const interval = setInterval(advance, 3000);
    return () => clearInterval(interval);
  }, [advance]);

  if (entries.length === 0) return null;

  const entry = entries[active];
  const isFavorite = active === 0;

  return (
    <div className="bg-navy border border-border rounded-xl px-4 sm:px-6 py-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#cc1533] whitespace-nowrap">
          MVP Odds
        </span>
        <div className="h-px w-3 bg-border" />

        <div
          className={`flex items-center gap-2 flex-1 min-w-0 transition-all duration-300 ${
            isTransitioning
              ? "opacity-0 -translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <span className={`text-xs font-bold ${isFavorite ? "text-[#cc1533]" : "text-muted/40"}`}>
            {active + 1}.
          </span>
          <span className={`text-sm font-semibold truncate ${isFavorite ? "text-white" : "text-white/80"}`}>
            {entry.nickname}
            {entry.isGoalie && <span className="text-[10px] text-muted ml-1">(G)</span>}
          </span>
          <span className="text-xs text-muted">
            {(entry.probability * 100).toFixed(1)}%
          </span>
          <span className={`text-sm font-mono font-bold ${
            isFavorite
              ? "text-[#cc1533]"
              : entry.americanOdds.startsWith("+")
              ? "text-emerald-400"
              : "text-white/60"
          }`}>
            {entry.americanOdds}
          </span>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-1">
          {entries.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsTransitioning(true); setTimeout(() => { setActive(i); setIsTransitioning(false); }, 300); }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === active ? "bg-[#cc1533]" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Odds Row ── */

interface OddsEntry {
  name: string;
  position: string;
  probability: number;
  americanOdds: string;
  isGoalie: boolean;
  highlights: string[];
}

function OddsRow({ entry, index, isLast }: { entry: OddsEntry; index: number; isLast: boolean }) {
  const isFavorite = index === 0;
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-4 sm:px-6 py-4 items-center transition-colors ${
        !isLast ? "border-b border-border/50" : ""
      } ${isFavorite ? "bg-[#cc1533]/5" : "hover:bg-surface-light/30"}`}
    >
      <span className={`text-lg font-black w-6 text-center ${isFavorite ? "text-[#cc1533]" : "text-muted/40"}`}>
        {index + 1}
      </span>

      <div className="min-w-0">
        <p className={`font-bold text-sm sm:text-base truncate ${isFavorite ? "text-white" : "text-white/90"}`}>
          {getNickname(entry.name)}
        </p>
        <p className="text-[10px] text-muted uppercase tracking-wider">
          {entry.position}
        </p>
      </div>

      <div className="hidden sm:flex gap-2">
        {entry.highlights.map((h) => (
          <span
            key={h}
            className="text-xs text-muted bg-surface-light/50 rounded px-2 py-0.5 whitespace-nowrap"
          >
            {h}
          </span>
        ))}
      </div>

      <div className="w-14 text-right text-sm text-muted">
        {(entry.probability * 100).toFixed(1)}%
      </div>

      <div className={`w-20 text-right font-mono font-bold text-lg ${
        isFavorite
          ? "text-[#cc1533]"
          : entry.americanOdds.startsWith("+")
          ? "text-emerald-400"
          : "text-white"
      }`}>
        {entry.americanOdds}
      </div>
    </div>
  );
}

/* ── Full MVP Odds Table with expandable dropdown ── */

export function MvpOddsTable({ odds }: { odds: OddsEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const top5 = odds.slice(0, 5);
  const rest = odds.slice(5);

  return (
    <div className="bg-navy border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-4 sm:px-6 py-3 border-b border-border text-[10px] sm:text-xs uppercase tracking-wider text-muted">
        <span className="w-6" />
        <span>Player</span>
        <span className="text-right hidden sm:block">Stats</span>
        <span className="text-right w-14">Prob</span>
        <span className="text-right w-20">Odds</span>
      </div>

      {/* Top 5 */}
      {top5.map((entry, i) => (
        <OddsRow
          key={`${entry.name}-${entry.isGoalie ? "g" : "s"}`}
          entry={entry}
          index={i}
          isLast={rest.length === 0 && i === top5.length - 1}
        />
      ))}

      {/* Expandable rest */}
      {rest.length > 0 && (
        <>
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full px-4 sm:px-6 py-3 flex items-center justify-center gap-2 border-t border-border/50 text-sm text-muted hover:text-white hover:bg-surface-light/20 transition-colors cursor-pointer"
          >
            <span className="uppercase tracking-wider text-xs font-bold">
              {showAll ? "Show Less" : `Show All Players (${odds.length})`}
            </span>
            <motion.span
              animate={{ rotate: showAll ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {showAll && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {rest.map((entry, i) => (
                  <OddsRow
                    key={`${entry.name}-${entry.isGoalie ? "g" : "s"}`}
                    entry={entry}
                    index={i + 5}
                    isLast={i === rest.length - 1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
