"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EnrichedPlayer } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

export function PlayerDropdown({ player }: { player: EnrichedPlayer }) {
  const [open, setOpen] = useState(false);
  const isGoalie = /\b(goalie|gk|g)\b/i.test(player.position);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-navy border border-border rounded-xl overflow-hidden"
    >
      {/* Clickable header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-navy-light/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-red font-black text-sm">
            {getNickname(player.name)}
          </span>
          <span className="text-muted text-xs uppercase tracking-wider">
            {player.position}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stat preview when closed */}
          {!open && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted font-mono">
              {isGoalie ? (
                <>
                  {player.savePercentage !== undefined && (
                    <span>{player.savePercentage.toFixed(1)}% SV</span>
                  )}
                  {player.saves !== undefined && <span>{player.saves} SVS</span>}
                  {player.shutouts !== undefined && <span>{player.shutouts} SO</span>}
                </>
              ) : (
                <>
                  {player.points !== undefined && <span>{player.points} PTS</span>}
                  {player.goals !== undefined && <span>{player.goals} G</span>}
                  {player.assists !== undefined && <span>{player.assists} A</span>}
                </>
              )}
            </div>
          )}
          {/* Chevron */}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted text-lg"
          >
            ▾
          </motion.span>
        </div>
      </button>

      {/* Expanded stats */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border/30">
              {isGoalie ? (
                <GoalieStatGrid player={player} />
              ) : (
                <SkaterStatGrid player={player} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCell({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg font-black font-mono text-foreground">
        {value !== undefined && value !== null ? value : "—"}
      </p>
    </div>
  );
}

function SkaterStatGrid({ player }: { player: EnrichedPlayer }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-2">
      <div className="flex gap-6 min-w-max">
        <StatCell label="GP" value={player.gamesPlayed} />
        <StatCell label="G" value={player.goals} />
        <StatCell label="A" value={player.assists} />
        <StatCell label="PTS" value={player.points} />
        <StatCell
          label="+/-"
          value={
            player.plusMinus !== undefined
              ? player.plusMinus > 0
                ? `+${player.plusMinus}`
                : player.plusMinus.toString()
              : undefined
          }
        />
        <StatCell label="HIT" value={player.hits} />
        <StatCell label="PIM" value={player.pim} />
        {player.shots !== undefined && <StatCell label="SOG" value={player.shots} />}
        {player.shotPercentage !== undefined && (
          <StatCell label="SH%" value={`${player.shotPercentage}%`} />
        )}
        {player.gwg !== undefined && <StatCell label="GWG" value={player.gwg} />}
        {player.takeaways !== undefined && <StatCell label="TK" value={player.takeaways} />}
        {player.giveaways !== undefined && <StatCell label="GV" value={player.giveaways} />}
        {player.blockedShots !== undefined && <StatCell label="BS" value={player.blockedShots} />}
        {player.interceptions !== undefined && <StatCell label="INT" value={player.interceptions} />}
        {player.passPercentage !== undefined && (
          <StatCell label="PASS%" value={`${player.passPercentage}%`} />
        )}
        {player.faceoffPct !== undefined && player.faceoffPct > 0 && (
          <StatCell label="FO%" value={`${player.faceoffPct}%`} />
        )}
      </div>
    </div>
  );
}

function GoalieStatGrid({ player }: { player: EnrichedPlayer }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-2">
      <div className="flex gap-6 min-w-max">
        <StatCell label="GGP" value={player.goalieGamesPlayed} />
        <StatCell label="SVS" value={player.saves} />
        <StatCell
          label="SV%"
          value={
            player.savePercentage !== undefined
              ? `${player.savePercentage.toFixed(1)}%`
              : undefined
          }
        />
        <StatCell label="GAA" value={player.gaa !== undefined ? player.gaa.toFixed(2) : undefined} />
        <StatCell label="SO" value={player.shutouts} />
        <StatCell label="SOP" value={player.shutoutPeriods} />
        {/* Also show skater stats if they have any */}
        {player.points !== undefined && player.points > 0 && (
          <>
            <StatCell label="G" value={player.goals} />
            <StatCell label="A" value={player.assists} />
            <StatCell label="PTS" value={player.points} />
          </>
        )}
      </div>
    </div>
  );
}
