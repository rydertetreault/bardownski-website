"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import type { Match } from "@/types";

function getResult(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    match.scoreUs === null ||
    match.scoreThem === null
  )
    return null;
  return match.scoreUs > match.scoreThem ? "W" : "L";
}

/* ── Featured Match — big angular scoreboard ─────────────────────────── */
function FeaturedMatch({ match }: { match: Match }) {
  const result = getResult(match);
  const isWin = result === "W";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 24px), 0 100%)",
      }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1526] via-[#111d35] to-[#0a1120]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.015) 59px, rgba(255,255,255,0.015) 60px)",
        }}
      />

      {/* Large angled accent stripe */}
      <div
        className="absolute top-0 right-0 w-[45%] h-full pointer-events-none"
        style={{
          background: isWin
            ? "linear-gradient(135deg, transparent 0%, rgba(16,185,129,0.06) 100%)"
            : "linear-gradient(135deg, transparent 0%, rgba(200,16,46,0.08) 100%)",
          clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      />

      {/* Score watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          className="text-[10rem] md:text-[16rem] font-black font-mono leading-none tracking-tighter"
          style={{ color: "rgba(255,255,255,0.02)" }}
        >
          {match.scoreUs}{match.scoreThem}
        </span>
      </div>

      {/* Red top edge */}
      <div className="h-[3px] bg-gradient-to-r from-[#cc1533] via-[#cc1533] to-transparent" />

      <div className="relative px-6 md:px-12 py-10 md:py-14">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-5 rounded-sm"
              style={{ backgroundColor: "#cc1533" }}
            />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50">
              Latest Result
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs text-white/30 uppercase tracking-widest font-medium">
              {match.date}
            </span>
            {match.matchType === "finals" && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 ml-1"
                style={{ clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}
              >
                Finals
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-center gap-4 md:gap-0">
          {/* Bardownski side */}
          <div className="flex items-center gap-3 md:gap-5 flex-1 justify-end">
            <div className="text-right hidden sm:block">
              <p className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                Bardownski
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5 capitalize">
                {match.homeAway}
              </p>
            </div>
            <div className="relative w-12 h-12 md:w-16 md:h-16 shrink-0">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Score block */}
          <div className="mx-4 md:mx-10 flex items-center gap-3 md:gap-5">
            <div
              className="flex items-center justify-center min-w-[56px] md:min-w-[80px] py-2 md:py-3"
              style={{
                backgroundColor: isWin ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              <span className={`text-4xl md:text-6xl font-black tabular-nums ${isWin ? "text-white" : "text-white/40"}`}>
                {match.scoreUs}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-px h-4 bg-white/10" />
              <span className="text-[10px] font-bold text-white/20 uppercase">vs</span>
              <div className="w-px h-4 bg-white/10" />
            </div>

            <div
              className="flex items-center justify-center min-w-[56px] md:min-w-[80px] py-2 md:py-3"
              style={{
                backgroundColor: !isWin ? "rgba(200,16,46,0.12)" : "rgba(255,255,255,0.05)",
                clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              <span className={`text-4xl md:text-6xl font-black tabular-nums ${!isWin ? "text-white" : "text-white/40"}`}>
                {match.scoreThem}
              </span>
            </div>
          </div>

          {/* Opponent side */}
          <div className="flex items-center gap-3 md:gap-5 flex-1">
            <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 flex items-center justify-center bg-white/[0.04] border border-white/[0.06]"
              style={{ clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}
            >
              <span className="text-lg md:text-2xl font-black text-white/20">
                {match.opponent.charAt(0)}
              </span>
            </div>
            <div className="text-left hidden sm:block">
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
        <div className="flex justify-between mt-3 sm:hidden px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            Bardownski
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            {match.opponent}
          </p>
        </div>

        {/* Result badge */}
        {match.status === "final" && result && (
          <div className="flex justify-center mt-6">
            <span
              className={`text-[10px] font-black uppercase tracking-[0.3em] px-5 py-1.5 ${
                isWin
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                  : "text-red bg-red/10 border border-red/20"
              }`}
              style={{
                clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              {isWin ? "Victory" : "Defeat"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Compact previous match row ──────────────────────────────────────── */
function PreviousMatch({ match, index }: { match: Match; index: number }) {
  const result = getResult(match);
  const isWin = result === "W";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.08, ease: "easeOut" }}
    >
      <div
        className="relative flex items-center bg-[#0d1526] border border-white/[0.05] overflow-hidden hover:border-white/[0.1] transition-colors"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
        }}
      >
        {/* Left result accent */}
        <div
          className={`w-[3px] self-stretch shrink-0 ${
            isWin ? "bg-emerald-500" : "bg-red"
          }`}
        />

        <div className="flex items-center flex-1 px-4 md:px-5 py-3.5 md:py-4 gap-3 md:gap-4 min-w-0">
          {/* Date */}
          <span className="text-[10px] text-white/25 uppercase tracking-widest font-medium w-20 md:w-28 shrink-0">
            {match.date}
          </span>

          {/* Teams */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative w-5 h-5 shrink-0">
              <Image
                src="/images/logo/BD - logo.png"
                alt=""
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xs md:text-sm font-bold uppercase tracking-wide text-white/80 truncate">
              BD
            </span>
            <span className="text-[10px] text-white/20 font-medium mx-1">
              vs
            </span>
            <span className="text-xs md:text-sm font-bold uppercase tracking-wide text-white/50 truncate">
              {match.opponent}
            </span>
            {match.matchType === "finals" && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400/70 bg-amber-500/10 px-1.5 py-px ml-1 shrink-0">
                Finals
              </span>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base md:text-lg font-black tabular-nums text-white/90">
              {match.scoreUs}
            </span>
            <span className="text-[10px] text-white/15 font-light">–</span>
            <span className="text-base md:text-lg font-black tabular-nums text-white/50">
              {match.scoreThem}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider w-5 text-center ml-1 ${
                isWin ? "text-emerald-400" : "text-red"
              }`}
            >
              {result}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Section ────────────────────────────────────────────────────── */
export default function MatchesPreviewSection({
  matches,
}: {
  matches: Match[];
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (matches.length === 0) {
    return (
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-5 bg-[#cc1533] rounded-sm" />
            <h2 className="text-2xl font-bold uppercase tracking-wider">
              Recent Matches
            </h2>
          </div>
          <div className="text-center py-16 bg-[#0d1526] border border-white/[0.05]"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), 0 100%)" }}
          >
            <p className="text-muted">Match results coming soon.</p>
          </div>
        </div>
      </section>
    );
  }

  const [featured, ...rest] = matches;
  const previousMatches = rest.slice(0, 2);

  return (
    <section ref={ref} className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6 md:mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-[#cc1533] rounded-sm" />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.15em] text-white">
              Matches
            </h2>
          </div>
          <Link
            href="/matches"
            className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/30 hover:text-[#cc1533] transition-colors"
          >
            View All
            <span className="inline-block ml-1.5 text-[#cc1533]">→</span>
          </Link>
        </motion.div>

        {/* Featured match */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {featured && <FeaturedMatch match={featured} />}
        </motion.div>

        {/* Previous matches */}
        {previousMatches.length > 0 && (
          <div className="space-y-[2px] mt-[2px]">
            {previousMatches.map((match, i) => (
              <PreviousMatch key={match.id} match={match} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
