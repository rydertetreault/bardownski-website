"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { FcPlayerMatchLog } from "@/lib/fcstats";
import { FcResultBadge, FcSectionHeading } from "@/components/fc/FcUI";

const GOLD = "#c9a227";
const GOLD_LIGHT = "#e6c964";

export interface StatsPlayer {
  gamertag: string;
  name: string;
  posGroup: string;
  proName: string;
  overall: number;
  gamesPlayed: number;
  winRate: number;
  goals: number;
  assists: number;
  points: number;
  ratingAve: number;
  shotSuccessRate: number;
  passesMade: number;
  passSuccessRate: number;
  tacklesMade: number;
  tackleSuccessRate: number;
  motm: number;
  redCards: number;
  cleanSheets: number;
  trackedSaves: number;
  trackedShots: number;
  log: FcPlayerMatchLog[];
}

/* ── Leaderboard config ── */
type LeaderKey =
  | "goals"
  | "assists"
  | "points"
  | "ratingAve"
  | "motm"
  | "passSuccessRate"
  | "tacklesMade"
  | "trackedSaves";

const LEADERBOARDS: { key: LeaderKey; label: string; fmt?: (v: number) => string; minGp?: number }[] = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "points", label: "Goal Contributions" },
  { key: "ratingAve", label: "Avg Rating", fmt: (v) => v.toFixed(1), minGp: 5 },
  { key: "motm", label: "Man of the Match" },
  { key: "passSuccessRate", label: "Pass Accuracy", fmt: (v) => `${v}%`, minGp: 5 },
  { key: "tacklesMade", label: "Tackles" },
  { key: "trackedSaves", label: "Saves" },
];

function ratingColor(r: number): string {
  if (r >= 8.5) return GOLD_LIGHT;
  if (r >= 7) return "#ffffff";
  if (r >= 5) return "rgba(255,255,255,0.6)";
  return "rgba(255,255,255,0.35)";
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--fc-card-light)", border: "1px solid var(--fc-border)" }}
    >
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/35">{label}</div>
      <div className="text-xl font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}

