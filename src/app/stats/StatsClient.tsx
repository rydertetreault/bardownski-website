"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ParsedStats,
  SeasonData,
  StatEntry,
  SaveEntry,
} from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

function TrendArrow({ trend }: { trend?: "up" | "down" | null }) {
  if (!trend) return null;
  if (trend === "up") return <span className="text-green-500 ml-1">↑</span>;
  return <span className="text-red-light ml-1">↓</span>;
}

/* ── Podium for top 3 ── */
function Podium({ entries, label }: { entries: StatEntry[]; label: string }) {
  const top3 = entries.slice(0, 3);
  if (top3.length < 3) return null;

  // Order: 2nd, 1st, 3rd for visual podium
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const heights = ["h-24", "h-32", "h-20"];
  const textSizes = ["text-2xl", "text-4xl", "text-xl"];
  const barColors = [
    "from-navy-light to-navy",
    "from-red-dark to-red",
    "from-navy-light to-navy",
  ];

  return (
    <div className="text-center mb-2">
      <p className="text-xs text-muted uppercase tracking-[0.2em] mb-6 font-semibold">
        {label} Leaders
      </p>
      <div className="flex items-end justify-center gap-3 md:gap-4">
        {podiumOrder.map((entry, i) => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 + 0.2, duration: 0.5 }}
            className="flex flex-col items-center w-28 md:w-36"
          >
            {/* Player name */}
            <p
              className={`font-bold text-sm mb-2 truncate w-full ${i === 1 ? "text-red" : "text-foreground"}`}
            >
              {getNickname(entry.name)}
            </p>
            {/* Value */}
            <p className={`${textSizes[i]} font-black font-mono mb-2 ${i === 1 ? "text-white" : "text-muted"}`}>
              {entry.value}
            </p>
            {/* Podium bar */}
            <div
              className={`w-full ${heights[i]} rounded-t-lg bg-gradient-to-t ${barColors[i]} border border-border border-b-0 flex items-center justify-center`}
            >
              <span className="text-2xl font-black text-white/20">
                {entry.rank}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Podium base */}
      <div className="h-1 bg-border rounded-full max-w-md mx-auto" />
    </div>
  );
}

