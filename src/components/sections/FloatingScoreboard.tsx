"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Match } from "@/types";
import { getNickname } from "@/lib/nicknames";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

function shortDate(date: string): string {
  const parts = date.split(" ");
  if (parts.length >= 2)
    return `${parts[0].slice(0, 3)} ${parts[1].replace(",", "")}`;
  return date;
}

/* ── Featured match ──────────────────────────────────────────────────── */
function FeaturedCard({ match }: { match: Match }) {
  const result = getResult(match);
  const isWin = result === "W";

  return (
    <div className="px-5 py-5 pr-7">
      {/* Label */}
      <p className="text-[#cc1533] text-[9px] font-bold uppercase tracking-[0.22em] mb-4">
        Latest Result
      </p>

      {/* Teams + Score */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {/* BD */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-11 h-11 shrink-0">
            <Image
              src="/images/logo/BD - logo.png"
              alt="BD"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-white/30 text-[10px] uppercase tracking-widest">
            Bardownski
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3 mx-1">
          <span
            className={`text-3xl font-black tabular-nums ${isWin ? "text-white" : "text-white/40"}`}
          >
            {match.scoreUs}
          </span>
          <span className="text-sm text-white/15">–</span>
          <span
            className={`text-3xl font-black tabular-nums ${!isWin ? "text-white" : "text-white/40"}`}
          >
            {match.scoreThem}
          </span>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/5 border border-white/10 rounded-md">
            <span className="text-base font-black text-white/20">
              {match.opponent.charAt(0)}
            </span>
          </div>
          <span className="text-white/30 text-[10px] uppercase tracking-widest truncate max-w-[80px]">
            {match.opponent}
          </span>
        </div>
      </div>

      {/* Result badge */}
      <div className="flex justify-center mb-5">
        <span
          className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md ${
            isWin
              ? "text-emerald-400 bg-white/5 border border-white/10"
              : "text-[#cc1533] bg-white/5 border border-white/10"
          }`}
        >
          {isWin ? "Victory" : "Defeat"}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#cc1533]/20 mb-5" />

      {/* Stats */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {match.shotsUs != null && (
          <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2.5 py-1 rounded-md">
            Shots {match.shotsUs}-{match.shotsThem}
          </span>
        )}
        {match.toaUs && (
          <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2.5 py-1 rounded-md">
            TOA {match.toaUs}
          </span>
        )}
        {match.passCompUs != null && (
          <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2.5 py-1 rounded-md">
            Pass {match.passCompUs}%
          </span>
        )}
      </div>

      {/* Three Stars */}
      {match.threeStars && (
        <>
          <div className="h-px bg-[#cc1533]/20 mb-5" />
          <p className="text-[#cc1533] text-[9px] font-bold uppercase tracking-[0.22em] mb-3">
            Three Stars
          </p>
          <div className="space-y-2.5">
            {match.threeStars.map((star, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-amber-400/50 text-[10px] w-8">
                  {"★".repeat(3 - i)}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${
                    star.isOurPlayer ? "text-white/65" : "text-white/30"
                  }`}
                >
                  {star.isOurPlayer ? titleCase(getNickname(star.name)) : star.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {match.matchType === "finals" && (
        <>
          <div className="h-px bg-white/10 my-5" />
          <span className="text-[10px] bg-white/5 border border-white/10 text-amber-400 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
            Finals
          </span>
        </>
      )}
    </div>
  );
}

/* ── Compact score row (for collapsed view) ───────────────────────────── */
function ScoreRow({ match }: { match: Match }) {
  const result = getResult(match);
  const isWin = result === "W";

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isWin ? "bg-emerald-400" : "bg-[#cc1533]"
          }`}
        />
        <span className="text-white/30 text-[9px] uppercase tracking-widest">
          {shortDate(match.date)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase text-white/30 truncate max-w-[60px]">
          {match.opponent}
        </span>
        <span className="text-sm font-black tabular-nums text-white/75">
          {match.scoreUs}
          <span className="text-white/20 mx-0.5 text-[10px]">–</span>
          {match.scoreThem}
        </span>
        <span
          className={`text-[10px] font-black w-3 ${
            isWin ? "text-emerald-400" : "text-[#cc1533]"
          }`}
        >
          {result}
        </span>
      </div>
    </div>
  );
}

/* ── Compact match row (for expanded view) ────────────────────────────── */
function CompactMatch({ match }: { match: Match }) {
  const result = getResult(match);
  const isWin = result === "W";

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-white/30 text-[9px] uppercase tracking-widest">
          {shortDate(match.date)}
        </span>
        <span
          className={`text-[10px] font-black ${
            isWin ? "text-emerald-400" : "text-[#cc1533]"
          }`}
        >
          {result}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 shrink-0">
            <Image
              src="/images/logo/BD - logo.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>
          <span className="text-[10px] font-bold uppercase text-white/55">
            BD
          </span>
        </div>
        <span className="text-sm font-black tabular-nums text-white/75">
          {match.scoreUs}
          <span className="text-white/20 mx-0.5 text-[10px]">–</span>
          {match.scoreThem}
        </span>
        <span className="text-[10px] font-bold uppercase text-white/30 truncate max-w-[80px]">
          {match.opponent}
        </span>
      </div>
    </div>
  );
}

/* ── Floating scoreboard ─────────────────────────────────────────────── */
export default function FloatingScoreboard({
  matches,
}: {
  matches: Match[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (matches.length === 0) return null;

  const displayMatches = matches.slice(0, 3);
  const [featured, ...rest] = matches;
  const sideMatches = rest.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }}
      className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-6 xl:right-12 z-20"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!collapsed ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="relative bg-[#0d1528] border border-[#cc1533]/15 rounded-2xl overflow-hidden w-[340px] xl:w-[380px]"
          >
            {/* Red top accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#cc1533] via-[#cc1533] to-[#cc1533]/30" />

            {/* Collapse button */}
            <button
              onClick={() => setCollapsed(true)}
              className="absolute top-4 right-4 text-white/20 hover:text-white/60 transition-colors z-10"
              aria-label="Collapse"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Featured match */}
            <FeaturedCard match={featured} />

            {/* Previous matches */}
            {sideMatches.length > 0 && (
              <div>
                {sideMatches.map((m) => (
                  <div key={m.id}>
                    <div className="h-px bg-[#cc1533]/15 mx-5" />
                    <CompactMatch match={m} />
                  </div>
                ))}
              </div>
            )}

            {/* All Matches link */}
            <div className="h-px bg-[#cc1533]/15 mx-5" />
            <Link
              href="/matches"
              className="block px-5 py-4 hover:bg-[#cc1533]/5 transition-colors"
            >
              <p className="text-[#cc1533] text-[9px] uppercase tracking-widest font-bold">
                All matches →
              </p>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="relative bg-[#0d1528] border border-[#cc1533]/15 rounded-2xl overflow-hidden w-[260px]"
          >
            {/* Red top accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#cc1533] via-[#cc1533] to-[#cc1533]/30" />

            {/* Header with expand button */}
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-between px-4 pt-4 pb-2 cursor-pointer"
            >
              <p className="text-[#cc1533] text-[9px] font-bold uppercase tracking-[0.22em]">
                Recent Scores
              </p>
              <svg className="w-3.5 h-3.5 text-white/20 hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Score rows */}
            {displayMatches.map((m, i) => (
              <div key={m.id}>
                {i > 0 && <div className="h-px bg-[#cc1533]/10 mx-4" />}
                <ScoreRow match={m} />
              </div>
            ))}

            {/* All Matches link */}
            <div className="h-px bg-[#cc1533]/15 mx-4" />
            <Link
              href="/matches"
              className="block px-4 py-2.5 hover:bg-[#cc1533]/5 transition-colors"
            >
              <p className="text-[#cc1533] text-[9px] uppercase tracking-widest font-bold">
                All matches →
              </p>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
