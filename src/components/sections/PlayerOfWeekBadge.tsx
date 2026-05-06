"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { WeeklyPlayer } from "@/lib/discord";
import type { PotwWeek } from "@/lib/articles";
import { getNickname } from "@/lib/nicknames";

interface Props {
  player: WeeklyPlayer;
  standings?: WeeklyPlayer[];
  week?: PotwWeek | null;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi, (m) => m.toUpperCase());
}

function formatWeek(week?: PotwWeek | null): string | null {
  if (!week) return null;
  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(week.start)} to ${fmt(week.end)}`;
}

export default function PlayerOfWeekBadge({ player, standings = [], week }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const weekLabel = formatWeek(week);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY < window.innerHeight * 2.5);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nickname = getNickname(player.name);
  const topStat = player.isGoalie
    ? `+${player.deltaSaves} SVS`
    : `+${player.deltaPoints} PTS`;

  const goalieShutouts = player.deltaShutouts ?? 0;
  const statPills = player.isGoalie
    ? ([
        player.deltaSaves > 0 && `+${player.deltaSaves} SVS`,
        goalieShutouts > 0 && `+${goalieShutouts} SO`,
      ].filter(Boolean) as string[])
    : [
        player.deltaGoals > 0 && `+${player.deltaGoals} G`,
        player.deltaAssists > 0 && `+${player.deltaAssists} A`,
        player.deltaHits > 0 && `+${player.deltaHits} HIT`,
      ].filter(Boolean) as string[];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed left-0 top-24 z-40 hidden md:flex flex-col items-start"
          initial={{ x: -220, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -220, opacity: 0 }}
          transition={{ delay: 1.8, type: "spring", stiffness: 180, damping: 24 }}
        >
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="expanded"
                initial={{ x: -220, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -220, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="relative bg-[#0d1528]/95 backdrop-blur-sm border border-white/10 border-l-0 rounded-r-2xl overflow-hidden w-52"
              >
                {/* Red top accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-l from-[#cc1533] to-[#cc1533]/30" />

                {/* Collapse button */}
                <button
                  onClick={() => setCollapsed(true)}
                  className="absolute top-3 left-3 text-white/20 hover:text-white/60 transition-colors z-10"
                  aria-label="Collapse"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5l-7 7 7 7" />
                  </svg>
                </button>

                {/* Info button */}
                {standings.length > 0 && (
                  <button
                    onClick={(e) => { e.preventDefault(); setShowInfo(!showInfo); }}
                    className="absolute top-3 right-3 text-white/20 hover:text-white/60 transition-colors z-10"
                    aria-label="Show standings"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}

                <AnimatePresence mode="wait">
                  {showInfo ? (
                    <motion.div
                      key="info"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="px-5 py-5 pr-7"
                    >
                      <p className="text-[#cc1533] text-[9px] font-bold uppercase tracking-[0.22em] mb-1">
                        Weekly Standings
                      </p>
                      {weekLabel && (
                        <p className="text-white/40 text-[9px] uppercase tracking-widest mb-3">
                          {weekLabel}
                        </p>
                      )}
                      <div className="space-y-2">
                        {standings.map((p, i) => (
                          <div key={p.name} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[10px] font-bold ${i === 0 ? "text-[#cc1533]" : "text-white/30"}`}>
                                {i + 1}.
                              </span>
                              <span className={`text-xs font-bold truncate ${i === 0 ? "text-white" : "text-white/50"}`}>
                                {titleCase(getNickname(p.name))}
                              </span>
                            </div>
                            <span className="text-[10px] text-white/30 whitespace-nowrap">
                              {p.weeklyScore.toFixed(0)} pts
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); setShowInfo(false); }}
                        className="text-[#cc1533]/60 text-[9px] uppercase tracking-widest mt-4 font-bold"
                      >
                        ← Back
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Link href="/stats" className="block px-5 py-5 pr-7">
                        {/* Label */}
                        <p className={`text-[#cc1533] text-[9px] font-bold uppercase tracking-[0.22em] ${weekLabel ? "mb-1" : "mb-4"}`}>
                          Player of the Week
                        </p>
                        {weekLabel && (
                          <p className="text-white/40 text-[9px] uppercase tracking-widest mb-3">
                            {weekLabel}
                          </p>
                        )}

                        {/* Player name */}
                        <p className="text-white font-black text-2xl leading-none mb-1">
                          {nickname}
                        </p>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-5">
                          {player.position}
                        </p>

                        {/* Divider */}
                        <div className="h-px bg-white/10 mb-5" />

                        {/* Top stat big */}
                        <p className="text-[#cc1533] font-black text-3xl leading-none mb-1">
                          {topStat}
                        </p>
                        <p className="text-white/30 text-[9px] uppercase tracking-widest mb-5">
                          This week
                        </p>

                        {/* Stat breakdown pills */}
                        {statPills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {statPills.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2.5 py-1 rounded-md"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* CTA */}
                        <p className="text-[#cc1533]/60 text-[9px] uppercase tracking-widest mt-5 font-bold">
                          View stats →
                        </p>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed tab */}
          <AnimatePresence initial={false}>
            {collapsed && (
              <motion.button
                key="collapsed"
                onClick={() => setCollapsed(false)}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="relative bg-[#0d1528]/95 backdrop-blur-sm border border-white/10 border-l-0 rounded-r-xl overflow-hidden px-3 py-4 flex flex-col items-center gap-3"
                aria-label="Expand player of the week"
              >
                {/* Red top accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#cc1533]" />

                {/* Rotated label */}
                <span
                  className="text-[#cc1533] text-[8px] font-bold uppercase tracking-[0.2em] whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Player of the Week
                </span>

                {/* Red dot */}
                <span className="w-1.5 h-1.5 rounded-full bg-[#cc1533]" />

                {/* Player initials */}
                <span className="text-white font-black text-xs">
                  {nickname.slice(0, 3)}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
