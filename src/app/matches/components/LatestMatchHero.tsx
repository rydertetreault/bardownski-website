"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match } from "@/types";
import { getNickname } from "@/lib/nicknames";
import { getResult } from "../utils";

export function LatestMatchHero({ match }: { match: Match }) {
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
