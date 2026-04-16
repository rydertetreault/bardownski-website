"use client";

import { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match, ClubRecord } from "@/types";
import { getNickname } from "@/lib/nicknames";
import { getResult } from "./utils";


/* ── Tooltip alignment helper ── */

function tooltipAlign(pctX: number): string {
  if (pctX < 15) return "translate-x-0";
  if (pctX > 85) return "-translate-x-full";
  return "-translate-x-1/2";
}

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

/* ── Latest Match Hero ── */

function LatestMatchHero({ match }: { match: Match }) {
  const result = getResult(match);
  const isWin = result === "W";
  const isForfeit = match.id.startsWith("forfeit-");
  const hasStats = match.shotsUs !== undefined || match.toaUs !== undefined;
  const hasStars = match.threeStars && match.threeStars.length === 3;

  const content = (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), 0 100%)",
      }}
    >
      {/* Dark base + vignette */}
      <div className="absolute inset-0 bg-[#0b0f1a]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/90" />

      {/* Diagonal slash accents - blue left, red right */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute -left-8 top-0 h-full w-[55%] opacity-[0.07]"
          viewBox="0 0 400 400"
          preserveAspectRatio="none"
        >
          <polygon points="100,0 200,0 80,400 0,400" fill="#5b9bd5" />
        </svg>
        <svg
          className="absolute -right-8 top-0 h-full w-[55%] opacity-10"
          viewBox="0 0 400 400"
          preserveAspectRatio="none"
        >
          <polygon points="260,0 400,0 280,400 160,400" fill="#cc1533" />
        </svg>
      </div>

      {/* Red top edge */}
      <div className="h-[3px] bg-gradient-to-r from-[#cc1533] via-[#cc1533] to-transparent" />

      <div className="relative px-5 md:px-10 py-6 md:py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-sm bg-[#cc1533]" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50">
              Latest Result
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs text-white/30 uppercase tracking-widest font-medium">
              {match.date}
            </span>
            {match.matchType === "finals" && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 ml-1"
                style={{
                  clipPath:
                    "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                }}
              >
                Finals
              </span>
            )}
            {match.forfeit && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                Forfeit
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-center gap-4 md:gap-0">
          {/* Bardownski side */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 justify-end">
            <div className="text-right hidden sm:block">
              <p className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                Bardownski
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5 capitalize">
                {match.homeAway}
              </p>
            </div>
            <div className="relative w-10 h-10 md:w-14 md:h-14 shrink-0">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Score block */}
          <div className="mx-3 md:mx-8 flex items-center gap-2 md:gap-4">
            <div
              className="flex items-center justify-center min-w-[48px] md:min-w-[72px] py-2 md:py-2.5"
              style={{
                backgroundColor: isWin
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(255,255,255,0.05)",
                clipPath:
                  "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              <span
                className={`text-3xl md:text-5xl font-black tabular-nums ${isWin ? "text-white" : "text-white/40"}`}
              >
                {match.scoreUs}
              </span>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-bold text-white/20 uppercase">
                vs
              </span>
              <div className="w-px h-3 bg-white/10" />
            </div>

            <div
              className="flex items-center justify-center min-w-[48px] md:min-w-[72px] py-2 md:py-2.5"
              style={{
                backgroundColor: !isWin
                  ? "rgba(200,16,46,0.12)"
                  : "rgba(255,255,255,0.05)",
                clipPath:
                  "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              <span
                className={`text-3xl md:text-5xl font-black tabular-nums ${!isWin ? "text-white" : "text-white/40"}`}
              >
                {match.scoreThem}
              </span>
            </div>
          </div>

          {/* Opponent side */}
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <div className="text-left">
              <p className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                {match.opponent}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5 capitalize">
                {match.homeAway === "home" ? "away" : "home"}
              </p>
            </div>
          </div>
        </div>
        {/* Mobile team names */}
        <div className="flex justify-between mt-2 sm:hidden px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            Bardownski
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            {match.opponent}
          </p>
        </div>

        {/* Result badge */}
        {match.status === "final" && result && (
          <div className="flex justify-center mt-4">
            <span
              className={`text-[10px] font-black uppercase tracking-[0.3em] px-5 py-1 ${
                isWin
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                  : "text-red bg-red/10 border border-red/20"
              }`}
              style={{
                clipPath:
                  "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              {isWin ? "Victory" : "Defeat"}
            </span>
          </div>
        )}

        {/* Quick stats */}
        {hasStats && (
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            {match.shotsUs !== undefined && (
              <span className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-md">
                Shots{" "}
                <span className="font-bold text-white/80 font-mono">
                  {match.shotsUs}-{match.shotsThem}
                </span>
              </span>
            )}
            {match.toaUs && (
              <span className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-md">
                TOA{" "}
                <span className="font-bold text-white/80 font-mono">
                  {match.toaUs}
                </span>
              </span>
            )}
            {match.passCompUs !== undefined && (
              <span className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-md">
                Pass%{" "}
                <span className="font-bold text-white/80 font-mono">
                  {match.passCompUs}%
                </span>
              </span>
            )}
          </div>
        )}

        {/* Three stars */}
        {hasStars && match.threeStars && (
          <div className="flex items-center justify-center gap-4 md:gap-6 mt-4">
            {match.threeStars.map((star, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-amber-400 text-[10px]">
                  {"★".repeat(3 - i)}
                </span>
                <span
                  className={`text-[10px] font-bold ${star.isOurPlayer ? "text-white/80" : "text-white/40"}`}
                >
                  {star.isOurPlayer ? getNickname(star.name) : star.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* View details CTA */}
        {!isForfeit && (
          <div className="flex justify-center mt-4">
            <span className="text-[10px] text-red uppercase tracking-widest font-bold">
              View Full Details &rarr;
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (isForfeit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <Link
        href={`/matches/${match.id}`}
        className="block hover:opacity-95 transition-opacity"
      >
        {content}
      </Link>
    </motion.div>
  );
}

/* ── Team Row (NHL-style: logo | name | indicator | score) ── */
function TeamRow({
  name,
  score,
  isWinner,
  isBardownski,
}: {
  name: string;
  score: number | null;
  isWinner: boolean;
  isBardownski: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
        isWinner ? "bg-white/[0.03]" : ""
      }`}
    >
      {/* Team logo / initial */}
      {isBardownski ? (
        <div className="relative w-7 h-7 shrink-0">
          <Image
            src="/images/logo/BD - logo.png"
            alt="BD"
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className="w-7 h-7 shrink-0 rounded bg-navy-light/50 border border-border/30 flex items-center justify-center">
          <span className="text-[10px] font-bold text-muted/60">
            {name.charAt(0)}
          </span>
        </div>
      )}

      {/* Team name */}
      <span
        className={`flex-1 text-sm truncate ${
          isWinner ? "font-bold text-white" : "font-medium text-muted"
        }`}
      >
        {name}
      </span>

      {/* Win indicator dot */}
      {isWinner && (
        <div className="w-1.5 h-1.5 rounded-full bg-red shrink-0" />
      )}

      {/* Score */}
      <span
        className={`text-lg tabular-nums min-w-[1.75rem] text-right ${
          isWinner ? "font-black text-white" : "font-bold text-muted"
        }`}
      >
        {score !== null ? score : "\u2013"}
      </span>
    </div>
  );
}

/* ── Score Card (NHL-style game card) ── */
function ScoreCard({ match, index }: { match: Match; index: number }) {
  const result = getResult(match);
  const isWin = result === "W";
  const isFinal = match.status === "final";
  const isSyntheticForfeit = match.id.startsWith("forfeit-");

  // NHL convention: away team on top, home team on bottom
  const awayTeam =
    match.homeAway === "home"
      ? {
          name: match.opponent,
          score: match.scoreThem,
          isBardownski: false,
          isWinner: isFinal && !isWin,
        }
      : {
          name: "Bardownski",
          score: match.scoreUs,
          isBardownski: true,
          isWinner: isFinal && isWin,
        };

  const homeTeam =
    match.homeAway === "home"
      ? {
          name: "Bardownski",
          score: match.scoreUs,
          isBardownski: true,
          isWinner: isFinal && isWin,
        }
      : {
          name: match.opponent,
          score: match.scoreThem,
          isBardownski: false,
          isWinner: isFinal && !isWin,
        };

  const accentColor = isWin ? "#10b981" : "#cc1533";

  const cardContent = (
    <div className="relative overflow-hidden">
      {/* Top accent edge */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, ${accentColor}, ${accentColor}99, transparent)`,
        }}
      />
      {/* Corner glow */}
      <div
        className="absolute top-0 left-0 w-32 h-32 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 0% 0%, ${accentColor}15 0%, transparent 70%)`,
        }}
      />
      {/* Angled accent stripe */}
      <div
        className="absolute top-0 right-0 w-[40%] h-full pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 0%, ${accentColor}08 100%)`,
          clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      />

      {/* Status header */}
      <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {isFinal && result ? (
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                isWin ? "text-emerald-400" : "text-red"
              }`}
            >
              {isWin ? "Victory" : "Defeat"}
            </span>
          ) : match.status === "live" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red animate-pulse">
              Live
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted/50">
              Scheduled
            </span>
          )}
          {match.forfeit && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
              Forfeit
            </span>
          )}
          {match.matchType === "finals" && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5"
              style={{
                clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
              }}
            >
              Finals
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted/50 tracking-widest">
          {match.date}
        </span>
      </div>

      {/* Team rows */}
      <div className="relative py-1">
        <TeamRow {...awayTeam} />
        <div className="mx-4 h-px bg-white/[0.05]" />
        <TeamRow {...homeTeam} />
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-center py-2 border-t border-white/[0.06]">
        <span
          className={`text-[10px] uppercase tracking-widest font-bold ${
            isSyntheticForfeit ? "text-muted/30" : "text-red/70"
          }`}
        >
          {isSyntheticForfeit ? "Opponent DNF" : "View Details \u2192"}
        </span>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: "easeOut" }}
    >
      {isSyntheticForfeit ? (
        <div
          className="rounded-xl border border-border/50 overflow-hidden"
          style={{
            background: "linear-gradient(140deg, rgba(13,21,38,0.95) 0%, rgba(18,26,42,0.9) 50%, rgba(10,17,32,0.95) 100%)",
          }}
        >
          {cardContent}
        </div>
      ) : (
        <Link
          href={`/matches/${match.id}`}
          className="block rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-red/40 hover:shadow-xl hover:shadow-red/10 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(140deg, rgba(13,21,38,0.95) 0%, rgba(18,26,42,0.9) 50%, rgba(10,17,32,0.95) 100%)",
          }}
        >
          {cardContent}
        </Link>
      )}
    </motion.div>
  );
}

/* ── Trend Chart Components ── */

function ChartHeader({
  label,
  legend,
}: {
  label: string;
  legend?: { color: string; text: string }[];
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-0.5 h-4 bg-red rounded-full" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </span>
      {legend && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-3">
            {legend.map((l) => (
              <div key={l.text} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-0.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-[9px] text-muted">{l.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const RESULTS_COLLAPSED_COUNT = 10;

const ResultsStrip = memo(({ matches }: { matches: Match[] }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { games, streakType, streakCount } = useMemo(() => {
    const g = [...matches].reverse();
    let sType: "W" | "L" | null = null;
    let sCount = 0;
    for (let i = 0; i < matches.length; i++) {
      const r = getResult(matches[i]);
      if (i === 0) {
        sType = r;
        sCount = 1;
      } else if (r === sType) {
        sCount++;
      } else {
        break;
      }
    }
    return { games: g, streakType: sType, streakCount: sCount };
  }, [matches]);

  const canExpand = games.length > RESULTS_COLLAPSED_COUNT;
  // Most recent first: reverse so newest is top-left
  const visibleGames = expanded ? [...games].reverse() : [...games].reverse().slice(0, RESULTS_COLLAPSED_COUNT);

  return (
    <div className="relative rounded-xl border border-border/50 p-4"
      style={{ background: "linear-gradient(140deg, rgba(13,21,38,0.95) 0%, rgba(18,26,42,0.9) 50%, rgba(10,17,32,0.95) 100%)" }}>
      {/* Decorative layers clipped to card bounds */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        {/* Accent edges */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#cc1533] via-[#cc1533]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#cc1533]/20 via-transparent to-transparent" />
        {/* Corner glow */}
        <div className="absolute top-0 left-0 w-40 h-40" style={{
          background: "radial-gradient(circle at 0% 0%, rgba(204,21,51,0.08) 0%, transparent 70%)",
        }} />
        {/* Angled accent stripe */}
        <div className="absolute top-0 right-0 w-[30%] h-full" style={{
          background: "linear-gradient(135deg, transparent 0%, rgba(204,21,51,0.03) 100%)",
          clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)",
        }} />
      </div>
      <div className="relative">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-0.5 h-4 bg-red rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Results
          </span>
          {!expanded && canExpand && (
            <span className="text-[10px] text-muted/40 tabular-nums">
              (Last {RESULTS_COLLAPSED_COUNT} of {games.length})
            </span>
          )}
          {streakType && streakCount > 1 && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ml-auto ${
                streakType === "W"
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                  : "text-red bg-red/10 border border-red/20"
              }`}
            >
              {streakCount}{streakType} Streak
            </span>
          )}
        </div>
        {/* Compact tile grid: 5 per row collapsed, flex-wrap for expanded */}
        <div className={`grid gap-1.5 ${expanded ? "grid-cols-5 sm:grid-cols-10" : "grid-cols-5"}`}>
          {visibleGames.map((match, i) => {
            const result = getResult(match);
            const isWin = result === "W";
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={match.id}
                className="relative"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  className={`rounded-md px-2 py-1.5 text-center transition-all duration-150 cursor-default ${
                    isWin
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-red/10 border border-red/20"
                  } ${isHovered ? "brightness-150 border-white/20" : ""}`}
                >
                  <span className={`block text-[10px] font-black ${isWin ? "text-emerald-400" : "text-red"}`}>
                    {result}
                  </span>
                  <span className="block text-[9px] text-white/60 font-bold tabular-nums leading-tight">
                    {match.scoreUs}-{match.scoreThem}
                  </span>
                  <span className="block text-[8px] text-muted/40 truncate leading-tight mt-0.5">
                    {match.opponent}
                  </span>
                </div>
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-navy border border-border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap z-20 pointer-events-none">
                    <p className="text-[10px] text-muted mb-0.5">{match.date}</p>
                    <p className="text-xs font-bold text-white">
                      BD {match.scoreUs} - {match.scoreThem}{" "}
                      <span className="text-muted font-medium">
                        {match.opponent}
                      </span>
                    </p>
                    {match.shotsUs !== undefined && (
                      <p className="text-[10px] text-muted/70 mt-0.5">
                        Shots {match.shotsUs}-{match.shotsThem}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer: win rate bar + expand toggle */}
        <div className="flex items-center mt-3 gap-3">
          {(() => {
            const w = games.filter((m) => getResult(m) === "W").length;
            const l = games.length - w;
            const pct = games.length > 0 ? Math.round((w / games.length) * 100) : 0;
            return (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 text-xs font-black tabular-nums">{w}<span className="text-[9px] font-bold ml-0.5">W</span></span>
                  <span className="text-muted/30 text-[9px]">/</span>
                  <span className="text-red text-xs font-black tabular-nums">{l}<span className="text-[9px] font-bold ml-0.5">L</span></span>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-black tabular-nums text-white/50">{pct}%</span>
              </div>
            );
          })()}
          {canExpand && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-bold uppercase tracking-wider text-muted/50 hover:text-white/70 transition-colors cursor-pointer shrink-0"
            >
              {expanded ? "Show Recent" : `All ${games.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

const GoalsTrendChart = memo(({ matches }: { matches: Match[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const games = useMemo(() => [...matches].reverse(), [matches]);
  const chartData = useMemo(() => {
    if (games.length < 2) return null;
    const W = 600, H = 200;
    const pad = { t: 16, r: 10, b: 16, l: 28 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const maxG = Math.max(...games.flatMap((g) => [g.scoreUs ?? 0, g.scoreThem ?? 0]), 1) + 1;
    const xStep = cW / (games.length - 1);
    const ptsGF = games.map((g, i) => ({ x: pad.l + i * xStep, y: pad.t + cH - ((g.scoreUs ?? 0) / maxG) * cH }));
    const ptsGA = games.map((g, i) => ({ x: pad.l + i * xStep, y: pad.t + cH - ((g.scoreThem ?? 0) / maxG) * cH }));
    const lineGF = ptsGF.map((p) => `${p.x},${p.y}`).join(" ");
    const lineGA = ptsGA.map((p) => `${p.x},${p.y}`).join(" ");
    const areaGF = `${pad.l},${pad.t + cH} ${lineGF} ${pad.l + cW},${pad.t + cH}`;
    const gridYs = Array.from({ length: maxG + 1 }, (_, i) => ({ y: pad.t + cH - (i / maxG) * cH, val: i }));
    return { W, H, pad, cW, cH, ptsGF, ptsGA, lineGF, lineGA, areaGF, gridYs };
  }, [games]);

  if (!chartData) return null;
  const { W, H, pad, cW, cH, ptsGF, ptsGA, lineGF, lineGA, areaGF, gridYs } = chartData;
  const hPctX = hoveredIndex !== null ? (ptsGF[hoveredIndex].x / W) * 100 : 0;

  const avgGF = games.length > 0 ? (games.reduce((s, g) => s + (g.scoreUs ?? 0), 0) / games.length).toFixed(1) : "0";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 p-4"
      style={{ background: "linear-gradient(145deg, rgba(13,21,38,0.95) 0%, rgba(20,14,24,0.9) 60%, rgba(10,17,32,0.95) 100%)" }}>
      {/* Accent edges */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#cc1533] via-[#cc1533]/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#cc1533]/20 via-transparent to-transparent" />
      {/* Angled accent stripe */}
      <div className="absolute top-0 right-0 w-[40%] h-full pointer-events-none" style={{
        background: "linear-gradient(135deg, transparent 0%, rgba(204,21,51,0.04) 100%)",
        clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)",
      }} />
      {/* Corner glow */}
      <div className="absolute top-0 left-0 w-40 h-40 pointer-events-none" style={{
        background: "radial-gradient(circle at 0% 0%, rgba(204,21,51,0.1) 0%, transparent 70%)",
      }} />
      {/* Big stat callout */}
      <div className="absolute top-3 right-4 pointer-events-none select-none">
        <p className="text-[9px] text-white/20 uppercase tracking-widest text-right">Avg GF</p>
        <p className="text-3xl font-black tabular-nums text-[#cc1533]/20 leading-none text-right">{avgGF}</p>
      </div>
      <div className="relative">
        <ChartHeader
          label="Goals Per Game"
          legend={[
            { color: "#cc1533", text: "GF" },
            { color: "rgba(255,255,255,0.3)", text: "GA" },
          ]}
        />
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[200px]"
            preserveAspectRatio="none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * W;
              if (svgX < pad.l || svgX > W - pad.r) { setHoveredIndex(null); return; }
              const idx = Math.round(((svgX - pad.l) / cW) * (games.length - 1));
              setHoveredIndex(Math.max(0, Math.min(games.length - 1, idx)));
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="gfAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cc1533" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#cc1533" stopOpacity="0.02" />
              </linearGradient>
              <filter id="gfGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {gridYs.map((g) => (
              <g key={g.val}>
                <line x1={pad.l} y1={g.y} x2={W - pad.r} y2={g.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={pad.l - 8} y={g.y + 3} textAnchor="end" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">{g.val}</text>
              </g>
            ))}
            <polygon points={areaGF} fill="url(#gfAreaGrad)" />
            <polyline points={lineGA} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="4,4" strokeLinecap="round" />
            <polyline points={lineGF} fill="none" stroke="#cc1533" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#gfGlow)" />
            {ptsGA.map((p, i) => (
              <circle key={`ga-${i}`} cx={p.x} cy={p.y} r="2.5" fill="rgba(255,255,255,0.25)"
                opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1} />
            ))}
            {ptsGF.map((p, i) => (
              <circle key={`gf-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#cc1533"
                opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1} />
            ))}
            {hoveredIndex !== null && (
              <>
                <line x1={ptsGF[hoveredIndex].x} y1={pad.t} x2={ptsGF[hoveredIndex].x} y2={pad.t + cH}
                  stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4" />
                <circle cx={ptsGF[hoveredIndex].x} cy={ptsGF[hoveredIndex].y} r="8" fill="rgba(204,21,51,0.25)" />
                <circle cx={ptsGF[hoveredIndex].x} cy={ptsGF[hoveredIndex].y} r="4.5" fill="#cc1533" />
                <circle cx={ptsGA[hoveredIndex].x} cy={ptsGA[hoveredIndex].y} r="7" fill="rgba(255,255,255,0.1)" />
                <circle cx={ptsGA[hoveredIndex].x} cy={ptsGA[hoveredIndex].y} r="4" fill="rgba(255,255,255,0.4)" />
              </>
            )}
          </svg>
        {hoveredIndex !== null && (
          <div
            className={`absolute top-0 pointer-events-none bg-navy border border-border rounded-lg px-3 py-2 shadow-xl z-10 ${tooltipAlign(hPctX)}`}
            style={{ left: `${hPctX}%` }}
          >
            <p className="text-[10px] text-muted whitespace-nowrap">
              {games[hoveredIndex].date} vs {games[hoveredIndex].opponent}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm font-black text-[#cc1533] tabular-nums">
                GF {games[hoveredIndex].scoreUs}
              </span>
              <span className="text-sm font-black text-white/40 tabular-nums">
                GA {games[hoveredIndex].scoreThem}
              </span>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
});

const ShotDiffChart = memo(({ matches }: { matches: Match[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const games = useMemo(() => [...matches].reverse(), [matches]);
  const chartData = useMemo(() => {
    if (games.length < 2) return null;
    const W = 400, H = 200;
    const pad = { t: 20, r: 15, b: 20, l: 30 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const diffs = games.map((m) => (m.shotsUs ?? 0) - (m.shotsThem ?? 0));
    const maxAbs = Math.max(...diffs.map(Math.abs), 1) + 2;
    const barGap = cW / games.length;
    const barW = Math.min(barGap * 0.6, 28);
    const zeroY = pad.t + cH / 2;
    return { W, H, pad, cW, cH, diffs, maxAbs, barGap, barW, zeroY };
  }, [games]);

  if (!chartData) return null;
  const { W, H, pad, cW, cH, diffs, maxAbs, barGap, barW, zeroY } = chartData;

  const totalDiff = diffs.reduce((s, d) => s + d, 0);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 p-4"
      style={{ background: "linear-gradient(160deg, rgba(13,21,38,0.95) 0%, rgba(10,22,34,0.9) 50%, rgba(10,17,32,0.95) 100%)" }}>
      {/* Accent edges */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/80 via-cyan-500/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/15 via-transparent to-transparent" />
      {/* Angled accent stripe */}
      <div className="absolute top-0 right-0 w-[35%] h-full pointer-events-none" style={{
        background: "linear-gradient(135deg, transparent 0%, rgba(6,182,212,0.03) 100%)",
        clipPath: "polygon(50% 0, 100% 0, 100% 100%, 0 100%)",
      }} />
      {/* Corner glow */}
      <div className="absolute top-0 left-0 w-40 h-40 pointer-events-none" style={{
        background: "radial-gradient(circle at 0% 0%, rgba(6,182,212,0.08) 0%, transparent 70%)",
      }} />
      {/* Big stat callout */}
      <div className="absolute top-3 right-4 pointer-events-none select-none">
        <p className="text-[9px] text-white/20 uppercase tracking-widest text-right">Total</p>
        <p className={`text-3xl font-black tabular-nums leading-none text-right ${totalDiff >= 0 ? "text-cyan-500/20" : "text-red/20"}`}>
          {totalDiff > 0 ? "+" : ""}{totalDiff}
        </p>
      </div>
      <div className="relative">
        <ChartHeader label="Shot Differential" />
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[200px]"
            preserveAspectRatio="none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * W;
              if (svgX < pad.l || svgX > W - pad.r) { setHoveredIndex(null); return; }
              const idx = Math.floor((svgX - pad.l) / barGap);
              setHoveredIndex(Math.max(0, Math.min(games.length - 1, idx)));
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="barPosGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="barNegGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cc1533" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#cc1533" stopOpacity="0.7" />
              </linearGradient>
              <filter id="barGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3,3" />
          {diffs.map((diff, i) => {
            const x = pad.l + i * barGap + (barGap - barW) / 2;
            const barH = (Math.abs(diff) / maxAbs) * (cH / 2);
            const y = diff >= 0 ? zeroY - barH : zeroY;
            const isHovered = hoveredIndex === i;
            const dimmed = hoveredIndex !== null && !isHovered;
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={barW} height={Math.max(barH, 1)} rx="3"
                  fill={
                    isHovered
                      ? diff >= 0 ? "rgba(6,182,212,0.9)" : "rgba(204,21,51,0.9)"
                      : diff >= 0 ? "url(#barPosGrad)" : "url(#barNegGrad)"
                  }
                  opacity={dimmed ? 0.3 : 1}
                  filter={isHovered ? "url(#barGlow)" : undefined}
                />
                <text
                  x={x + barW / 2}
                  y={diff >= 0 ? y - 6 : y + barH + 12}
                  textAnchor="middle"
                  fill={diff >= 0 ? "rgba(6,182,212,0.7)" : "rgba(204,21,51,0.7)"}
                  fontSize="9" fontWeight="bold" fontFamily="monospace"
                  opacity={dimmed ? 0.3 : 1}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </text>
              </g>
            );
          })}
          {hoveredIndex !== null && (
            <line
              x1={pad.l + hoveredIndex * barGap + barGap / 2} y1={pad.t}
              x2={pad.l + hoveredIndex * barGap + barGap / 2} y2={pad.t + cH}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4"
            />
          )}
        </svg>
        {hoveredIndex !== null && (() => {
          const pctX = ((pad.l + hoveredIndex * barGap + barGap / 2) / W) * 100;
          const g = games[hoveredIndex];
          const diff = diffs[hoveredIndex];
          return (
            <div
              className={`absolute top-0 pointer-events-none bg-navy border border-border rounded-lg px-3 py-2 shadow-xl z-10 ${tooltipAlign(pctX)}`}
              style={{ left: `${pctX}%` }}
            >
              <p className="text-[10px] text-muted whitespace-nowrap">
                {g.date} vs {g.opponent}
              </p>
              <p className="text-xs font-bold text-white whitespace-nowrap mt-0.5">
                BD {g.scoreUs} - {g.scoreThem}
              </p>
              <p className={`text-sm font-black tabular-nums mt-0.5 ${diff >= 0 ? "text-cyan-500" : "text-red"}`}>
                {diff > 0 ? "+" : ""}{diff} shots
              </p>
            </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
});

const WinPctChart = memo(({ matches }: { matches: Match[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const games = useMemo(() => [...matches].reverse(), [matches]);
  const chartData = useMemo(() => {
    if (games.length < 2) return null;
    const W = 400, H = 200;
    const pad = { t: 12, r: 12, b: 12, l: 32 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    let cumWins = 0;
    const pcts = games.map((m, i) => {
      if (getResult(m) === "W") cumWins++;
      return Math.round((cumWins / (i + 1)) * 100);
    });
    const xStep = cW / (games.length - 1);
    const pts = pcts.map((pct, i) => ({ x: pad.l + i * xStep, y: pad.t + cH - (pct / 100) * cH }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pad.l},${pad.t + cH} ${line} ${pad.l + cW},${pad.t + cH}`;
    return { W, H, pad, cW, cH, pcts, pts, line, area };
  }, [games]);

  if (!chartData) return null;
  const { W, H, pad, cW, cH, pcts, pts, line, area } = chartData;
  const hPctX = hoveredIndex !== null ? (pts[hoveredIndex].x / W) * 100 : 0;

  const gridPcts = [0, 25, 50, 75, 100];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 p-4"
      style={{ background: "linear-gradient(170deg, rgba(13,21,38,0.95) 0%, rgba(8,24,32,0.9) 50%, rgba(10,17,32,0.95) 100%)" }}>
      {/* Accent edges */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/80 via-cyan-500/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/15 via-transparent to-transparent" />
      {/* Angled accent stripe */}
      <div className="absolute top-0 left-0 w-[30%] h-full pointer-events-none" style={{
        background: "linear-gradient(145deg, rgba(6,182,212,0.04) 0%, transparent 100%)",
        clipPath: "polygon(0 0, 100% 0, 60% 100%, 0 100%)",
      }} />
      {/* Corner glow */}
      <div className="absolute top-0 left-0 w-40 h-40 pointer-events-none" style={{
        background: "radial-gradient(circle at 0% 0%, rgba(6,182,212,0.1) 0%, transparent 70%)",
      }} />
      {/* Big stat callout */}
      <div className="absolute top-3 right-4 pointer-events-none select-none">
        <p className="text-[9px] text-white/20 uppercase tracking-widest text-right">Current</p>
        <p className="text-3xl font-black tabular-nums text-cyan-500/20 leading-none text-right">{pcts[pcts.length - 1]}%</p>
      </div>
      <div className="relative">
        <ChartHeader label="Win %" legend={[{ color: "#06b6d4", text: "Cumulative" }]} />
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[200px]"
            preserveAspectRatio="none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * W;
              if (svgX < pad.l || svgX > W - pad.r) { setHoveredIndex(null); return; }
              const idx = Math.round(((svgX - pad.l) / cW) * (games.length - 1));
              setHoveredIndex(Math.max(0, Math.min(games.length - 1, idx)));
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="winPctFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.01" />
              </linearGradient>
              <filter id="winGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
          {gridPcts.map((pct) => {
            const y = pad.t + cH - (pct / 100) * cH;
            return (
              <g key={pct}>
                <line
                  x1={pad.l} y1={y} x2={W - pad.r} y2={y}
                  stroke={pct === 50 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}
                  strokeWidth="1"
                  strokeDasharray={pct === 50 ? "4,4" : "0"}
                />
                <text x={pad.l - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">{pct}</text>
              </g>
            );
          })}
          <polygon points={area} fill="url(#winPctFill)" />
          <polyline points={line} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#winGlow)" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#06b6d4"
              opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1} />
          ))}
          {hoveredIndex !== null && (
            <>
              <line
                x1={pts[hoveredIndex].x} y1={pad.t}
                x2={pts[hoveredIndex].x} y2={pad.t + cH}
                stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4"
              />
              <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].y} r="8" fill="rgba(6,182,212,0.2)" />
              <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].y} r="4.5" fill="#06b6d4" />
            </>
          )}
          {/* Static label on last point (only when not hovering) */}
          {hoveredIndex === null && pts.length > 0 && (
            <text
              x={pts[pts.length - 1].x}
              y={pts[pts.length - 1].y - 10}
              textAnchor="middle"
              fill="#06b6d4"
              fontSize="11" fontWeight="bold" fontFamily="monospace"
            >
              {pcts[pcts.length - 1]}%
            </text>
          )}
        </svg>
        {hoveredIndex !== null && (
          <div
            className={`absolute top-0 pointer-events-none bg-navy border border-border rounded-lg px-3 py-2 shadow-xl z-10 ${tooltipAlign(hPctX)}`}
            style={{ left: `${hPctX}%` }}
          >
            <p className="text-[10px] text-muted whitespace-nowrap">
              {games[hoveredIndex].date} vs {games[hoveredIndex].opponent}
            </p>
            <p className="text-sm font-black text-cyan-500 tabular-nums mt-0.5">
              {pcts[hoveredIndex]}%
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
});

function TrendsPanel({ matches }: { matches: Match[] }) {
  return (
    <div className="space-y-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 0.35 }}
      >
        <ResultsStrip matches={matches} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <WinPctChart matches={matches} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <ShotDiffChart matches={matches} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <GoalsTrendChart matches={matches} />
      </motion.div>
    </div>
  );
}

/* ── Week-specific Stats Panel ── */

function WeekStatsPanel({
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

/* ── Streak Banner (Stars & Stripes) ── */

function StreakBanner({
  streakType,
  streakCount,
  isClubRecord,
}: {
  streakType: "W" | "L";
  streakCount: number;
  isClubRecord: boolean;
}) {
  const isWin = streakType === "W";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
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
                  backgroundColor: i % 2 === 0 ? "#bf0a30" : "#ffffff",
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="relative flex-1 px-5 md:px-6 py-4 md:py-5">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#bf0a30] via-[#bf0a30]/50 to-transparent" />

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
                    className="bg-[#bf0a30]/15 border border-[#bf0a30]/30 text-[#bf0a30] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shrink-0"
                    style={{
                      clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                    }}
                  >
                    Club Record
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted/40 uppercase tracking-widest mt-0.5">
                Currently active
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
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
