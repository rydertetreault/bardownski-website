"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FcClubMatch, FcMatchPlayer } from "@/lib/fcstats";
import { FcResultBadge } from "@/components/fc/FcUI";

const GOLD = "#c9a227";
const GOLD_LIGHT = "#e6c964";

type Filter = "all" | "league" | "playoff" | "friendly";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "league", label: "League" },
  { key: "playoff", label: "Playoffs" },
  { key: "friendly", label: "Friendlies" },
];

function ratingColor(r: number): string {
  if (r >= 8.5) return GOLD_LIGHT;
  if (r >= 7) return "#ffffff";
  if (r >= 5) return "rgba(255,255,255,0.6)";
  return "rgba(255,255,255,0.35)";
}

function PlayerRow({ p }: { p: FcMatchPlayer }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 text-sm">
      <span
        className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-white/35"
      >
        {p.position.slice(0, 3)}
      </span>
      <span className="flex-1 min-w-0 font-semibold text-white truncate">
        {p.name}
        {p.mom && (
          <span
            className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider align-middle"
            style={{ backgroundColor: GOLD, color: "#141414" }}
          >
            MOTM
          </span>
        )}
      </span>
      <span className="w-14 text-right tabular-nums text-white/70">
        {p.goals}G {p.assists}A
      </span>
      {p.saves > 0 && (
        <span className="w-14 text-right tabular-nums text-white/50 text-xs hidden sm:block">
          {p.saves} sv
        </span>
      )}
      <span
        className="w-10 text-right tabular-nums font-bold"
        style={{ color: ratingColor(p.rating) }}
      >
        {p.rating.toFixed(1)}
      </span>
    </div>
  );
}

function MatchCard({ match }: { match: FcClubMatch }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--fc-card)",
        border: "1px solid var(--fc-border)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <FcResultBadge result={match.result} forfeit={match.forfeit} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">
              Bardownski FC vs {match.opponent}
            </span>
          </div>
          <div className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
            {match.date} · {match.matchType}
            {match.forfeit ? " · opponent forfeit" : ""}
          </div>
        </div>
        <div className="text-2xl font-black tabular-nums shrink-0">
          <span style={{ color: match.result === "W" ? GOLD_LIGHT : "#ffffff" }}>
            {match.scoreUs}
          </span>
          <span className="text-white/30 mx-1.5">–</span>
          <span className="text-white/70">{match.scoreThem}</span>
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="w-4 h-4 shrink-0 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-5 py-4"
              style={{ borderTop: "1px solid var(--fc-border)" }}
            >
              {match.players.length === 0 ? (
                <p className="text-sm text-white/40 py-2">
                  No player data tracked for this match.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1 px-1">
                    <span className="w-10 shrink-0 text-[9px] uppercase tracking-[0.15em] text-white/30">
                      Pos
                    </span>
                    <span className="flex-1 text-[9px] uppercase tracking-[0.15em] text-white/30">
                      Player
                    </span>
                    <span className="w-14 text-right text-[9px] uppercase tracking-[0.15em] text-white/30">
                      G/A
                    </span>
                    <span className="w-10 text-right text-[9px] uppercase tracking-[0.15em] text-white/30">
                      Rat
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {match.players.map((p) => (
                      <PlayerRow key={p.gamertag} p={p} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FixturesClient({ matches }: { matches: FcClubMatch[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all" ? matches : matches.filter((m) => m.matchType === filter);

  const wins = filtered.filter((m) => m.result === "W").length;
  const losses = filtered.filter((m) => m.result === "L").length;
  const draws = filtered.filter((m) => m.result === "D").length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              style={{
                backgroundColor:
                  filter === f.key ? GOLD : "var(--fc-card)",
                color: filter === f.key ? "#141414" : "rgba(255,255,255,0.55)",
                border: "1px solid var(--fc-border)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/40 tabular-nums uppercase tracking-wider">
          {filtered.length} matches · {wins}W {losses}L {draws}D
        </span>
      </div>

      {/* Match list */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center text-white/40"
          style={{
            backgroundColor: "var(--fc-card)",
            border: "1px solid var(--fc-border)",
          }}
        >
          No matches in this competition yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
              >
                <MatchCard match={m} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-[11px] text-white/25 mt-6 text-center uppercase tracking-wider">
        Match history reflects EA&apos;s recent-match window per competition
      </p>
    </div>
  );
}
