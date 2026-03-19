"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { RosterPlayer } from "./page";

/* ── Single nameplate ── */
function Nameplate({
  player,
  index,
}: {
  player: RosterPlayer;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCaptain = player.leadership === "C";
  const isAssistant = player.leadership === "A";
  const hasScouting = !!player.scouting;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
    >
      <motion.button
        onClick={() => hasScouting && setExpanded(!expanded)}
        whileHover={{ x: 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`w-full text-left group relative overflow-hidden rounded-lg border transition-colors duration-200 ${
          hasScouting ? "cursor-pointer" : "cursor-default"
        } ${
          isCaptain
            ? "border-red/40 hover:border-red/70 bg-navy bg-gradient-to-r from-red/[0.07] via-transparent to-transparent"
            : isAssistant
              ? "border-white/20 hover:border-white/40 bg-navy bg-gradient-to-r from-white/[0.06] via-transparent to-transparent"
              : "border-border hover:border-red/30 bg-navy"
        }`}
      >
        {/* Top accent line */}
        {isCaptain && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-red via-red/50 to-transparent" />
        )}
        {isAssistant && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-white/40 via-white/20 to-transparent" />
        )}

        <div className="flex items-center">
          {/* Jersey number */}
          <div
            className={`relative w-20 md:w-24 h-20 md:h-24 flex items-center justify-center shrink-0 ${
              isCaptain
                ? "bg-red/10"
                : isAssistant
                  ? "bg-white/[0.06]"
                  : "bg-white/[0.03]"
            }`}
          >
            <span
              className={`text-5xl md:text-6xl font-black font-mono select-none leading-none ${
                isCaptain
                  ? "text-red"
                  : isAssistant
                    ? "text-white"
                    : "text-white/70"
              }`}
              style={{
                WebkitTextStroke: isCaptain
                  ? "1px rgba(200, 16, 46, 0.3)"
                  : isAssistant
                    ? "1px rgba(255, 255, 255, 0.2)"
                    : "1px rgba(255, 255, 255, 0.1)",
              }}
            >
              {player.number}
            </span>
          </div>

          {/* Vertical divider */}
          <div
            className={`w-px h-14 shrink-0 ${
              isCaptain
                ? "bg-gradient-to-b from-transparent via-red/60 to-transparent"
                : isAssistant
                  ? "bg-gradient-to-b from-transparent via-white/40 to-transparent"
                  : "bg-gradient-to-b from-transparent via-red/60 to-transparent"
            }`}
          />

          {/* Player info */}
          <div className="flex-1 px-5 py-4 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-lg font-black uppercase tracking-wide truncate">
                {player.name}
              </p>
              {player.leadership && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider shrink-0 ${
                    isCaptain
                      ? "bg-red text-white"
                      : "bg-white/20 text-white border border-white/30"
                  }`}
                >
                  {isCaptain ? "C" : "A"}
                </span>
              )}
            </div>
            {player.nickname !== player.name && (
              <p className="text-xs text-muted italic truncate mb-1">
                &ldquo;{player.nickname}&rdquo;
              </p>
            )}
            <div className="flex items-center gap-2">
              <p className="text-xs text-red font-bold uppercase tracking-widest">
                {player.position}
              </p>
              {player.scouting && (
                <>
                  <span className="text-border">|</span>
                  <p className="text-xs text-white/50 uppercase tracking-wider">
                    {player.scouting.role}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right side — number echo + expand hint */}
          <div className="flex items-center gap-4 pr-5 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted uppercase tracking-wider">
                #{player.number}
              </p>
            </div>
            <div
              className={`hidden sm:flex w-8 h-8 rounded-full border items-center justify-center ${
                isAssistant ? "border-white/20" : "border-border"
              }`}
            >
              <span className="text-[10px] font-bold text-muted uppercase">
                {player.positionGroup === "goalie"
                  ? "G"
                  : player.positionGroup === "defense"
                    ? "D"
                    : "F"}
              </span>
            </div>
            {hasScouting && (
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            )}
          </div>
        </div>
      </motion.button>

      {/* Scouting report drawer */}
      {hasScouting && (
        <motion.div
          initial={false}
          animate={{
            height: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div
            className={`px-5 py-4 border border-t-0 rounded-b-lg ${
              isCaptain
                ? "bg-navy-dark border-red/20"
                : isAssistant
                  ? "bg-navy-dark border-white/10"
                  : "bg-navy-dark border-border"
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Role tag */}
              <div
                className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                  isCaptain
                    ? "bg-red/15 text-red border border-red/20"
                    : isAssistant
                      ? "bg-white/10 text-white border border-white/15"
                      : "bg-white/5 text-red border border-border"
                }`}
              >
                {player.scouting!.role}
              </div>
              {/* Description */}
              <p className="text-sm text-muted leading-relaxed">
                {player.scouting!.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Leadership spotlight card ── */
function LeadershipCard({
  player,
  index,
}: {
  player: RosterPlayer;
  index: number;
}) {
  const isCaptain = player.leadership === "C";
  const label = isCaptain ? "Captain" : "Assistant Captain";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className={`relative rounded-xl border overflow-hidden ${
        isCaptain
          ? "border-red/40 bg-navy-dark bg-gradient-to-b from-red/[0.08] via-transparent to-transparent"
          : "border-white/20 bg-navy-dark bg-gradient-to-b from-white/[0.05] via-transparent to-transparent"
      }`}
    >
      {/* Top accent */}
      {isCaptain ? (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red to-transparent" />
      ) : (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      )}

      <div className="p-6 text-center">
        {/* Number */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <span
            className={`text-4xl font-black font-mono leading-none ${
              isCaptain ? "text-red" : "text-white"
            }`}
          >
            {player.number}
          </span>
        </div>

        {/* Name */}
        <p className="text-xl font-black uppercase tracking-wide">
          {player.name}
        </p>
        {player.nickname !== player.name && (
          <p className="text-xs text-muted italic mt-0.5">
            &ldquo;{player.nickname}&rdquo;
          </p>
        )}
        <p className="text-xs text-red font-bold uppercase tracking-widest mt-1">
          {player.position}
        </p>

        {/* Role label */}
        <p
          className={`mt-3 text-xs font-bold uppercase tracking-widest ${
            isCaptain ? "text-red" : "text-white/60"
          }`}
        >
          {label}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Position group divider (homepage-style accent bar + dual lines) ── */
function PositionDivider({ label, isFirst = false }: { label: string; isFirst?: boolean }) {
  return (
    <div className={isFirst ? "mb-5" : "mb-5 mt-4"}>
      {/* Dual hairlines */}
      <div className="flex flex-col gap-px mb-4">
        <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
        <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
      </div>
      {/* Accent bar + label */}
      <div className="flex items-center gap-3">
        <span className="block w-1 h-5 bg-red rounded-sm" />
        <span className="text-sm font-black uppercase tracking-[0.25em] text-white whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function RosterClient({
  forwards,
  defense,
  goalies,
}: {
  forwards: RosterPlayer[];
  defense: RosterPlayer[];
  goalies: RosterPlayer[];
}) {
  // Collect leadership players across all groups
  const allPlayers = [...forwards, ...defense, ...goalies];
  const leaders = allPlayers
    .filter((p) => p.leadership)
    .sort((a, b) => (a.leadership === "C" ? -1 : b.leadership === "C" ? 1 : 0));

  // Sort each group: captain first, then assistants, then by number
  const sortPlayers = (players: RosterPlayer[]) =>
    [...players].sort((a, b) => {
      const roleOrder = (p: RosterPlayer) =>
        p.leadership === "C" ? 0 : p.leadership === "A" ? 1 : 2;
      const ro = roleOrder(a) - roleOrder(b);
      if (ro !== 0) return ro;
      return a.number - b.number;
    });

  return (
    <div className="space-y-10">
      {/* Leadership spotlight */}
      {leaders.length > 0 && (
        <section>
          <PositionDivider label="Leadership" isFirst />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaders.map((player, i) => (
              <LeadershipCard key={player.name} player={player} index={i} />
            ))}
          </div>
        </section>
      )}

      {forwards.length > 0 && (
        <section>
          <PositionDivider label="Forwards" />
          <div className="space-y-3">
            {sortPlayers(forwards).map((player, i) => (
              <Nameplate key={player.name} player={player} index={i} />
            ))}
          </div>
        </section>
      )}

      {defense.length > 0 && (
        <section>
          <PositionDivider label="Defense" />
          <div className="space-y-3">
            {sortPlayers(defense).map((player, i) => (
              <Nameplate key={player.name} player={player} index={i} />
            ))}
          </div>
        </section>
      )}

      {goalies.length > 0 && (
        <section>
          <PositionDivider label="Goalies" />
          <div className="space-y-3">
            {sortPlayers(goalies).map((player, i) => (
              <Nameplate key={player.name} player={player} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
