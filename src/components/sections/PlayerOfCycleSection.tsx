"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CyclePlayer } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

interface Props {
  player: CyclePlayer;
}

interface StatPillProps {
  label: string;
  value: number | string;
  highlight?: boolean;
}

function StatPill({ label, value, highlight }: StatPillProps) {
  return (
    <div
      className={`flex flex-col items-center px-3 py-1.5 rounded-md ${
        highlight
          ? "bg-[#cc1533]/15 border border-[#cc1533]/30"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <span
        className={`text-base font-black leading-none ${
          highlight ? "text-[#cc1533]" : "text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
        {label}
      </span>
    </div>
  );
}

export default function PlayerOfCycleSection({ player }: Props) {
  const nickname = getNickname(player.name);

  const skaterStats = [
    { label: "Goals", value: `+${player.deltaGoals}`, highlight: player.deltaGoals > 0 },
    { label: "Assists", value: `+${player.deltaAssists}`, highlight: player.deltaAssists > 0 },
    { label: "Points", value: `+${player.deltaPoints}`, highlight: true },
    { label: "Hits", value: `+${player.deltaHits}` },
  ];

  const goalieStats = [
    { label: "Saves", value: `+${player.deltaSaves}`, highlight: true },
  ];

  const stats = player.isGoalie ? goalieStats : skaterStats;

  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative rounded-xl overflow-hidden border border-white/[0.07]"
          style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.55) 0%, rgba(13,21,40,0.4) 100%)" }}
        >
          {/* Left red accent bar */}
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-b from-[#cc1533]/70 via-[#cc1533]/40 to-transparent" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-4 pl-8 pr-6 py-4">
            {/* Left — label + name */}
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-0.5">
                  <span className="w-1 h-3 bg-[#cc1533] rounded-sm" />
                  <span className="text-[#cc1533] text-[10px] font-bold uppercase tracking-[0.2em]">
                    Player of the Cycle
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                  {nickname}
                </h2>
                <p className="text-white/40 text-xs uppercase tracking-widest mt-0.5">
                  {player.position}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-white/10 mx-2" />

            {/* Right — stat pills + link */}
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start flex-1">
              {stats.map((s) => (
                <StatPill key={s.label} label={s.label} value={s.value} highlight={s.highlight} />
              ))}
              <Link
                href="/stats"
                className="ml-2 text-xs text-[#cc1533] hover:text-red-400 uppercase tracking-widest font-bold transition-colors whitespace-nowrap"
              >
                Full Stats →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