/* ── Scoreboard-style leaderboard card ── */
function ScoreboardCard({
  title,
  entries,
  valueLabel,
  secondaryLabel,
  secondaryIsPercent,
  formatValue,
  accent,
}: {
  title: string;
  entries: StatEntry[];
  valueLabel: string;
  secondaryLabel?: string;
  secondaryIsPercent?: boolean;
  formatValue?: (v: number) => string;
  accent?: boolean;
}) {
  if (entries.length === 0) return null;
  const fmt = formatValue || ((v: number) => v.toString());
  const leader = entries[0];
  const rest = entries.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-navy border border-border rounded-xl overflow-hidden"
    >
      {/* Header with red accent line */}
      <div className="relative">
        <div className={`h-0.5 ${accent ? "bg-red" : "bg-gradient-to-r from-red via-red/50 to-transparent"}`} />
        <div className="px-5 py-3 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-sm">
            {title}
          </h3>
          <span className="text-[10px] text-muted uppercase tracking-widest">
            {valueLabel}
          </span>
        </div>
      </div>

      {/* Leader highlight */}
      {leader && (
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-red/5 to-transparent">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-red/20 border border-red/30 flex items-center justify-center mr-3 shrink-0">
              <span className="text-red text-xs font-black">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red truncate">
                {getNickname(leader.name)}
                <TrendArrow trend={leader.trend} />
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-red font-mono">
                {fmt(leader.value)}
              </span>
              {secondaryLabel && leader.secondary !== undefined && (
                <p className="text-[10px] text-muted font-mono">
                  {leader.secondary}
                  {secondaryIsPercent ? "%" : ""} {secondaryLabel}
                </p>
              )}
            </div>
          </div>
          {/* Stat bar representing leader's dominance */}
          <div className="mt-2 h-1 rounded-full bg-surface overflow-hidden">
            <motion.div
              className="h-full bg-red/40 rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      <div className="px-5 py-1">
        {rest.map((entry) => {
          const barWidth =
            leader && leader.value > 0
              ? Math.max((entry.value / leader.value) * 100, 8)
              : 0;
          return (
            <div
              key={entry.name}
              className="flex items-center py-2.5 border-t border-border/20 group"
            >
              <span className="w-7 text-muted text-xs font-mono shrink-0">
                {entry.rank}.
              </span>
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-semibold truncate">
                  {getNickname(entry.name)}
                  <TrendArrow trend={entry.trend} />
                </p>
                {/* Progress bar relative to leader */}
                <div className="mt-1 h-0.5 rounded-full bg-surface-light overflow-hidden">
                  <motion.div
                    className="h-full bg-red/20 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${barWidth}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                </div>
              </div>
              <span className="text-red font-bold text-sm font-mono shrink-0">
                {fmt(entry.value)}
              </span>
              {secondaryLabel && entry.secondary !== undefined && (
                <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
                  {entry.secondary}
                  {secondaryIsPercent ? "%" : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Saves scoreboard (custom columns) ── */
function SavesScoreboard({ entries }: { entries: SaveEntry[] }) {
  if (entries.length === 0) return null;
  const leader = entries[0];
  const rest = entries.slice(1);
  const hasGgp = entries.some((e) => e.ggp !== undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-navy border border-border rounded-xl overflow-hidden"
    >
      <div className="relative">
        <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
        <div className="px-5 py-3 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-sm">Saves</h3>
          <span className="text-[10px] text-muted uppercase tracking-widest">
            SV / SV%{hasGgp ? " / GGP" : ""}
          </span>
        </div>
      </div>

      {/* Leader */}
      {leader && (
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-red/5 to-transparent">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-red/20 border border-red/30 flex items-center justify-center mr-3 shrink-0">
              <span className="text-red text-xs font-black">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red truncate">
                {getNickname(leader.name)}
                <TrendArrow trend={leader.trend} />
              </p>
            </div>
            <div className="text-right shrink-0 flex items-baseline gap-3">
              <span className="text-2xl font-black text-red font-mono">
                {leader.value}
              </span>
              <span className="text-sm text-muted font-mono">
                {leader.secondary}%
              </span>
              {hasGgp && leader.ggp !== undefined && (
                <span className="text-sm text-muted font-mono">
                  {leader.ggp}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 h-1 rounded-full bg-surface overflow-hidden">
            <motion.div
              className="h-full bg-red/40 rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      <div className="px-5 py-1">
        {rest.map((entry) => {
          const barWidth =
            leader && leader.value > 0
              ? Math.max((entry.value / leader.value) * 100, 8)
              : 0;
          return (
            <div
              key={entry.name}
              className="flex items-center py-2.5 border-t border-border/20"
            >
              <span className="w-7 text-muted text-xs font-mono shrink-0">
                {entry.rank}.
              </span>
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-semibold truncate">
                  {getNickname(entry.name)}
                  <TrendArrow trend={entry.trend} />
                </p>
                <div className="mt-1 h-0.5 rounded-full bg-surface-light overflow-hidden">
                  <motion.div
                    className="h-full bg-red/20 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${barWidth}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                </div>
              </div>
              <span className="text-red font-bold text-sm font-mono shrink-0">
                {entry.value}
              </span>
              <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
                {entry.secondary}%
              </span>
              {hasGgp && (
                <span className="w-12 text-right text-muted text-xs font-mono shrink-0">
                  {entry.ggp}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Stats display for a season ── */
function StatsDisplay({ stats }: { stats: ParsedStats }) {
  // Find the best podium category (points typically)
  const podiumCategory =
    stats.points.length >= 3
      ? { entries: stats.points, label: "Points" }
      : stats.goals.length >= 3
        ? { entries: stats.goals, label: "Goals" }
        : null;

  return (
    <>
      {/* Roster chips */}
      {stats.roster.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
            Roster
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.roster.map((player) => (
              <span
                key={player.name}
                className="px-3 py-1.5 bg-navy border border-border rounded-full text-sm font-semibold"
              >
                {getNickname(player.name)}{" "}
                <span className="text-muted text-xs">
                  ({player.position})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Podium for top category */}
      {podiumCategory && (
        <div className="mb-12 py-8 rounded-xl bg-gradient-to-b from-navy-dark/50 to-transparent border border-border/30">
          <Podium
            entries={podiumCategory.entries}
            label={podiumCategory.label}
          />
        </div>
      )}

      {/* Scoreboard leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <ScoreboardCard
          title="Plus/Minus"
          entries={stats.plusMinus}
          valueLabel="+/-"
          formatValue={(v) => (v > 0 ? `+${v}` : v.toString())}
        />
        <ScoreboardCard
          title="Points"
          entries={stats.points}
          valueLabel="PTS"
          secondaryLabel="GP"
          accent
        />
        <ScoreboardCard
          title="Goals"
          entries={stats.goals}
          valueLabel="G"
          secondaryLabel="SH%"
          secondaryIsPercent
        />
        <ScoreboardCard
          title="Assists"
          entries={stats.assists}
          valueLabel="A"
          secondaryLabel="PASS%"
          secondaryIsPercent
        />
        <ScoreboardCard
          title="Hits"
          entries={stats.hits}
          valueLabel="HIT"
          secondaryLabel="PIM"
        />
        <SavesScoreboard entries={stats.saves} />
        <ScoreboardCard
          title="Shutouts"
          entries={stats.shutouts}
          valueLabel="SO"
          secondaryLabel={
            stats.shutouts.some((e) => e.secondary !== undefined)
              ? "SO PER"
              : undefined
          }
        />
      </div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <h2 className="text-xl font-black uppercase tracking-[0.15em] whitespace-nowrap">
              Milestones
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
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
        <div className="flex gap-1 mb-10 flex-wrap bg-navy-dark/50 border border-border rounded-lg p-1 w-fit">
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
