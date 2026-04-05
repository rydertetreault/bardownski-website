"use client";

import { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match, ClubRecord } from "@/types";


/* ── Week period helpers ── */

interface WeekPeriod {
  dateRange: string;
  startTs: number;
  endTs: number;
}

function getWeekPeriods(matches: Match[]): WeekPeriod[] {
  if (matches.length === 0) return [];

  const timestamps = matches.map((m) => m.timestamp);
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);

  // Get the Monday of the week containing the earliest match
  const startDate = new Date(earliest * 1000);
  const day = startDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startDate.setUTCDate(startDate.getUTCDate() + mondayOffset);
  startDate.setUTCHours(0, 0, 0, 0);

  const weeks: WeekPeriod[] = [];
  let weekStart = new Date(startDate);

  while (weekStart.getTime() / 1000 <= latest) {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const fmtStart = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const fmtEnd = weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    weeks.push({
      dateRange: `${fmtStart} – ${fmtEnd}`,
      startTs: Math.floor(weekStart.getTime() / 1000),
      endTs: Math.floor(weekEnd.getTime() / 1000),
    });

    weekStart = new Date(weekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() + 7);
  }

  return weeks.reverse();
}

function getResult(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    match.scoreUs === null ||
    match.scoreThem === null
  )
    return null;
  return match.scoreUs > match.scoreThem ? "W" : "L";
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

  const cardContent = (
    <>
      {/* Status header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          {isFinal ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Final
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
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
              Finals
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted/50 tracking-widest">
          {match.date}
        </span>
      </div>

      {/* Team rows */}
      <div className="py-0.5">
        <TeamRow {...awayTeam} />
        <div className="mx-4 h-px bg-border/15" />
        <TeamRow {...homeTeam} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center py-1.5 border-t border-border/10">
        <span className="text-muted/30 text-[10px] uppercase tracking-widest">
          {isSyntheticForfeit ? "Opponent DNF" : "Details \u2192"}
        </span>
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      {isSyntheticForfeit ? (
        <div className="bg-navy/70 backdrop-blur-sm border border-border rounded-lg overflow-hidden">
          {cardContent}
        </div>
      ) : (
        <Link
          href={`/matches/${match.id}`}
          className="block bg-navy/70 backdrop-blur-sm border border-border hover:border-red/30 rounded-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-red/5"
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
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-4 bg-red rounded-full" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {label}
        </span>
      </div>
      {legend && (
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
      )}
    </div>
  );
}

const ResultsStrip = memo(({ matches }: { matches: Match[] }) => {
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

  return (
    <div className="bg-navy/70 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Results
          </span>
        </div>
        {streakType && streakCount > 1 && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              streakType === "W"
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-red bg-red/10"
            }`}
          >
            {streakCount}{streakType} Streak
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {games.map((match) => {
          const result = getResult(match);
          const isWin = result === "W";
          return (
            <div
              key={match.id}
              className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-black ${
                isWin
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red/20 text-red border border-red/30"
              }`}
              title={`${match.date}: BD ${match.scoreUs}-${match.scoreThem} ${match.opponent}`}
            >
              {result}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const GoalsTrendChart = memo(({ matches }: { matches: Match[] }) => {
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
    return { W, H, pad, ptsGF, ptsGA, lineGF, lineGA, areaGF, gridYs };
  }, [games]);

  if (!chartData) return null;
  const { W, H, pad, ptsGF, ptsGA, lineGF, lineGA, areaGF, gridYs } = chartData;

  return (
    <div className="bg-navy/70 border border-border rounded-lg p-3">
      <ChartHeader
        label="Goals Per Game"
        legend={[
          { color: "#cc1533", text: "GF" },
          { color: "rgba(255,255,255,0.3)", text: "GA" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]" preserveAspectRatio="none">
        {gridYs.map((g) => (
          <g key={g.val}>
            <line
              x1={pad.l}
              y1={g.y}
              x2={W - pad.r}
              y2={g.y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
            <text
              x={pad.l - 8}
              y={g.y + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.15)"
              fontSize="9"
              fontFamily="monospace"
            >
              {g.val}
            </text>
          </g>
        ))}
        <polygon points={areaGF} fill="rgba(204,21,51,0.08)" />
        <polyline
          points={lineGA}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          strokeLinecap="round"
        />
        <polyline
          points={lineGF}
          fill="none"
          stroke="#cc1533"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {ptsGA.map((p, i) => (
          <circle
            key={`ga-${i}`}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill="rgba(255,255,255,0.25)"
          />
        ))}
        {ptsGF.map((p, i) => (
          <circle key={`gf-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#cc1533" />
        ))}
      </svg>
    </div>
  );
});

const ShotDiffChart = memo(({ matches }: { matches: Match[] }) => {
  const chartData = useMemo(() => {
    const g = [...matches].reverse();
    if (g.length < 2) return null;
    const W = 400, H = 180;
    const pad = { t: 20, r: 15, b: 25, l: 30 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const diffs = g.map((m) => (m.shotsUs ?? 0) - (m.shotsThem ?? 0));
    const maxAbs = Math.max(...diffs.map(Math.abs), 1) + 2;
    const barGap = cW / g.length;
    const barW = Math.min(barGap * 0.6, 28);
    const zeroY = pad.t + cH / 2;
    return { W, H, pad, diffs, maxAbs, barGap, barW, zeroY, cH };
  }, [matches]);

  if (!chartData) return null;
  const { W, H, pad, diffs, maxAbs, barGap, barW, zeroY, cH } = chartData;

  return (
    <div className="bg-navy/70 border border-border rounded-lg p-4">
      <ChartHeader label="Shot Differential" />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]">
        <line
          x1={pad.l}
          y1={zeroY}
          x2={W - pad.r}
          y2={zeroY}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {diffs.map((diff, i) => {
          const x = pad.l + i * barGap + (barGap - barW) / 2;
          const barH = (Math.abs(diff) / maxAbs) * (cH / 2);
          const y = diff >= 0 ? zeroY - barH : zeroY;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 1)}
                fill={
                  diff >= 0
                    ? "rgba(6,182,212,0.5)"
                    : "rgba(204,21,51,0.5)"
                }
                rx="2"
              />
              <text
                x={x + barW / 2}
                y={diff >= 0 ? y - 6 : y + barH + 12}
                textAnchor="middle"
                fill={
                  diff >= 0
                    ? "rgba(6,182,212,0.7)"
                    : "rgba(204,21,51,0.7)"
                }
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {diff > 0 ? `+${diff}` : diff}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

const WinPctChart = memo(({ matches }: { matches: Match[] }) => {
  const chartData = useMemo(() => {
    const g = [...matches].reverse();
    if (g.length < 2) return null;
    const W = 400, H = 200;
    const pad = { t: 12, r: 12, b: 12, l: 32 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    let cumWins = 0;
    const pcts = g.map((m, i) => {
      if (getResult(m) === "W") cumWins++;
      return Math.round((cumWins / (i + 1)) * 100);
    });
    const xStep = cW / (g.length - 1);
    const pts = pcts.map((pct, i) => ({ x: pad.l + i * xStep, y: pad.t + cH - (pct / 100) * cH }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pad.l},${pad.t + cH} ${line} ${pad.l + cW},${pad.t + cH}`;
    return { W, H, pad, cH, pcts, pts, line, area };
  }, [matches]);

  if (!chartData) return null;
  const { W, H, pad, cH, pcts, pts, line, area } = chartData;

  const gridPcts = [0, 25, 50, 75, 100];

  return (
    <div className="bg-navy/70 border border-border rounded-lg p-3">
      <ChartHeader label="Win %" />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]">
        <defs>
          <linearGradient id="winPctFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridPcts.map((pct) => {
          const y = pad.t + cH - (pct / 100) * cH;
          return (
            <g key={pct}>
              <line
                x1={pad.l}
                y1={y}
                x2={W - pad.r}
                y2={y}
                stroke={
                  pct === 50
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.04)"
                }
                strokeWidth="1"
                strokeDasharray={pct === 50 ? "4,4" : "0"}
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.15)"
                fontSize="9"
                fontFamily="monospace"
              >
                {pct}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="url(#winPctFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#06b6d4" />
        ))}
        {/* Label on last point */}
        {pts.length > 0 && (
          <text
            x={pts[pts.length - 1].x}
            y={pts[pts.length - 1].y - 10}
            textAnchor="middle"
            fill="#06b6d4"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {pcts[pcts.length - 1]}%
          </text>
        )}
      </svg>
    </div>
  );
});

function TrendsPanel({ matches }: { matches: Match[] }) {
  return (
    <div className="space-y-3 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 0.35 }}
      >
        <ResultsStrip matches={matches} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

function WeekStatsPanel({ matches }: { matches: Match[] }) {
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
    <div className="space-y-3 mb-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
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

      {/* Per-game breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="bg-navy/70 border border-border rounded-lg overflow-hidden"
      >
        <div className="px-4 py-2.5 border-b border-border/30">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Game Breakdown
          </span>
        </div>
        <div className="divide-y divide-border/20">
          {matches.map((match) => {
            const result = getResult(match);
            const isWin = result === "W";
            const shotDiff =
              (match.shotsUs ?? 0) - (match.shotsThem ?? 0);
            return (
              <div key={match.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isWin ? "bg-emerald-400" : "bg-red"
                      }`}
                    />
                    <span className="text-sm font-bold text-white">
                      BD {match.scoreUs} – {match.scoreThem}{" "}
                      <span className="text-muted font-medium">
                        {match.opponent}
                      </span>
                    </span>
                  </div>
                  <span className="text-[10px] text-muted/50">
                    {match.date}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                  {match.shotsUs !== undefined && (
                    <span className="text-muted">
                      Shots{" "}
                      <span className="font-bold text-white font-mono">
                        {match.shotsUs}-{match.shotsThem}
                      </span>
                      <span
                        className={`ml-1 font-bold ${
                          shotDiff >= 0
                            ? "text-cyan-500"
                            : "text-red"
                        }`}
                      >
                        ({shotDiff > 0 ? "+" : ""}
                        {shotDiff})
                      </span>
                    </span>
                  )}
                  {match.passCompUs !== undefined && (
                    <span className="text-muted">
                      Pass%{" "}
                      <span className="font-bold text-white font-mono">
                        {match.passCompUs}%
                      </span>
                    </span>
                  )}
                  {match.toaUs && (
                    <span className="text-muted">
                      TOA{" "}
                      <span className="font-bold text-white font-mono">
                        {match.toaUs}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
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

  // Pre-compute match counts per week so we don't filter per-button per-render
  const weekMatchCounts = useMemo(
    () => weeks.map((week) => matches.filter((m) => m.timestamp >= week.startTs && m.timestamp <= week.endTs).length),
    [weeks, matches]
  );

  return (
    <>
      {/* Season record bar */}
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

      {/* Divider */}
      <div className="my-8">
        <div className="flex flex-col gap-px">
          <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
          <div className="h-px bg-gradient-to-r from-light-blue/30 via-light-blue/10 to-transparent" />
        </div>
      </div>

      {/* Week selector */}
      {weeks.length > 0 && (
        <div className="mb-8">
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

      {/* NHL-style scores grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {(selectedWeek === null ? filteredMatches.slice(0, 3) : filteredMatches).map((match, i) => (
            <ScoreCard key={match.id} match={match} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-navy/40 border border-border/30 rounded-xl mb-8">
          <p className="text-muted text-sm">No matches this week.</p>
        </div>
      )}

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
        <div className="flex flex-col gap-px ml-4 mb-2">
          <div className="h-px bg-red/40" />
          <div className="h-px bg-light-blue/25" />
        </div>
        <p className="text-xs text-muted uppercase tracking-widest ml-4">
          Season trends & performance breakdown
        </p>
      </motion.div>

      {/* Charts panel */}
      {selectedWeek === null ? (
        <TrendsPanel matches={matches} />
      ) : (
        <WeekStatsPanel matches={filteredMatches} />
      )}
    </>
  );
}
