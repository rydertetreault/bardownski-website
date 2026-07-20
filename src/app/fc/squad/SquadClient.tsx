"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#c9a227";
const GOLD_LIGHT = "#e6c964";

export interface SquadPlayer {
  gamertag: string;
  name: string;
  proName: string;
  posGroup: string;
  position: string;
  height: string;
  overall: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  ratingAve: number;
  winRate: number;
  motm: number;
  passSuccessRate: number;
  cleanSheets: number;
  saves: number;
  stillIndex: number;
}

const GROUPS = ["FW", "MID", "DEF", "GK", "—"] as const;
const GROUP_LABELS: Record<string, string> = {
  FW: "Forwards",
  MID: "Midfielders",
  DEF: "Defenders",
  GK: "Goalkeepers",
  "—": "Utility",
};

function still(i: number): string {
  return `/fc/images/gallery/fc-still-${String(i).padStart(2, "0")}.webp`;
}

function PlayerCard({ p, index }: { p: SquadPlayer; index: number }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.07 }}
      className="cursor-pointer select-none"
      style={{ perspective: 1000 }}
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full aspect-[3/4] rounded-2xl"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ── Front ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            backgroundColor: "var(--fc-card)",
            border: "1px solid var(--fc-border)",
          }}
        >
          <Image
            src={still(p.stillIndex)}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover object-top opacity-60"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,21,24,0.3) 0%, rgba(20,21,24,0.55) 55%, rgba(20,21,24,0.97) 100%)",
            }}
          />

          {/* OVR + position chip */}
          <div className="absolute top-4 left-4 flex flex-col items-center">
            <span
              className="text-3xl font-black leading-none"
              style={{ color: GOLD_LIGHT }}
            >
              {p.overall || "—"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 mt-0.5">
              {p.posGroup}
            </span>
          </div>

          {p.motm > 0 && (
            <span
              className="absolute top-4 right-4 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: GOLD, color: "#141414" }}
            >
              {p.motm}× MOTM
            </span>
          )}

          {/* Name block */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
              {p.proName ? `"${p.proName}"` : p.gamertag}
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white leading-none mb-3">
              {p.name}
            </h3>
            <div
              className="flex items-center gap-4 pt-3"
              style={{ borderTop: `1px solid var(--fc-border)` }}
            >
              <div>
                <div className="text-sm font-bold tabular-nums text-white">{p.gamesPlayed}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/35">Apps</div>
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums text-white">{p.goals}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/35">Goals</div>
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums text-white">{p.assists}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/35">Assists</div>
              </div>
              <div className="ml-auto">
                <div className="text-sm font-bold tabular-nums" style={{ color: GOLD_LIGHT }}>
                  {p.ratingAve.toFixed(1)}
                </div>
                <div className="text-[8px] uppercase tracking-wider text-white/35">Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Back ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden p-5 flex flex-col"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "var(--fc-card)",
            border: `1px solid ${GOLD}40`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black tracking-tight text-white">{p.name}</h3>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              {p.posGroup}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm flex-1">
            {[
              ["Position", p.position],
              ["Height", p.height],
              ["Overall", p.overall || "—"],
              ["Win Rate", `${p.winRate}%`],
              ["Points", p.points],
              ["Avg Rating", p.ratingAve.toFixed(1)],
              ["Pass %", `${p.passSuccessRate}%`],
              ["MOTM", p.motm],
              ...(p.posGroup === "GK" || p.saves > 0
                ? ([
                    ["Saves*", p.saves],
                    ["Clean Sheets", p.cleanSheets],
                  ] as const)
                : ([["Clean Sheets", p.cleanSheets]] as const)),
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/35">{label}</div>
                <div className="font-bold tabular-nums text-white">{value}</div>
              </div>
            ))}
          </div>

          <Link
            href={`/fc/stats?player=${encodeURIComponent(p.gamertag)}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-4 inline-flex items-center justify-center w-full py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all hover:brightness-110"
            style={{ backgroundColor: GOLD, color: "#141414" }}
          >
            Full Stats →
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SquadClient({ players }: { players: SquadPlayer[] }) {
  const [filter, setFilter] = useState<string>("all");

  const groups = GROUPS.filter((g) => players.some((p) => p.posGroup === g));
  const visible =
    filter === "all" ? players : players.filter((p) => p.posGroup === filter);

  return (
    <div>
      {/* Position filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setFilter("all")}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          style={{
            backgroundColor: filter === "all" ? GOLD : "var(--fc-card)",
            color: filter === "all" ? "#141414" : "rgba(255,255,255,0.55)",
            border: "1px solid var(--fc-border)",
          }}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              backgroundColor: filter === g ? GOLD : "var(--fc-card)",
              color: filter === g ? "#141414" : "rgba(255,255,255,0.55)",
              border: "1px solid var(--fc-border)",
            }}
          >
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={filter}
          className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {visible.map((p, i) => (
            <PlayerCard key={p.gamertag} p={p} index={i} />
          ))}
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-white/25 mt-8 text-center uppercase tracking-wider">
        Tap a card to flip · *saves counted from tracked matches
      </p>
    </div>
  );
}
