"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WeeklyPlayer } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

interface Props {
  player: WeeklyPlayer;
  standings?: WeeklyPlayer[];
}

interface StatPillProps {
  label: string;
  value: number | string;
  highlight?: boolean;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi, (m) => m.toUpperCase());
}

function StatPill({ label, value, highlight }: StatPillProps) {
  return (
    <div
      className={`flex flex-col items-center px-3 py-1.5 rounded-md ${
        highlight
          ? "bg-[#cc1533]/15 border border-[#cc1533]/30"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <span
        className={`text-base font-black leading-none ${
          highlight ? "text-[#cc1533]" : "text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
        {label}
      </span>
    </div>
  );
}

export default function PlayerOfWeekSection({ player, standings = [] }: Props) {
  const [showStandings, setShowStandings] = useState(false);
  const nickname = getNickname(player.name);

  const skaterStats = [
    { label: "Goals", value: `+${player.deltaGoals}`, highlight: player.deltaGoals > 0 },
    { label: "Assists", value: `+${player.deltaAssists}`, highlight: player.deltaAssists > 0 },
    { label: "Points", value: `+${player.deltaPoints}`, highlight: true },
    { label: "Hits", value: `+${player.deltaHits}` },
  ];

  const goalieStats = [
    { label: "Saves", value: `+${player.deltaSaves}`, highlight: true },
  ];

  const stats = player.isGoalie ? goalieStats : skaterStats;

  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative rounded-xl overflow-hidden border border-white/[0.07]"
          style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.55) 0%, rgba(13,21,40,0.4) 100%)" }}
        >
          {/* Left red accent bar */}
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-b from-[#cc1533]/70 via-[#cc1533]/40 to-transparent" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-4 pl-8 pr-6 py-4">
            {/* Left — label + name */}
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-0.5">
                  <span className="w-1 h-3 bg-[#cc1533] rounded-sm" />
                  <span className="text-[#cc1533] text-[10px] font-bold uppercase tracking-[0.2em]">
                    Player of the Week
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                  {nickname}
                </h2>
                <p className="text-white/40 text-xs uppercase tracking-widest mt-0.5">
                  {player.position}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-white/10 mx-2" />

            {/* Right — stat pills + link */}
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start flex-1">
              {stats.map((s) => (
                <StatPill key={s.label} label={s.label} value={s.value} highlight={s.highlight} />
              ))}
              {standings.length > 0 ? (
                <button
                  onClick={() => setShowStandings(!showStandings)}
                  className="ml-2 text-xs text-[#cc1533] hover:text-red-400 uppercase tracking-widest font-bold transition-colors whitespace-nowrap"
                >
                  {showStandings ? "Hide Standings ↑" : "Full Standings →"}
                </button>
              ) : null}
            </div>
          </div>

          {/* Expandable standings table */}
          <AnimatePresence>
            {showStandings && standings.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-8 pb-5 pt-1">
                  <div className="h-px bg-white/10 mb-4" />
                  <div className="grid gap-2">
                    {standings.map((p, i) => (
                      <div
                        key={p.name}
                        className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg ${
                          i === 0 ? "bg-[#cc1533]/10 border border-[#cc1533]/20" : "bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-sm font-bold w-5 ${i === 0 ? "text-[#cc1533]" : "text-white/30"}`}>
                            {i + 1}
                          </span>
                          <span className={`text-sm font-bold truncate ${i === 0 ? "text-white" : "text-white/60"}`}>
                            {titleCase(getNickname(p.name))}
                          </span>
                          <span className="text-[10px] text-white/30 uppercase">
                            {p.isGoalie ? "G" : p.position}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${i === 0 ? "text-[#cc1533]" : "text-white/50"}`}>
                          {p.weeklyScore.toFixed(0)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
