"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SeasonData } from "@/lib/discord";
import { StatsDisplay } from "./components/StatsDisplay";

export default function StatsClient({
  seasons,
}: {
  seasons: SeasonData[];
}) {
  const [selectedSeason, setSelectedSeason] = useState(
    seasons[0]?.season ?? ""
  );

  const currentData = seasons.find((s) => s.season === selectedSeason);

  return (
    <>
      {/* Scoreboard-style season tabs */}
      {seasons.length > 1 && (
        <div className="flex gap-1 mb-10 flex-wrap bg-navy-dark border border-border rounded-lg p-1 w-fit">
          {seasons.map(({ season }) => (
            <button
              key={season}
              onClick={() => setSelectedSeason(season)}
              className={`relative px-5 py-2.5 rounded-md text-sm font-black uppercase tracking-wider transition-all ${
                selectedSeason === season
                  ? "bg-red text-white shadow-lg shadow-red/20"
                  : "text-muted hover:text-white hover:bg-navy"
              }`}
            >
              {season}
            </button>
          ))}
        </div>
      )}

      {/* Stats for selected season */}
      <AnimatePresence mode="wait">
        {currentData ? (
          <motion.div
            key={selectedSeason}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-muted text-sm mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Last updated: {currentData.stats.date}
            </p>
            <StatsDisplay stats={currentData.stats} />
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-navy border border-border rounded-xl">
            <p className="text-muted">No stats for this season.</p>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
