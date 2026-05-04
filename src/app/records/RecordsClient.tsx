"use client";


import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "@/components/ui/Animate";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { AllTimeRecord, SeasonMVP, SeasonData } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */

interface RecordTracker {
  label: string;
  recordHolder: string;
  recordValue: number;
  recordSeason: string;
  currentLeader: string;
  currentValue: number;
  percentage: number;
  suffix?: string;
  prefix?: string;
  category: "skater" | "goalie";
}

interface SeasonComparison {
  season: string;
  goals: number;
  assists: number;
  points: number;
  hits: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   Compute helpers
   ══════════════════════════════════════════════════════════════════════════ */

function computeRecordTrackers(
  records: AllTimeRecord[],
  seasons: SeasonData[]
): RecordTracker[] {
  const currentSeason = seasons[0];
  if (!currentSeason) return [];

  const stats = currentSeason.stats;
  const trackers: RecordTracker[] = [];

  const statMap: {
    label: string;
    key: keyof typeof stats;
    category: "skater" | "goalie";
  }[] = [
    { label: "Most Goals", key: "goals", category: "skater" },
    { label: "Most Assists", key: "assists", category: "skater" },
    { label: "Most Points", key: "points", category: "skater" },
    { label: "Most Hits", key: "hits", category: "skater" },
    { label: "Most Saves", key: "saves", category: "goalie" },
    { label: "Most Shutouts", key: "shutouts", category: "goalie" },
  ];

  for (const { label, key, category } of statMap) {
    const record = records.find((r) => r.label === label);
    if (!record || record.value === 0) continue;

    const entries = stats[key] as { name: string; value: number }[];
    if (!entries || entries.length === 0) continue;

    const leader = entries[0];
    if (!leader) continue;

    if (record.season === currentSeason.season && record.player === leader.name)
      continue;

    const pct = Math.min(100, Math.round((leader.value / record.value) * 100));

    trackers.push({
      label,
      recordHolder: record.player,
      recordValue: record.value,
      recordSeason: record.season,
      currentLeader: leader.name,
      currentValue: leader.value,
      percentage: pct,
      suffix: record.suffix,
      prefix: record.prefix,
      category,
    });
  }

  trackers.sort((a, b) => b.percentage - a.percentage);
  return trackers;
}

function computeSeasonComparisons(seasons: SeasonData[]): SeasonComparison[] {
  return seasons.map((s) => ({
    season: s.season,
    goals: s.stats.goals[0]?.value ?? 0,
    assists: s.stats.assists[0]?.value ?? 0,
    points: s.stats.points[0]?.value ?? 0,
    hits: s.stats.hits[0]?.value ?? 0,
  }));
}

/* ══════════════════════════════════════════════════════════════════════════
   Shared UI Components
   ══════════════════════════════════════════════════════════════════════════ */



/* ══════════════════════════════════════════════════════════════════════════
   Shared UI Components
   ══════════════════════════════════════════════════════════════════════════ */

function TrackerCard({
  tracker,
  index,
}: {
  tracker: RecordTracker;
  index: number;
}) {
  const remaining = tracker.recordValue - tracker.currentValue;
  const isClose = tracker.percentage >= 75;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      className="relative bg-navy/80 border border-border rounded-xl overflow-hidden"
    >
      <div
        className={`h-0.5 bg-gradient-to-r ${
          isClose
            ? "from-amber-500 via-amber-500/50 to-transparent"
            : "from-red via-red/50 to-transparent"
        }`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-semibold">
              {tracker.label}
            </p>
            <p className="text-sm font-bold mt-1">
              {getNickname(tracker.currentLeader)}
            </p>
          </div>
          {isClose && (
            <span className="shrink-0 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase tracking-widest rounded-md px-2 py-0.5">
              Closing in
            </span>
          )}
        </div>

        <div className="relative h-3 bg-navy-dark rounded-full overflow-hidden border border-border/50 mb-3">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${
              isClose
                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                : "bg-gradient-to-r from-red to-red-light"
            }`}
            initial={{ width: 0 }}
            whileInView={{ width: `${tracker.percentage}%` }}
            viewport={{ once: true }}
            transition={{
              duration: 1,
              delay: index * 0.06 + 0.3,
              ease: "easeOut",
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-red">
            {tracker.prefix}
            {tracker.currentValue}
            {tracker.suffix}
          </span>
          <span className="text-muted">
            {remaining > 0
              ? `${remaining} away from record`
              : "Record matched!"}
          </span>
          <span className="font-mono font-semibold text-muted/60">
            {tracker.prefix}
            {tracker.recordValue}
            {tracker.suffix}
          </span>
        </div>

        <p className="text-[10px] text-muted/50 mt-2">
          Record: {getNickname(tracker.recordHolder)} ({tracker.recordSeason})
        </p>
      </div>
    </motion.div>
  );
}

function SeasonChart({
  comparisons,
  statKey,
  label,
  color,
}: {
  comparisons: SeasonComparison[];
  statKey: keyof Omit<SeasonComparison, "season">;
  label: string;
  color: string;
}) {
  const max = Math.max(...comparisons.map((c) => c[statKey]), 1);

  return (
    <div className="bg-navy/80 border border-border rounded-xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
      <div className="p-5">
        <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-semibold mb-4">
          {label} by season (leader)
        </p>
        <div className="space-y-3">
          {comparisons.map((c, i) => {
            const pct = Math.round((c[statKey] / max) * 100);
            const isFirst = i === 0;
            return (
              <div key={c.season}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isFirst ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {c.season}
                    {isFirst && (
                      <span className="ml-1.5 text-[9px] text-red font-bold uppercase">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono font-bold">
                    {c[statKey]}
                  </span>
                </div>
                <div className="h-2 bg-navy-dark rounded-full overflow-hidden border border-border/30">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: isFirst ? color : `${color}66`,
                    }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  index,
}: {
  record: AllTimeRecord;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group relative bg-navy/80 border border-border rounded-xl overflow-hidden transition-colors hover:border-border/80"
    >
      <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
      <div className="p-5">
        <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-semibold mb-3">
          {record.label}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl md:text-4xl font-black text-red font-mono leading-none">
              {record.value > 0 ? (
                <>
                  {record.prefix}
                  <AnimatedNumber from={0} to={record.value} />
                  {record.suffix}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tracking-wide">
              {getNickname(record.player)}
            </p>
            {record.season && (
              <p className="text-[10px] text-muted tracking-wider mt-0.5">
                {record.season}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturedRecord({ record }: { record: AllTimeRecord }) {
  return (
    <FadeUp className="mb-14">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-navy-dark/80 via-navy/60 to-navy-dark/80 backdrop-blur-sm">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[10rem] md:text-[16rem] font-black text-white/[0.03] font-mono leading-none">
            {record.value > 0
              ? `${record.prefix ?? ""}${record.value}${record.suffix ?? ""}`
              : ""}
          </span>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-red to-transparent" />
        <div className="relative px-8 py-10 md:py-14 text-center">
          <p className="text-xs text-red font-bold uppercase tracking-[0.3em] mb-4">
            All-Time Record
          </p>
          <p className="text-5xl md:text-7xl font-black text-red font-mono mb-3">
            {record.value > 0 ? (
              <>
                {record.prefix}
                <AnimatedNumber from={0} to={record.value} />
                {record.suffix}
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="text-base text-muted uppercase tracking-widest mb-2">
            {record.label}
          </p>
          <p className="text-xl font-black tracking-wide">
            {getNickname(record.player)}
          </p>
          {record.season && (
            <p className="text-sm text-muted mt-1.5">{record.season} Season</p>
          )}
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-red to-transparent" />
      </div>
    </FadeUp>
  );
}

function MVPCard({ mvp, index }: { mvp: SeasonMVP; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -3 }}
      className="relative bg-navy/80 border border-border rounded-xl overflow-hidden transition-colors hover:border-amber-500/20"
    >
      <div className="h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-500/30 to-transparent" />
      <div className="p-5">
        <div className="absolute top-3 right-3 text-4xl opacity-[0.04] select-none font-black">
          MVP
        </div>
        <div className="inline-flex items-center gap-2 bg-red/10 border border-red/20 rounded-md px-2.5 py-1 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-red" />
          <span className="text-red text-[10px] font-bold uppercase tracking-widest">
            {mvp.projected ? "Projected " : ""}
            {mvp.season} Season
          </span>
        </div>
        <p className="text-xl font-black mb-0.5">{getNickname(mvp.player)}</p>
        <p className="text-[10px] text-muted uppercase tracking-widest mb-4">
          {mvp.position}
        </p>
        {mvp.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mvp.highlights.map((h) => (
              <span
                key={h}
                className="bg-white/5 border border-border rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold text-red"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <FadeUp>
      <div className="mb-6">
        <div className="flex flex-col gap-px mb-4">
          <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
          <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
        </div>
        <div className="flex items-center gap-3">
          <span className="block w-1 h-6 bg-red rounded-sm" />
          <h2 className="text-2xl font-black uppercase tracking-wider">
            {title}
          </h2>
        </div>
      </div>
    </FadeUp>
  );
}

function SectionBanner({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  objectPosition,
}: {
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  objectPosition?: string;
}) {
  return (
    <FadeUp className="mb-8">
      <div className="relative h-28 md:h-36 rounded-xl overflow-hidden border border-border">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          style={{ objectPosition: objectPosition ?? "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/90 via-navy-dark/70 to-navy-dark/90" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-center">
            {title}
          </h2>
          <div className="w-10 h-0.5 bg-red mt-2 rounded-full" />
          <p className="text-muted text-[10px] uppercase tracking-widest mt-2">
            {subtitle}
          </p>
        </div>
      </div>
    </FadeUp>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Export
   ══════════════════════════════════════════════════════════════════════════ */

export default function RecordsClient({
  records,
  mvps,
  seasons,
  longestWinStreak,
  isStreakActive,
}: {
  records: AllTimeRecord[];
  mvps: SeasonMVP[];
  seasons: SeasonData[];
  longestWinStreak: number;
  isStreakActive: boolean;
}) {
  const skaterRecords = records.filter((r) => r.category === "skater");
  const goalieRecords = records.filter((r) => r.category === "goalie");

  const featuredRecord =
    skaterRecords.find((r) => r.label.toLowerCase().includes("point")) ??
    skaterRecords[0];
  const remainingSkater = skaterRecords.filter((r) => r !== featuredRecord);

  const trackers = computeRecordTrackers(records, seasons);
  const comparisons = computeSeasonComparisons(seasons);

  const [activePlayerTab, setActivePlayerTab] = useState<"skater" | "goalie">(
    "skater"
  );

  return (
    <>
      {/* 1. Team Records — club-wide records, top of the page */}
      <div className="mb-14">
        <SectionBanner
          title="Team Records"
          subtitle="Forged by the room"
          imageSrc="/images/bench.png"
          imageAlt="Bardownski bench"
          objectPosition="center"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {longestWinStreak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative bg-navy/80 border border-border rounded-xl overflow-hidden transition-colors hover:border-border/80"
            >
              <div
                className={`h-0.5 bg-gradient-to-r ${
                  isStreakActive
                    ? "from-emerald-500 via-emerald-500/50 to-transparent"
                    : "from-red via-red/50 to-transparent"
                }`}
              />
              <div className="p-5">
                <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-semibold mb-3">
                  Longest Win Streak
                </p>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p
                      className={`text-3xl md:text-4xl font-black font-mono leading-none ${
                        isStreakActive ? "text-emerald-400" : "text-red"
                      }`}
                    >
                      <AnimatedNumber from={0} to={longestWinStreak} />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tracking-wide">
                      {longestWinStreak === 1 ? "Game" : "Games"}
                    </p>
                    {isStreakActive && (
                      <span className="inline-block mt-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-widest rounded-md px-2 py-0.5">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
            className="relative bg-navy/80 border border-border rounded-xl overflow-hidden transition-colors hover:border-border/80"
          >
            <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
            <div className="p-5">
              <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-semibold mb-3">
                Most Goals in One Game
              </p>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl md:text-4xl font-black font-mono leading-none text-red">
                    <AnimatedNumber from={0} to={18} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tracking-wide">Goals</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. Featured record — crown jewel */}
      {featuredRecord && <FeaturedRecord record={featuredRecord} />}

      {/* 3. Player Records — parent section with Skater / Goalie tabs */}
      <div className="mb-14">
        <SectionBanner
          title="Player Records"
          subtitle="Hanging in the rafters"
          imageSrc="/images/gallery/screenshots/Screenshot 2026-03-16 183710.webp"
          imageAlt="Bardownski player"
          objectPosition="0% 75%"
        />

        {/* Tab nav */}
        <div className="flex gap-2 mb-6">
          {(
            [
              { key: "skater", label: "Skater" },
              { key: "goalie", label: "Goalie" },
            ] as const
          ).map((tab) => {
            const isActive = activePlayerTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActivePlayerTab(tab.key)}
                className={`relative px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="player-tab-active"
                    className="absolute inset-0 bg-red rounded-md"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content with pop in/out animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePlayerTab}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {activePlayerTab === "skater" && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative bg-navy/80 border border-border rounded-xl overflow-hidden transition-colors hover:border-border/80"
                >
                  <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
                  <div className="p-5">
                    <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-semibold mb-3">
                      Most Goals in One Game
                    </p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl md:text-4xl font-black font-mono leading-none text-red">
                          <AnimatedNumber from={0} to={15} />
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tracking-wide">
                          {getNickname("Xavier Laflamme")}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
                {remainingSkater.map((record, i) => (
                  <RecordCard key={record.label} record={record} index={i + 1} />
                ))}
              </>
            )}
            {activePlayerTab === "goalie" &&
              (goalieRecords.length > 0 ? (
                goalieRecords.map((record, i) => (
                  <RecordCard key={record.label} record={record} index={i} />
                ))
              ) : (
                <p className="text-muted text-sm col-span-full text-center py-8">
                  No goalie records yet.
                </p>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 5. Season MVPs */}
      {mvps.length > 0 && (
        <div className="mb-14">
          <SectionDivider title="Season MVPs" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mvps.map((mvp, i) => (
              <MVPCard key={mvp.season} mvp={mvp} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Record Tracker — current season vs all-time */}
      {trackers.length > 0 && (
        <div className="mb-14">
          <SectionDivider title="Record Tracker" />
          <FadeUp>
            <p className="text-xs text-muted uppercase tracking-widest ml-4 -mt-4 mb-8">
              {seasons[0]?.season ?? ""} season progress toward all-time records
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackers.map((t, i) => (
              <TrackerCard key={t.label} tracker={t} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Season Comparison */}
      {comparisons.length > 1 && (
        <div className="mb-14">
          <SectionDivider title="Season Comparison" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SeasonChart
              comparisons={comparisons}
              statKey="points"
              label="Points"
              color="#c8102e"
            />
            <SeasonChart
              comparisons={comparisons}
              statKey="goals"
              label="Goals"
              color="#e0233e"
            />
            <SeasonChart
              comparisons={comparisons}
              statKey="assists"
              label="Assists"
              color="#5b9bd5"
            />
            <SeasonChart
              comparisons={comparisons}
              statKey="hits"
              label="Hits"
              color="#7a8ba8"
            />
          </div>
        </div>
      )}

    </>
  );
}
