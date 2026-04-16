"use client";

import { motion } from "framer-motion";
import type { ParsedStats } from "@/lib/discord";
import { getEnrichedPlayers } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";
import { LeaderCard } from "./LeaderCard";
import { SavesLeaderCard } from "./SavesLeaderCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { PlayerDropdown } from "./PlayerDropdown";

export function StatsDisplay({ stats }: { stats: ParsedStats }) {
  const enrichedPlayers = getEnrichedPlayers(stats);

  return (
    <>
      {/* Stats Leaders */}
      <div className="mb-12">
        <div className="mb-6">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-1 h-6 bg-red rounded-sm" />
            <h2 className="text-2xl font-black uppercase tracking-wider">
              Stats Leaders
            </h2>
          </div>
          <p className="text-xs text-muted uppercase tracking-widest ml-4">
            Top performers this season
          </p>
        </div>

        {/* Top row — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <LeaderCard
            title="Points"
            entries={stats.points}
            secondaryLabel="GP"
          />
          <LeaderCard title="Goals" entries={stats.goals} secondaryLabel="SH%" secondaryIsPercent />
          <LeaderCard title="Assists" entries={stats.assists} secondaryLabel="PASS%" secondaryIsPercent />
          <LeaderCard
            title="Plus/Minus"
            entries={stats.plusMinus}
            formatValue={(v) => (v > 0 ? `+${v}` : v.toString())}
          />
        </div>
        {/* Bottom row — centered, equal height */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch gap-4">
          <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
            <LeaderCard title="Hits" entries={stats.hits} secondaryLabel="PIM" />
          </div>
          <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
            <SavesLeaderCard entries={stats.saves} />
          </div>
          {stats.shutouts.length > 0 && (
            <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
              <LeaderCard
                title="Shutouts"
                entries={stats.shutouts}
                secondaryLabel={
                  stats.shutouts.some((e) => e.secondary !== undefined)
                    ? "SOP"
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Player Stats */}
      <div>
        <div className="mb-6">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-1 h-6 bg-red rounded-sm" />
            <h2 className="text-2xl font-black uppercase tracking-wider">
              Player Stats
            </h2>
          </div>
          <p className="text-xs text-muted uppercase tracking-widest ml-4">
            Full season breakdown
          </p>
        </div>

        <HeadToHeadCard stats={stats} />

        <div className="space-y-3 mt-6">
          {enrichedPlayers.map((player) => (
            <PlayerDropdown key={player.name} player={player} />
          ))}
        </div>
      </div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <div className="flex flex-col gap-px mb-4">
              <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
              <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
            </div>
            <div className="flex items-center gap-3">
              <span className="block w-1 h-6 bg-red rounded-sm" />
              <h2 className="text-2xl font-black uppercase tracking-wider">
                Milestones
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.milestones.map((milestone, i) => (
              <motion.div
                key={milestone.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-navy border border-border rounded-xl p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red/50 to-transparent" />
                <h3 className="font-bold text-red mb-2">
                  {getNickname(milestone.name)}
                </h3>
                <ul className="space-y-1">
                  {milestone.achievements.map((a) => (
                    <li key={a} className="text-sm text-muted">
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
