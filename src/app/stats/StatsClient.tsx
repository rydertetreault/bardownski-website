"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ParsedStats,
  SeasonData,
  StatEntry,
  SaveEntry,
  EnrichedPlayer,
} from "@/lib/discord";
import { getEnrichedPlayers } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

/* ══════════════════════════════════════════════════════════════════════════
   Head-to-Head — Radar Chart Popup
   ══════════════════════════════════════════════════════════════════════════ */

interface PlayerProfile {
  name: string;
  points: number;
  goals: number;
  assists: number;
  plusMinus: number;
  hits: number;
}

interface GoalieProfile {
  name: string;
  saves: number;
  savePct: number;
  shutouts: number;
  ggp: number;
}

type CompareMode = "skater" | "goalie";

const SKATER_STATS: { key: keyof PlayerProfile; label: string }[] = [
  { key: "points", label: "PTS" },
  { key: "goals", label: "G" },
  { key: "assists", label: "A" },
  { key: "plusMinus", label: "+/-" },
  { key: "hits", label: "HIT" },
];

const GOALIE_STATS: { key: keyof GoalieProfile; label: string }[] = [
  { key: "saves", label: "SVS" },
  { key: "savePct", label: "SV%" },
  { key: "shutouts", label: "SO" },
  { key: "ggp", label: "GP" },
];

// Keep RADAR_STATS as alias for backward compat in the component
const RADAR_STATS = SKATER_STATS;

const CX = 150;
const CY = 150;
const R = 105;
const RINGS = [0.25, 0.5, 0.75, 1];

function polarX(angle: number, radius: number) {
  return CX + radius * Math.cos(angle);
}
function polarY(angle: number, radius: number) {
  return CY + radius * Math.sin(angle);
}
function axisAngle(i: number, total: number) {
  return (2 * Math.PI * i) / total - Math.PI / 2;
}

function buildProfilesFromStats(stats: ParsedStats): PlayerProfile[] {
  const nameSet = new Set<string>();
  for (const e of stats.points) nameSet.add(e.name);
  for (const e of stats.goals) nameSet.add(e.name);
  for (const e of stats.assists) nameSet.add(e.name);
  for (const e of stats.hits) nameSet.add(e.name);

  const profiles: PlayerProfile[] = [];
  for (const name of nameSet) {
    profiles.push({
      name,
      points: stats.points.find((e) => e.name === name)?.value ?? 0,
      goals: stats.goals.find((e) => e.name === name)?.value ?? 0,
      assists: stats.assists.find((e) => e.name === name)?.value ?? 0,
      plusMinus: stats.plusMinus.find((e) => e.name === name)?.value ?? 0,
      hits: stats.hits.find((e) => e.name === name)?.value ?? 0,
    });
  }
  profiles.sort((a, b) => b.points - a.points);
  return profiles;
}

function buildGoalieProfilesFromStats(stats: ParsedStats): GoalieProfile[] {
  const goalies: GoalieProfile[] = [];
  for (const sv of stats.saves as SaveEntry[]) {
    if ((sv.ggp ?? 0) < 1) continue;
    goalies.push({
      name: sv.name,
      saves: sv.value,
      savePct: sv.secondary ?? 0,
      shutouts: stats.shutouts.find((e) => e.name === sv.name)?.value ?? 0,
      ggp: sv.ggp ?? 0,
    });
  }
  goalies.sort((a, b) => b.saves - a.saves);
  return goalies;
}

