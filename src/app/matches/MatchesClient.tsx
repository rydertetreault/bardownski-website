"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Match, ClubRecord } from "@/types";
import { getResult } from "./utils";
import { StreakBanner } from "./components/StreakBanner";
import { LatestMatchHero } from "./components/LatestMatchHero";
import { WeekStatsPanel } from "./components/WeekStatsPanel";
import { TrendsPanel } from "./components/TrendsPanel";

/* ── Week period helpers ── */

interface WeekPeriod {
  dateRange: string;
  startTs: number;
  endTs: number;
}

function getWeekPeriods(matches: Match[]): WeekPeriod[] {
  if (matches.length === 0) return [];

  // Anchor to the current week (local time) and show 3 most recent weeks
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now);
  currentMonday.setDate(currentMonday.getDate() + mondayOffset);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks: WeekPeriod[] = [];

  // Generate current week + 2 prior weeks (3 total), oldest first
  for (let w = 2; w >= 0; w--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(weekStart.getDate() - w * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const fmtStart = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const fmtEnd = weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    weeks.push({
      dateRange: `${fmtStart} – ${fmtEnd}`,
      startTs: Math.floor(weekStart.getTime() / 1000),
      endTs: Math.floor(weekEnd.getTime() / 1000),
    });
  }

  // Most recent week first
  return weeks.reverse();
}

