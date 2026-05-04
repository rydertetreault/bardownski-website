"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match } from "@/types";
import { isChampionshipClincher } from "@/lib/championship";
import { getResult } from "../utils";

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

export function ScoreCard({ match, index }: { match: Match; index: number }) {
  const result = getResult(match);
  const isWin = result === "W";
  const isFinal = match.status === "final";
  const isSyntheticForfeit = match.id.startsWith("forfeit-");
  const isClincher = isChampionshipClincher(match);

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

  const accentColor = isClincher ? "#f4d35e" : isWin ? "#10b981" : "#cc1533";

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
          {isClincher ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-200 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border border-amber-300/40 px-2 py-0.5"
              style={{
                clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                textShadow: "0 0 12px rgba(244,211,94,0.45)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                <path d="M7 2h10v2h3v3a4 4 0 0 1-4 4h-.35A5.001 5.001 0 0 1 13 14.9V17h2v2H9v-2h2v-2.1A5.001 5.001 0 0 1 7.35 11H7a4 4 0 0 1-4-4V4h3V2zm0 4H5v1a2 2 0 0 0 2 2V6zm10 3a2 2 0 0 0 2-2V6h-2v3zM6 21h12v2H6v-2z" />
              </svg>
              Club Finals Championship
            </span>
          ) : match.matchType === "finals" && (
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
            isSyntheticForfeit
              ? "text-muted/30"
              : isClincher
              ? "text-amber-300"
              : "text-red/70"
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
          className={`block rounded-xl border overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
            isClincher
              ? "border-amber-400/50 hover:border-amber-300/80 hover:shadow-xl hover:shadow-amber-500/25"
              : "border-border/50 hover:border-red/40 hover:shadow-xl hover:shadow-red/10"
          }`}
          style={{
            background: isClincher
              ? "linear-gradient(140deg, rgba(46,34,8,0.95) 0%, rgba(58,42,10,0.9) 50%, rgba(38,28,6,0.95) 100%)"
              : "linear-gradient(140deg, rgba(13,21,38,0.95) 0%, rgba(18,26,42,0.9) 50%, rgba(10,17,32,0.95) 100%)",
          }}
        >
          {cardContent}
        </Link>
      )}
    </motion.div>
  );
}
