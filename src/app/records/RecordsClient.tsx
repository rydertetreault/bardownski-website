"use client";

import { motion } from "framer-motion";
import { FadeUp, StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/Animate";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { AllTimeRecord, SeasonMVP } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

/* ── Banner-shaped record (pennant hanging from rafters) ── */
function RecordBanner({
  record,
  index,
}: {
  record: AllTimeRecord;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
      className="group relative"
    >
      {/* Hanging line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />

      {/* Banner body */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative mt-6 bg-gradient-to-b from-navy-light to-navy border border-border overflow-hidden"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
        }}
      >
        {/* Diagonal stripe accent */}
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute -top-2 -right-6 w-20 h-6 bg-red/20 rotate-45" />
        </div>

        <div className="px-5 pt-5 pb-10 text-center">
          {/* Label */}
          <p className="text-[10px] text-muted uppercase tracking-[0.2em] mb-2 font-semibold">
            {record.label}
          </p>

          {/* Big number */}
          <p className="text-4xl md:text-5xl font-black text-red font-mono leading-none mb-3">
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

          {/* Player name */}
          <p className="text-sm font-bold tracking-wide">
            {getNickname(record.player)}
          </p>
          {record.season && (
            <p className="text-[10px] text-muted mt-1 tracking-wider">
              {record.season}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Featured "best of" record — bigger hero callout ── */
function FeaturedRecord({ record }: { record: AllTimeRecord }) {
  return (
    <FadeUp className="mb-16">
      <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-navy-dark via-navy to-navy-dark">
        {/* Large faded number behind */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[12rem] md:text-[18rem] font-black text-white/[0.03] font-mono leading-none">
            {record.value > 0 ? `${record.prefix ?? ""}${record.value}${record.suffix ?? ""}` : ""}
          </span>
        </div>

        {/* Red accent bar top */}
        <div className="h-1 bg-gradient-to-r from-transparent via-red to-transparent" />

        <div className="relative px-8 py-12 md:py-16 text-center">
          <p className="text-xs text-red font-bold uppercase tracking-[0.3em] mb-4">
            All-Time Record
          </p>
          <p className="text-6xl md:text-8xl font-black text-red font-mono mb-4">
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
          <p className="text-lg text-muted uppercase tracking-widest mb-2">
            {record.label}
          </p>
          <p className="text-2xl font-black tracking-wide">
            {getNickname(record.player)}
          </p>
          {record.season && (
            <p className="text-sm text-muted mt-2">{record.season} Season</p>
          )}
        </div>

        {/* Red accent bar bottom */}
        <div className="h-1 bg-gradient-to-r from-transparent via-red to-transparent" />
      </div>
    </FadeUp>
  );
}

/* ── MVP card with trophy styling ── */
function MVPCard({ mvp, index }: { mvp: SeasonMVP; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="relative bg-gradient-to-b from-navy-light/60 to-surface border border-border rounded-xl p-6 overflow-hidden"
    >
      {/* Gold/amber MVP accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Trophy watermark */}
      <div className="absolute top-3 right-3 text-5xl opacity-[0.06] select-none font-black">
        MVP
      </div>

      {/* Season badge */}
      <div className="inline-flex items-center gap-2 bg-red/10 border border-red/20 rounded-md px-3 py-1.5 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-red" />
        <span className="text-red text-xs font-bold uppercase tracking-widest">
          {mvp.projected ? "Projected " : ""}{mvp.season} Season
        </span>
      </div>

      {/* Player */}
      <p className="text-2xl font-black mb-1">{getNickname(mvp.player)}</p>
      <p className="text-xs text-muted uppercase tracking-widest mb-4">
        {mvp.position}
      </p>

      {/* Stat highlights */}
      {mvp.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mvp.highlights.map((h) => (
            <span
              key={h}
              className="bg-white/5 border border-border rounded-md px-2.5 py-1 text-xs font-mono font-semibold text-red"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function RecordsClient({
  records,
  mvps,
}: {
  records: AllTimeRecord[];
  mvps: SeasonMVP[];
}) {
  const skaterRecords = records.filter((r) => r.category === "skater");
  const goalieRecords = records.filter((r) => r.category === "goalie");

  // Pick the most impressive record as the featured one (highest points, or first skater record)
  const featuredRecord =
    skaterRecords.find((r) => r.label.toLowerCase().includes("point")) ??
    skaterRecords[0];
  const remainingSkater = skaterRecords.filter((r) => r !== featuredRecord);

  return (
    <>
      {/* Featured record hero */}
      {featuredRecord && <FeaturedRecord record={featuredRecord} />}

      {/* Season MVPs */}
      {mvps.length > 0 && (
        <div className="mb-16">
          <FadeUp>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              <h2 className="text-xl font-black uppercase tracking-[0.2em] text-center whitespace-nowrap">
                Season MVPs
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mvps.map((mvp, i) => (
              <MVPCard key={mvp.season} mvp={mvp} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Skater Records — Banners in the Rafters */}
      <div className="mb-16">
        <FadeUp>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-center whitespace-nowrap">
              Skater Records
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
          </div>
          <p className="text-center text-muted text-xs uppercase tracking-widest mb-8">
            Hanging in the rafters
          </p>
        </FadeUp>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-2">
          {remainingSkater.map((record, i) => (
            <RecordBanner key={record.label} record={record} index={i} />
          ))}
        </div>
      </div>

      {/* Goalie Records — Banners */}
      <div className="mb-8">
        <FadeUp>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-center whitespace-nowrap">
              Goalie Records
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
          </div>
          <p className="text-center text-muted text-xs uppercase tracking-widest mb-8">
            Between the pipes
          </p>
        </FadeUp>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2">
          {goalieRecords.map((record, i) => (
            <RecordBanner key={record.label} record={record} index={i} />
          ))}
        </div>
      </div>
    </>
  );
}
