import type { Metadata } from "next";
import { Suspense } from "react";
import {
  fetchFcStatsData,
  computeFcPlayerMatchAggregates,
  positionLabel,
} from "@/lib/fcstats";
import {
  FcPageShell,
  FcPageHeader,
  FcDataUnavailable,
  FcStatCard,
} from "@/components/fc/FcUI";
import StatsClient, { type StatsPlayer } from "./StatsClient";

export const metadata: Metadata = {
  title: "Stats Centre | Bardownski FC",
  description:
    "Bardownski FC stats centre — leaderboards, player deep dives and match logs. EA FC 26 Pro Clubs.",
};

export default async function FcStatsPage() {
  const data = await fetchFcStatsData();

  let players: StatsPlayer[] = [];
  if (data) {
    const aggs = computeFcPlayerMatchAggregates(data.matches);
    players = data.members.map((m) => {
      const agg = aggs.get(m.gamertag);
      return {
        gamertag: m.gamertag,
        name: m.name,
        posGroup: positionLabel(m.position),
        proName: m.proName,
        overall: m.proOverall,
        gamesPlayed: m.gamesPlayed,
        winRate: m.winRate,
        goals: m.goals,
        assists: m.assists,
        points: m.points,
        ratingAve: m.ratingAve,
        shotSuccessRate: m.shotSuccessRate,
        passesMade: m.passesMade,
        passSuccessRate: m.passSuccessRate,
        tacklesMade: m.tacklesMade,
        tackleSuccessRate: m.tackleSuccessRate,
        motm: m.manOfTheMatch,
        redCards: m.redCards,
        cleanSheets: m.cleanSheets,
        trackedSaves: agg?.saves ?? 0,
        trackedShots: agg?.shots ?? 0,
        log: agg?.log ?? [],
      };
    });
    players.sort((a, b) => b.points - a.points || b.ratingAve - a.ratingAve);
  }

  return (
    <FcPageShell>
      <FcPageHeader label="EA FC 26 · Pro Clubs" title="STATS" titleAccent="CENTRE" />
      {!data ? (
        <FcDataUnavailable />
      ) : (
        <>
          {/* Club season block */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
            <FcStatCard label="Record" value={data.clubStats.record} sub="W-L-D" />
            <FcStatCard
              label="Goals For"
              value={data.clubStats.goals}
              sub={`${data.clubStats.goalsPerGame}/game`}
            />
            <FcStatCard
              label="Goals Against"
              value={data.clubStats.goalsAgainst}
              sub={`${data.clubStats.goalsAgainstPerGame}/game`}
            />
            <FcStatCard label="Games" value={data.clubStats.totalGames} />
            <FcStatCard
              label="Win %"
              value={`${data.clubStats.totalGames ? Math.round((data.clubStats.wins / data.clubStats.totalGames) * 100) : 0}%`}
            />
            <FcStatCard label="Skill Rating" value={data.clubStats.skillRating} />
          </div>

          <Suspense fallback={null}>
            <StatsClient players={players} />
          </Suspense>
        </>
      )}
    </FcPageShell>
  );
}
