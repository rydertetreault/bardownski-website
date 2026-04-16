"use client";

import { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import type { Match } from "@/types";
import { getResult } from "../utils";

/* ── Tooltip alignment helper ── */

function tooltipAlign(pctX: number): string {
  if (pctX < 15) return "translate-x-0";
  if (pctX > 85) return "-translate-x-full";
  return "-translate-x-1/2";
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

export function TrendsPanel({ matches }: { matches: Match[] }) {
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
