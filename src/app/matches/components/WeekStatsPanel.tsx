"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Match } from "@/types";
import { getResult } from "../utils";
import { ScoreCard } from "./ScoreCard";

export function WeekStatsPanel({
  matches,
  weekLabel,
  onBack,
}: {
  matches: Match[];
  weekLabel: string;
  onBack: () => void;
}) {
  const summary = useMemo(() => {
    const totalGF = matches.reduce((s, m) => s + (m.scoreUs ?? 0), 0);
    const totalGA = matches.reduce((s, m) => s + (m.scoreThem ?? 0), 0);
    const totalShotsUs = matches.reduce((s, m) => s + (m.shotsUs ?? 0), 0);
    const totalShotsThem = matches.reduce((s, m) => s + (m.shotsThem ?? 0), 0);
    const w = matches.filter((m) => getResult(m) === "W").length;
    const l = matches.filter((m) => getResult(m) === "L").length;
    const shotDiff = totalShotsUs - totalShotsThem;
    return [
      {
        label: "Record",
        value: `${w}-${l}`,
        accent: w > l ? "text-emerald-400" : w < l ? "text-red" : "text-white",
      },
      { label: "Goals For", value: `${totalGF}`, accent: "text-emerald-400" },
      { label: "Goals Against", value: `${totalGA}`, accent: "text-red" },
      {
        label: "Shot Diff",
        value: `${shotDiff > 0 ? "+" : ""}${shotDiff}`,
        accent: shotDiff >= 0 ? "text-cyan-500" : "text-red",
      },
    ];
  }, [matches]);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors cursor-pointer group"
        >
          <span className="text-red group-hover:-translate-x-1 transition-transform">&larr;</span>
          <span className="text-xs uppercase tracking-widest font-bold">All Weeks</span>
        </button>
      </motion.div>

      {/* Week header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="block w-1 h-6 bg-red rounded-sm" />
          <h2 className="text-2xl font-black uppercase tracking-wider">
            {weekLabel}
          </h2>
        </div>
        <div className="flex flex-col gap-px ml-4">
          <div className="h-px bg-red/30" />
          <div className="h-px bg-light-blue/15" />
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
            className="bg-navy/70 border border-border rounded-lg px-4 py-3 text-center"
          >
            <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
              {s.label}
            </p>
            <p className={`text-xl font-black tabular-nums ${s.accent}`}>
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Game cards section */}
      <div className="mt-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="flex items-center gap-3 mb-4"
        >
          <span className="block w-1 h-5 bg-red rounded-sm" />
          <h3 className="text-lg font-black uppercase tracking-wider">
            Games
          </h3>
          <span className="text-xs text-muted/50 tabular-nums">
            {matches.length} {matches.length === 1 ? "game" : "games"}
          </span>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {matches.map((match, i) => (
            <ScoreCard key={match.id} match={match} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