function GenericRadarChart({
  p1,
  p2,
  maxValues,
  stats,
}: {
  p1: Record<string, number>;
  p2: Record<string, number>;
  maxValues: Record<string, number>;
  stats: { key: string; label: string }[];
}) {
  const total = stats.length;

  const normalize = (val: number, key: string) => {
    if (key === "plusMinus") {
      const absMax = maxValues["plusMinus"] || 1;
      return Math.max(0, Math.min(1, (val + absMax) / (2 * absMax)));
    }
    const max = maxValues[key] || 1;
    return Math.max(0, Math.min(1, val / max));
  };

  const getPoints = (p: Record<string, number>) =>
    stats.map((s, i) => {
      const v = normalize(p[s.key] ?? 0, s.key);
      const a = axisAngle(i, total);
      return `${polarX(a, R * v)},${polarY(a, R * v)}`;
    }).join(" ");

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[240px] mx-auto">
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={Array.from({ length: total }, (_, i) => {
            const a = axisAngle(i, total);
            return `${polarX(a, R * ring)},${polarY(a, R * ring)}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(42,53,80,0.6)"
          strokeWidth={ring === 1 ? 1.5 : 0.5}
        />
      ))}
      {Array.from({ length: total }, (_, i) => {
        const a = axisAngle(i, total);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={polarX(a, R)}
            y2={polarY(a, R)}
            stroke="rgba(42,53,80,0.5)"
            strokeWidth={0.5}
          />
        );
      })}
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        points={getPoints(p1)}
        fill="rgba(200,16,46,0.2)"
        stroke="#c8102e"
        strokeWidth={2}
      />
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        points={getPoints(p2)}
        fill="rgba(91,155,213,0.2)"
        stroke="#5b9bd5"
        strokeWidth={2}
      />
      {stats.map((s, i) => {
        const v = normalize(p1[s.key] ?? 0, s.key);
        const a = axisAngle(i, total);
        return (
          <circle key={`p1-${s.key}`} cx={polarX(a, R * v)} cy={polarY(a, R * v)} r={3} fill="#c8102e" />
        );
      })}
      {stats.map((s, i) => {
        const v = normalize(p2[s.key] ?? 0, s.key);
        const a = axisAngle(i, total);
        return (
          <circle key={`p2-${s.key}`} cx={polarX(a, R * v)} cy={polarY(a, R * v)} r={3} fill="#5b9bd5" />
        );
      })}
      {stats.map((s, i) => {
        const a = axisAngle(i, total);
        return (
          <text
            key={s.key}
            x={polarX(a, R + 18)}
            y={polarY(a, R + 18)}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted"
            style={{ fontSize: "10px", fontWeight: 700 }}
          >
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

function HeadToHeadCard({ stats }: { stats: ParsedStats }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CompareMode>("skater");

  const skaterProfiles = useMemo(() => buildProfilesFromStats(stats), [stats]);
  const goalieProfiles = useMemo(() => buildGoalieProfilesFromStats(stats), [stats]);

  const profiles = mode === "skater" ? skaterProfiles : goalieProfiles;
  const activeStats = mode === "skater" ? SKATER_STATS : GOALIE_STATS;

  const [p1Name, setP1Name] = useState(skaterProfiles[0]?.name ?? "");
  const [p2Name, setP2Name] = useState(skaterProfiles[1]?.name ?? "");

  // Reset selections when mode changes and current names aren't in the new list
  const p1InList = profiles.some((p) => p.name === p1Name);
  const p2InList = profiles.some((p) => p.name === p2Name);
  const effectiveP1Name = p1InList ? p1Name : profiles[0]?.name ?? "";
  const effectiveP2Name = p2InList ? p2Name : profiles[1]?.name ?? profiles[0]?.name ?? "";

  const p1 = profiles.find((p) => p.name === effectiveP1Name) ?? profiles[0];
  const p2 = profiles.find((p) => p.name === effectiveP2Name) ?? profiles[1] ?? profiles[0];

  const maxValues = useMemo(() => {
    const mv: Record<string, number> = {};
    for (const s of activeStats) {
      const vals = profiles.map((p) => Math.abs((p as unknown as Record<string, number>)[s.key] ?? 0));
      mv[s.key] = Math.max(...vals, 1);
    }
    return mv;
  }, [profiles, activeStats]);

  const hasGoalies = goalieProfiles.length >= 2;
  if (skaterProfiles.length < 2) return null;
  if (!p1 || !p2) return null;

  const selectClass =
    "bg-navy-dark border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer focus:outline-none focus:border-red/50 transition-colors w-full";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden"
    >
      {/* Outer container with angled clip */}
      <div
        className="relative bg-gradient-to-br from-[#0d1528] via-[#111d35] to-[#0d1528] border border-white/[0.08]"
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
        }}
      >
        {/* Top accent — red to blue gradient */}
        <div className="h-[3px] bg-gradient-to-r from-[#cc1533] via-[#cc1533]/60 to-[#5b9bd5]" />

        {/* Background pattern — subtle diagonal lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)",
          }}
        />

        {/* Large VS watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
          <span className="text-[8rem] font-black text-white/[0.015] leading-none tracking-tighter">
            VS
          </span>
        </div>

        {/* Toggle header */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="relative w-full px-6 py-5 flex items-center gap-5 hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          {/* VS badge */}
          <div
            className="shrink-0 w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[#cc1533] to-[#a8102a] shadow-lg shadow-[#cc1533]/20"
            style={{
              clipPath:
                "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
            }}
          >
            <span className="text-xl font-black text-white tracking-tight">
              VS
            </span>
          </div>

          {/* Text */}
          <div className="flex-1 text-left min-w-0">
            <h3 className="text-lg font-black uppercase tracking-[0.1em] text-white mb-1">
              Head to Head
            </h3>
            <p className="text-xs text-white/35 leading-relaxed">
              Pick any two players and compare their stats with an
              interactive radar chart and stat breakdown.
            </p>
          </div>

          {/* Expand indicator */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-lg bg-white/[0.03]"
            >
              <svg
                className="w-4 h-4 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </div>
        </button>

        {/* Expandable content */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2">
                {/* Mode toggle — Skater / Goalie */}
                {hasGoalies && (
                  <div className="flex items-center justify-center gap-1 mb-5">
                    <button
                      onClick={() => setMode("skater")}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        mode === "skater"
                          ? "bg-[#cc1533] text-white shadow-lg shadow-[#cc1533]/20"
                          : "bg-white/[0.04] text-white/40 hover:text-white/60 border border-white/[0.06]"
                      }`}
                    >
                      Skater
                    </button>
                    <button
                      onClick={() => setMode("goalie")}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        mode === "goalie"
                          ? "bg-[#5b9bd5] text-white shadow-lg shadow-[#5b9bd5]/20"
                          : "bg-white/[0.04] text-white/40 hover:text-white/60 border border-white/[0.06]"
                      }`}
                    >
                      Goalie
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-gradient-to-r from-[#cc1533]/30 to-transparent" />
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">
                    Select {mode === "goalie" ? "Goalies" : "Players"}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-l from-[#5b9bd5]/30 to-transparent" />
                </div>

                {/* Player selectors */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[9px] text-[#cc1533] font-bold uppercase tracking-widest mb-1.5">
                      {mode === "goalie" ? "Goalie 1" : "Player 1"}
                    </label>
                    <select
                      value={effectiveP1Name}
                      onChange={(e) => setP1Name(e.target.value)}
                      className={selectClass}
                      style={{ color: "#c8102e" }}
                    >
                      {profiles.map((p) => (
                        <option key={p.name} value={p.name}>
                          {getNickname(p.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#5b9bd5] font-bold uppercase tracking-widest mb-1.5">
                      {mode === "goalie" ? "Goalie 2" : "Player 2"}
                    </label>
                    <select
                      value={effectiveP2Name}
                      onChange={(e) => setP2Name(e.target.value)}
                      className={selectClass}
                      style={{ color: "#5b9bd5" }}
                    >
                      {profiles.map((p) => (
                        <option key={p.name} value={p.name}>
                          {getNickname(p.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Player name labels */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-black text-[#cc1533] uppercase tracking-wider">
                    {getNickname(p1.name)}
                  </span>
                  <span className="text-[10px] text-white/15 font-bold">
                    vs
                  </span>
                  <span className="text-xs font-black text-[#5b9bd5] uppercase tracking-wider">
                    {getNickname(p2.name)}
                  </span>
                </div>

                {/* Radar chart */}
                <div className="flex justify-center">
                  <GenericRadarChart
                    p1={p1 as unknown as Record<string, number>}
                    p2={p2 as unknown as Record<string, number>}
                    maxValues={maxValues}
                    stats={activeStats}
                  />
                </div>

                {/* Stat comparison bars */}
                <div className="mt-4 space-y-2">
                  {activeStats.map((s) => {
                    const v1 = (p1 as unknown as Record<string, number>)[s.key] ?? 0;
                    const v2 = (p2 as unknown as Record<string, number>)[s.key] ?? 0;
                    const winner =
                      v1 > v2 ? "p1" : v2 > v1 ? "p2" : "tie";

                    const fmt = (v: number) => {
                      if (s.key === "plusMinus" && v > 0) return `+${v}`;
                      if (s.key === "savePct") return `${v.toFixed(1)}`;
                      return String(v);
                    };

                    return (
                      <div key={s.key} className="flex items-center gap-2.5">
                        <span
                          className={`w-10 text-right text-xs font-mono font-bold ${
                            winner === "p1"
                              ? "text-[#cc1533]"
                              : "text-white/30"
                          }`}
                        >
                          {fmt(v1)}
                        </span>

                        <div className="flex-1 flex h-2 rounded overflow-hidden bg-[#0a0f1a] border border-white/[0.04]">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width:
                                v1 + v2 > 0
                                  ? `${(Math.max(v1, 0) / (Math.max(v1, 0) + Math.max(v2, 0))) * 100}%`
                                  : "50%",
                              backgroundColor:
                                winner === "p1"
                                  ? "#c8102e"
                                  : winner === "tie"
                                    ? "#7a8ba8"
                                    : "rgba(200,16,46,0.25)",
                            }}
                          />
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width:
                                v1 + v2 > 0
                                  ? `${(Math.max(v2, 0) / (Math.max(v1, 0) + Math.max(v2, 0))) * 100}%`
                                  : "50%",
                              backgroundColor:
                                winner === "p2"
                                  ? "#5b9bd5"
                                  : winner === "tie"
                                    ? "#7a8ba8"
                                    : "rgba(91,155,213,0.25)",
                            }}
                          />
                        </div>

                        <span
                          className={`w-10 text-left text-xs font-mono font-bold ${
                            winner === "p2"
                              ? "text-[#5b9bd5]"
                              : "text-white/30"
                          }`}
                        >
                          {fmt(v2)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Stat labels */}
                  <div className="flex items-center gap-2.5 text-[8px] text-white/20 uppercase tracking-widest pt-0.5">
                    <span className="w-10" />
                    <div className="flex-1 flex justify-around">
                      {activeStats.map((s) => (
                        <span key={s.key}>{s.label}</span>
                      ))}
                    </div>
                    <span className="w-10" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TrendArrow({ trend }: { trend?: "up" | "down" | null }) {
  if (!trend) return null;
  if (trend === "up") return <span className="text-green-500 ml-1">↑</span>;
  return <span className="text-red-light ml-1">↓</span>;
}

/* ── Compact top-5 leader card ── */
function LeaderCard({
  title,
  entries,
  formatValue,
  secondaryLabel,
  secondaryIsPercent,
}: {
  title: string;
  entries: StatEntry[];
  formatValue?: (v: number) => string;
  secondaryLabel?: string;
  secondaryIsPercent?: boolean;
}) {
  const top5 = entries.slice(0, 5);
  if (top5.length === 0) return null;
  const fmt = formatValue || ((v: number) => v.toString());

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-navy border border-border rounded-xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="relative">
        <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
        <div className="px-4 py-2.5 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-xs">
            {title}
          </h3>
          {secondaryLabel && (
            <span className="text-[10px] text-muted uppercase tracking-widest">
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Top 5 entries */}
      <div className="px-4 py-1">
        {top5.map((entry, i) => (
          <div
            key={entry.name}
            className={`flex items-center py-2.5 ${i > 0 ? "border-t border-border/20" : ""}`}
          >
            {/* Rank */}
            <span
              className={`w-6 text-xs font-mono font-bold shrink-0 ${
                i === 0 ? "text-red" : "text-muted"
              }`}
            >
              {entry.rank}.
            </span>
            {/* Name */}
            <p
              className={`flex-1 min-w-0 max-w-[130px] text-sm font-semibold truncate ${
                i === 0 ? "text-red" : ""
              }`}
            >
              {getNickname(entry.name)}
              <TrendArrow trend={entry.trend} />
            </p>
            {/* Value */}
            <span
              className={`w-10 text-right font-bold text-sm font-mono shrink-0 ${
                i === 0 ? "text-red" : "text-foreground"
              }`}
            >
              {fmt(entry.value)}
            </span>
            {/* Secondary */}
            {secondaryLabel && (
              <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
                {entry.secondary !== undefined ? `${entry.secondary}${secondaryIsPercent ? "%" : ""}` : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Saves leader card (custom columns) ── */
function SavesLeaderCard({ entries }: { entries: SaveEntry[] }) {
  const top5 = entries.slice(0, 5);
  if (top5.length === 0) return null;
  const hasGgp = top5.some((e) => e.ggp !== undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-navy border border-border rounded-xl overflow-hidden h-full"
    >
      <div className="relative">
        <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
        <div className="px-4 py-2.5 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-xs">
            Saves
          </h3>
          <span className="text-[10px] text-muted uppercase tracking-widest">
            SV / SV%{hasGgp ? " / GGP" : ""}
          </span>
        </div>
      </div>

      <div className="px-4 py-1">
        {top5.map((entry, i) => (
          <div
            key={entry.name}
            className={`flex items-center py-2.5 ${i > 0 ? "border-t border-border/20" : ""}`}
          >
            <span
              className={`w-6 text-xs font-mono font-bold shrink-0 ${
                i === 0 ? "text-red" : "text-muted"
              }`}
            >
              {entry.rank}.
            </span>
            <p
              className={`flex-1 min-w-0 text-sm font-semibold truncate ${
                i === 0 ? "text-red" : ""
              }`}
            >
              {getNickname(entry.name)}
              <TrendArrow trend={entry.trend} />
            </p>
            <span
              className={`w-10 text-right font-bold text-sm font-mono shrink-0 ${
                i === 0 ? "text-red" : "text-foreground"
              }`}
            >
              {entry.value}
            </span>
            <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
              {entry.secondary}%
            </span>
            {hasGgp && (
              <span className="w-10 text-right text-muted text-xs font-mono shrink-0">
                {entry.ggp}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Player dropdown row ── */
function PlayerDropdown({ player }: { player: EnrichedPlayer }) {
  const [open, setOpen] = useState(false);
  const isGoalie = /\b(goalie|gk|g)\b/i.test(player.position);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-navy border border-border rounded-xl overflow-hidden"
    >
      {/* Clickable header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-navy-light/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-red font-black text-sm">
            {getNickname(player.name)}
          </span>
          <span className="text-muted text-xs uppercase tracking-wider">
            {player.position}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stat preview when closed */}
          {!open && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted font-mono">
              {isGoalie ? (
                <>
                  {player.savePercentage !== undefined && (
                    <span>{player.savePercentage.toFixed(1)}% SV</span>
                  )}
                  {player.saves !== undefined && <span>{player.saves} SVS</span>}
                  {player.shutouts !== undefined && <span>{player.shutouts} SO</span>}
                </>
              ) : (
                <>
                  {player.points !== undefined && <span>{player.points} PTS</span>}
                  {player.goals !== undefined && <span>{player.goals} G</span>}
                  {player.assists !== undefined && <span>{player.assists} A</span>}
                </>
              )}
            </div>
          )}
          {/* Chevron */}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted text-lg"
          >
            ▾
          </motion.span>
        </div>
      </button>

      {/* Expanded stats */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border/30">
              {isGoalie ? (
                <GoalieStatGrid player={player} />
              ) : (
                <SkaterStatGrid player={player} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCell({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg font-black font-mono text-foreground">
        {value !== undefined && value !== null ? value : "—"}
      </p>
    </div>
  );
}

function SkaterStatGrid({ player }: { player: EnrichedPlayer }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-2">
      <div className="flex gap-6 min-w-max">
        <StatCell label="GP" value={player.gamesPlayed} />
        <StatCell label="G" value={player.goals} />
        <StatCell label="A" value={player.assists} />
        <StatCell label="PTS" value={player.points} />
        <StatCell
          label="+/-"
          value={
            player.plusMinus !== undefined
              ? player.plusMinus > 0
                ? `+${player.plusMinus}`
                : player.plusMinus.toString()
              : undefined
          }
        />
        <StatCell label="HIT" value={player.hits} />
        <StatCell label="PIM" value={player.pim} />
        {player.shots !== undefined && <StatCell label="SOG" value={player.shots} />}
        {player.shotPercentage !== undefined && (
          <StatCell label="SH%" value={`${player.shotPercentage}%`} />
        )}
        {player.gwg !== undefined && <StatCell label="GWG" value={player.gwg} />}
        {player.takeaways !== undefined && <StatCell label="TK" value={player.takeaways} />}
        {player.giveaways !== undefined && <StatCell label="GV" value={player.giveaways} />}
        {player.blockedShots !== undefined && <StatCell label="BS" value={player.blockedShots} />}
        {player.interceptions !== undefined && <StatCell label="INT" value={player.interceptions} />}
        {player.passPercentage !== undefined && (
          <StatCell label="PASS%" value={`${player.passPercentage}%`} />
        )}
        {player.faceoffPct !== undefined && player.faceoffPct > 0 && (
          <StatCell label="FO%" value={`${player.faceoffPct}%`} />
        )}
      </div>
    </div>
  );
}

function GoalieStatGrid({ player }: { player: EnrichedPlayer }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-2">
      <div className="flex gap-6 min-w-max">
        <StatCell label="GGP" value={player.goalieGamesPlayed} />
        <StatCell label="SVS" value={player.saves} />
        <StatCell
          label="SV%"
          value={
            player.savePercentage !== undefined
              ? `${player.savePercentage.toFixed(1)}%`
              : undefined
          }
        />
        <StatCell label="GAA" value={player.gaa !== undefined ? player.gaa.toFixed(2) : undefined} />
        <StatCell label="SO" value={player.shutouts} />
        <StatCell label="SOP" value={player.shutoutPeriods} />
        {/* Also show skater stats if they have any */}
        {player.points !== undefined && player.points > 0 && (
          <>
            <StatCell label="G" value={player.goals} />
            <StatCell label="A" value={player.assists} />
            <StatCell label="PTS" value={player.points} />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Stats Leaders + Player Stats ── */
function StatsDisplay({ stats }: { stats: ParsedStats }) {
  const enrichedPlayers = getEnrichedPlayers(stats);

  return (
    <>
      {/* Stats Leaders */}
      <div className="mb-12">
        <div className="mb-6">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-1 h-6 bg-red rounded-sm" />
            <h2 className="text-2xl font-black uppercase tracking-wider">
              Stats Leaders
            </h2>
          </div>
          <p className="text-xs text-muted uppercase tracking-widest ml-4">
            Top performers this season
          </p>
        </div>

        {/* Top row — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <LeaderCard
            title="Points"
            entries={stats.points}
            secondaryLabel="GP"
          />
          <LeaderCard title="Goals" entries={stats.goals} secondaryLabel="SH%" secondaryIsPercent />
          <LeaderCard title="Assists" entries={stats.assists} secondaryLabel="PASS%" secondaryIsPercent />
          <LeaderCard
            title="Plus/Minus"
            entries={stats.plusMinus}
            formatValue={(v) => (v > 0 ? `+${v}` : v.toString())}
          />
        </div>
        {/* Bottom row — centered, equal height */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch gap-4">
          <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
            <LeaderCard title="Hits" entries={stats.hits} secondaryLabel="PIM" />
          </div>
          <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
            <SavesLeaderCard entries={stats.saves} />
          </div>
          {stats.shutouts.length > 0 && (
            <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
              <LeaderCard
                title="Shutouts"
                entries={stats.shutouts}
                secondaryLabel={
                  stats.shutouts.some((e) => e.secondary !== undefined)
                    ? "SOP"
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Player Stats */}
      <div>
        <div className="mb-6">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-1 h-6 bg-red rounded-sm" />
            <h2 className="text-2xl font-black uppercase tracking-wider">
              Player Stats
            </h2>
          </div>
          <p className="text-xs text-muted uppercase tracking-widest ml-4">
            Full season breakdown
          </p>
        </div>

        <HeadToHeadCard stats={stats} />

        <div className="space-y-3 mt-6">
          {enrichedPlayers.map((player) => (
            <PlayerDropdown key={player.name} player={player} />
          ))}
        </div>
      </div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <div className="flex flex-col gap-px mb-4">
              <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
              <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
            </div>
            <div className="flex items-center gap-3">
              <span className="block w-1 h-6 bg-red rounded-sm" />
              <h2 className="text-2xl font-black uppercase tracking-wider">
                Milestones
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.milestones.map((milestone, i) => (
              <motion.div
                key={milestone.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-navy border border-border rounded-xl p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red/50 to-transparent" />
                <h3 className="font-bold text-red mb-2">
                  {getNickname(milestone.name)}
                </h3>
                <ul className="space-y-1">
                  {milestone.achievements.map((a) => (
                    <li key={a} className="text-sm text-muted">
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function StatsClient({
  seasons,
}: {
  seasons: SeasonData[];
}) {
  const [selectedSeason, setSelectedSeason] = useState(
    seasons[0]?.season ?? ""
  );

  const currentData = seasons.find((s) => s.season === selectedSeason);

  return (
    <>
      {/* Scoreboard-style season tabs */}
      {seasons.length > 1 && (
        <div className="flex gap-1 mb-10 flex-wrap bg-navy-dark border border-border rounded-lg p-1 w-fit">
          {seasons.map(({ season }) => (
            <button
              key={season}
              onClick={() => setSelectedSeason(season)}
              className={`relative px-5 py-2.5 rounded-md text-sm font-black uppercase tracking-wider transition-all ${
                selectedSeason === season
                  ? "bg-red text-white shadow-lg shadow-red/20"
                  : "text-muted hover:text-white hover:bg-navy"
              }`}
            >
              {season}
            </button>
          ))}
        </div>
      )}

      {/* Stats for selected season */}
      <AnimatePresence mode="wait">
        {currentData ? (
          <motion.div
            key={selectedSeason}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-muted text-sm mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Last updated: {currentData.stats.date}
            </p>
            <StatsDisplay stats={currentData.stats} />
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-navy border border-border rounded-xl">
            <p className="text-muted">No stats for this season.</p>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