/* ── Main Client Component ── */
export default function MatchesClient({
  matches,
  clubRecord,
}: {
  matches: Match[];
  clubRecord: ClubRecord | null;
}) {
  const weeks = useMemo(() => getWeekPeriods(matches), [matches]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const filteredMatches = useMemo(() => {
    if (selectedWeek === null) return matches;
    const week = weeks[selectedWeek];
    if (!week) return matches;
    return matches.filter(
      (m) => m.timestamp >= week.startTs && m.timestamp <= week.endTs
    );
  }, [matches, weeks, selectedWeek]);

  const { wins, losses, otl } = useMemo(() => ({
    wins: clubRecord?.wins ?? matches.filter((m) => getResult(m) === "W").length,
    losses: clubRecord?.losses ?? matches.filter((m) => getResult(m) === "L").length,
    otl: clubRecord?.otl ?? 0,
  }), [matches, clubRecord]);

  // Compute current streak + longest win streak from matches (sorted newest first)
  const { streakType, streakCount, isClubRecord } = useMemo(() => {
    // Current streak
    let sType: "W" | "L" | null = null;
    let sCount = 0;
    for (let i = 0; i < matches.length; i++) {
      const r = getResult(matches[i]);
      if (!r) continue;
      if (sType === null) {
        sType = r;
        sCount = 1;
      } else if (r === sType) {
        sCount++;
      } else {
        break;
      }
    }
    // Longest win streak (iterate oldest to newest)
    let longestWin = 0;
    let runningWin = 0;
    for (let i = matches.length - 1; i >= 0; i--) {
      const r = getResult(matches[i]);
      if (r === "W") {
        runningWin++;
        longestWin = Math.max(longestWin, runningWin);
      } else {
        runningWin = 0;
      }
    }
    return {
      streakType: sType,
      streakCount: sCount,
      isClubRecord: sType === "W" && sCount >= longestWin && sCount > 0,
    };
  }, [matches]);

  // Current week record (Mon-Sun, local time)
  const weekRecord = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = Math.floor(monday.getTime() / 1000);
    const weekEnd = Math.floor(sunday.getTime() / 1000);

    const weekMatches = matches.filter(
      (m) => m.timestamp >= weekStart && m.timestamp <= weekEnd
    );
    const w = weekMatches.filter((m) => getResult(m) === "W").length;
    const l = weekMatches.filter((m) => getResult(m) === "L").length;
    const gf = weekMatches.reduce((s, m) => s + (m.scoreUs ?? 0), 0);
    const ga = weekMatches.reduce((s, m) => s + (m.scoreThem ?? 0), 0);

    const fmtStart = monday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const fmtEnd = sunday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return { w, l, gp: weekMatches.length, gf, ga, label: `${fmtStart} – ${fmtEnd}` };
  }, [matches]);

  // Pre-compute match counts per week so we don't filter per-button per-render
  const weekMatchCounts = useMemo(
    () => weeks.map((week) => matches.filter((m) => m.timestamp >= week.startTs && m.timestamp <= week.endTs).length),
    [weeks, matches]
  );

  return (
    <>
      {/* Season record bar (centered, highlighted) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-center mb-6"
      >
        <div className="flex items-center gap-5 bg-navy/60 border border-border/50 rounded-lg px-7 py-3.5">
          <span className="text-xs text-muted uppercase tracking-[0.2em] font-semibold">
            Season
          </span>
          <div className="w-px h-6 bg-border/40" />
          <div className="flex items-center gap-4 text-lg font-mono font-black">
            <span className="text-emerald-400">{wins} <span className="text-sm font-bold">W</span></span>
            <span className="text-muted/30">&middot;</span>
            <span className="text-red">{losses} <span className="text-sm font-bold">L</span></span>
            <span className="text-muted/30">&middot;</span>
            <span className="text-amber-400">{otl} <span className="text-sm font-bold">OTL</span></span>
          </div>
          <div className="w-px h-6 bg-border/40" />
          <span className="text-xs text-muted/60 tabular-nums font-semibold">
            {wins + losses + otl} GP
          </span>
        </div>
      </motion.div>

      {/* Streak banner (show when 3+ game streak) */}
      {streakType && streakCount >= 3 && (
        <StreakBanner streakType={streakType} streakCount={streakCount} isClubRecord={isClubRecord} />
      )}

      {/* Games section */}
      {weeks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="block w-1 h-5 bg-red rounded-sm" />
            <h2 className="text-lg font-black uppercase tracking-wider">
              Games
            </h2>
            {/* This week record inline */}
            <div className="flex items-center gap-3 ml-auto bg-navy/40 border border-border/30 rounded-lg px-4 py-1.5">
              <span className="text-[10px] text-muted/50 uppercase tracking-wider font-semibold">
                This Week
              </span>
              <div className="w-px h-4 bg-border/30" />
              <div className="flex items-center gap-2 text-sm font-mono font-black">
                <span className="text-emerald-400">{weekRecord.w}<span className="text-[10px] font-bold ml-0.5">W</span></span>
                <span className="text-muted/30">&middot;</span>
                <span className="text-red">{weekRecord.l}<span className="text-[10px] font-bold ml-0.5">L</span></span>
              </div>
              <div className="w-px h-4 bg-border/30" />
              <div className="flex items-center gap-2 text-[10px] text-muted/40 tabular-nums">
                <span>{weekRecord.gf} GF</span>
                <span>{weekRecord.ga} GA</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-px ml-4 mb-3">
            <div className="h-px bg-red/30" />
            <div className="h-px bg-light-blue/15" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {weeks.map((week, i) => {
              const matchCount = weekMatchCounts[i];
              const isSelected = selectedWeek === i;
              return (
                <button
                  key={i}
                  onClick={() =>
                    setSelectedWeek(isSelected ? null : i)
                  }
                  className={`shrink-0 px-4 py-2 rounded-lg transition-all cursor-pointer flex flex-col items-center ${
                    isSelected
                      ? "bg-red shadow-lg shadow-red/20"
                      : "bg-navy/60 border border-border/50 hover:border-border"
                  }`}
                >
                  <span
                    className={`text-xs font-bold tracking-wide ${
                      isSelected
                        ? "text-white"
                        : "text-muted hover:text-white"
                    }`}
                  >
                    {week.dateRange}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums mt-0.5 ${
                      isSelected
                        ? "text-white/70"
                        : matchCount > 0
                        ? "text-red/70"
                        : "text-muted/40"
                    }`}
                  >
                    {matchCount} {matchCount === 1 ? "game" : "games"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Red neon slope divider */}
      <div className="my-6 relative overflow-hidden" style={{ height: "48px" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 48" preserveAspectRatio="none">
          <path d="M0,14 Q360,20 720,28 Q1080,36 1440,34" fill="none" stroke="#ff1a3d" strokeOpacity="0.15" strokeWidth="32" />
          <path d="M0,14 Q360,20 720,28 Q1080,36 1440,34" fill="none" stroke="#ff2244" strokeOpacity="0.8" strokeWidth="2" />
        </svg>
      </div>

      {selectedWeek === null ? (
        <>
          {/* Latest match hero */}
          {matches.length > 0 && <LatestMatchHero match={matches[0]} />}

          {/* Crossing red + blue neon divider */}
          <div className="my-6 relative overflow-hidden" style={{ height: "48px" }}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 48" preserveAspectRatio="none">
              {/* Red glow + core - slopes down left to right */}
              <path d="M0,12 Q720,24 1440,38" fill="none" stroke="#ff1a3d" strokeOpacity="0.1" strokeWidth="28" />
              <path d="M0,12 Q720,24 1440,38" fill="none" stroke="#ff2244" strokeOpacity="0.6" strokeWidth="1.5" />
              {/* Blue glow + core - slopes up left to right, crosses the red */}
              <path d="M0,38 Q720,24 1440,10" fill="none" stroke="#5b9bd5" strokeOpacity="0.08" strokeWidth="24" />
              <path d="M0,38 Q720,24 1440,10" fill="none" stroke="#5b9bd5" strokeOpacity="0.5" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Analytics header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="block w-1 h-6 bg-red rounded-sm" />
              <h2 className="text-2xl font-black uppercase tracking-wider">
                Analytics
              </h2>
            </div>
            <div className="w-full mb-2 ml-4 flex flex-col gap-px">
              <div className="h-px bg-[#cc1533]/40" />
              <div className="h-px bg-[#5b9bd5]/25" />
            </div>
            <p className="text-xs text-muted uppercase tracking-widest ml-4">
              Season trends & performance breakdown
            </p>
          </motion.div>

          {/* Charts panel */}
          <TrendsPanel matches={matches} />
        </>
      ) : (
        <WeekStatsPanel
          matches={filteredMatches}
          weekLabel={weeks[selectedWeek!]?.dateRange ?? ""}
          onBack={() => setSelectedWeek(null)}
        />
      )}
    </>
  );
}
