"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match } from "@/types";
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

  const accentColor = isWin ? "#10b981" : "#cc1533";

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
          {match.matchType === "finals" && (
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
            isSyntheticForfeit ? "text-muted/30" : "text-red/70"
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
          className="block rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-red/40 hover:shadow-xl hover:shadow-red/10 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(140deg, rgba(13,21,38,0.95) 0%, rgba(18,26,42,0.9) 50%, rgba(10,17,32,0.95) 100%)",
          }}
        >
          {cardContent}
        </Link>
      )}
    </motion.div>
  );
}
