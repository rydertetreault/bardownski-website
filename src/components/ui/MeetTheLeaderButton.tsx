"use client";

import { useState } from "react";

interface LeaderStats {
  position: string;
  gamesPlayed?: number;
  points?: number;
  goals?: number;
  assists?: number;
  plusMinus?: number;
  hits?: number;
  saves?: number;
  savePercentage?: number;
  goalieGamesPlayed?: number;
  shutouts?: number;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-navy-light/50 rounded-lg px-3 py-2 text-center border border-border/50">
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

export default function MeetTheLeaderButton({
  role,
  nickname,
  stats,
}: {
  role: "C" | "A";
  nickname: string;
  stats: LeaderStats;
}) {
  const [open, setOpen] = useState(false);

  const isGoalie =
    stats.position.toUpperCase().includes("GK") ||
    stats.position.toUpperCase() === "G";

  const label =
    role === "C" ? "Meet the Captain" : "Meet the Asst. Captain";

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
          open
            ? "bg-red/20 text-red border border-red/30"
            : "bg-navy-light text-cream border border-border hover:border-red/40 hover:text-red"
        }`}
      >
        {open ? "Close" : label}
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {nickname && (
            <p className="text-center text-xs text-muted italic mb-3">
              aka &ldquo;{nickname}&rdquo;
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {isGoalie ? (
              <>
                {stats.saves != null && (
                  <StatBox label="SVS" value={stats.saves} />
                )}
                {stats.savePercentage != null && (
                  <StatBox
                    label="SV%"
                    value={`${stats.savePercentage.toFixed(1)}%`}
                  />
                )}
                {stats.shutouts != null && (
                  <StatBox label="SO" value={stats.shutouts} />
                )}
                {stats.goalieGamesPlayed != null && (
                  <StatBox label="GP" value={stats.goalieGamesPlayed} />
                )}
              </>
            ) : (
              <>
                {stats.points != null && (
                  <StatBox label="PTS" value={stats.points} />
                )}
                {stats.goals != null && (
                  <StatBox label="G" value={stats.goals} />
                )}
                {stats.assists != null && (
                  <StatBox label="A" value={stats.assists} />
                )}
                {stats.plusMinus != null && (
                  <StatBox
                    label="+/-"
                    value={
                      stats.plusMinus > 0
                        ? `+${stats.plusMinus}`
                        : String(stats.plusMinus)
                    }
                  />
                )}
                {stats.hits != null && (
                  <StatBox label="HITS" value={stats.hits} />
                )}
                {stats.gamesPlayed != null && (
                  <StatBox label="GP" value={stats.gamesPlayed} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