export default function StatsClient({ players }: { players: StatsPlayer[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlPlayer = searchParams.get("player");
  const [selected, setSelected] = useState<string | null>(urlPlayer);

  useEffect(() => {
    setSelected(urlPlayer);
  }, [urlPlayer]);

  const select = (gamertag: string | null) => {
    setSelected(gamertag);
    const q = gamertag ? `?player=${encodeURIComponent(gamertag)}` : "";
    router.replace(`${pathname}${q}`, { scroll: false });
  };

  const player = useMemo(
    () => players.find((p) => p.gamertag === selected) ?? null,
    [players, selected]
  );

  const boards = useMemo(
    () =>
      LEADERBOARDS.map((b) => {
        const pool = players.filter(
          (p) => (b.minGp ? p.gamesPlayed >= b.minGp : true) && (p[b.key] as number) > 0
        );
        const sorted = [...pool].sort((a, c) => (c[b.key] as number) - (a[b.key] as number));
        return { ...b, entries: sorted.slice(0, 5) };
      }).filter((b) => b.entries.length > 0),
    [players]
  );

  return (
    <div>
      {/* ── Player selector ── */}
      <FcSectionHeading>Player Deep Dive</FcSectionHeading>
      <div className="flex gap-2 flex-wrap mb-8">
        {players.map((p) => (
          <button
            key={p.gamertag}
            onClick={() => select(selected === p.gamertag ? null : p.gamertag)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              backgroundColor: selected === p.gamertag ? GOLD : "var(--fc-card)",
              color: selected === p.gamertag ? "#141414" : "rgba(255,255,255,0.55)",
              border: "1px solid var(--fc-border)",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── Player detail panel ── */}
      <AnimatePresence mode="wait">
        {player && (
          <motion.div
            key={player.gamertag}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="mb-14"
          >
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                backgroundColor: "var(--fc-card)",
                border: `1px solid ${GOLD}30`,
              }}
            >
              {/* Header */}
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                    {player.posGroup}
                    {player.proName ? ` · "${player.proName}"` : ""} · {player.gamertag}
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                    {player.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {player.overall > 0 && (
                    <div className="text-center">
                      <div className="text-3xl font-black" style={{ color: GOLD_LIGHT }}>
                        {player.overall}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-white/35">OVR</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-3xl font-black" style={{ color: ratingColor(player.ratingAve) }}>
                      {player.ratingAve.toFixed(1)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-white/35">Rating</div>
                  </div>
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                <StatBox label="Apps" value={player.gamesPlayed} />
                <StatBox label="Goals" value={player.goals} />
                <StatBox label="Assists" value={player.assists} />
                <StatBox label="Points" value={player.points} />
                <StatBox label="Win Rate" value={`${player.winRate}%`} />
                <StatBox label="MOTM" value={player.motm} />
                <StatBox label="Shot Acc" value={`${player.shotSuccessRate}%`} />
                <StatBox label="Passes" value={player.passesMade} />
                <StatBox label="Pass Acc" value={`${player.passSuccessRate}%`} />
                <StatBox label="Tackles" value={player.tacklesMade} />
                <StatBox label="Tackle Acc" value={`${player.tackleSuccessRate}%`} />
                {player.trackedSaves > 0 ? (
                  <StatBox label="Saves*" value={player.trackedSaves} />
                ) : (
                  <StatBox label="Clean Sheets" value={player.cleanSheets} />
                )}
              </div>

              {/* Match log */}
              {player.log.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-3">
                    Recent Match Log
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="text-left text-[9px] uppercase tracking-[0.15em] text-white/30"
                          style={{ borderBottom: "1px solid var(--fc-border)" }}
                        >
                          <th className="py-2 pr-3 font-medium">Date</th>
                          <th className="py-2 px-3 font-medium">Opponent</th>
                          <th className="py-2 px-3 font-medium text-center">Res</th>
                          <th className="py-2 px-3 font-medium text-right">Score</th>
                          <th className="py-2 px-3 font-medium text-right">G</th>
                          <th className="py-2 px-3 font-medium text-right">A</th>
                          <th className="py-2 px-3 font-medium text-right hidden sm:table-cell">Shots</th>
                          <th className="py-2 px-3 font-medium text-right hidden sm:table-cell">Tkl</th>
                          <th className="py-2 pl-3 font-medium text-right">Rat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {player.log.map((g) => (
                          <tr
                            key={g.matchId}
                            className="text-white/70"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            <td className="py-2.5 pr-3 whitespace-nowrap text-white/50">{g.date}</td>
                            <td className="py-2.5 px-3 max-w-[140px] truncate">
                              {g.opponent}
                              {g.mom && (
                                <span
                                  className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: GOLD, color: "#141414" }}
                                >
                                  MOTM
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <FcResultBadge result={g.result} size="sm" />
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                              {g.scoreUs}–{g.scoreThem}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-white">
                              {g.goals}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{g.assists}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums hidden sm:table-cell">
                              {g.shots}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums hidden sm:table-cell">
                              {g.tacklesMade}
                            </td>
                            <td
                              className="py-2.5 pl-3 text-right tabular-nums font-bold"
                              style={{ color: ratingColor(g.rating) }}
                            >
                              {g.rating.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-white/25 mt-3 uppercase tracking-wider">
                    *Log limited to EA&apos;s tracked recent-match window
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leaderboards ── */}
      <FcSectionHeading>Leaderboards</FcSectionHeading>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {boards.map((b) => (
          <div
            key={b.key}
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--fc-card)", border: "1px solid var(--fc-border)" }}
          >
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
              {b.label}
            </h3>
            <div className="flex flex-col gap-2.5">
              {b.entries.map((p, i) => (
                <button
                  key={p.gamertag}
                  onClick={() => select(p.gamertag)}
                  className="flex items-center gap-3 text-left cursor-pointer group"
                >
                  <span
                    className="text-sm font-black w-5 shrink-0 tabular-nums"
                    style={{ color: i === 0 ? GOLD : "rgba(255,255,255,0.25)" }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`flex-1 truncate text-sm group-hover:text-white transition-colors ${
                      i === 0 ? "font-bold text-white" : "text-white/60"
                    }`}
                  >
                    {p.name}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: i === 0 ? GOLD_LIGHT : "rgba(255,255,255,0.7)" }}
                  >
                    {b.fmt ? b.fmt(p[b.key] as number) : (p[b.key] as number)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
