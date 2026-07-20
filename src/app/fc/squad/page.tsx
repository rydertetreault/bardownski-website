import type { Metadata } from "next";
import {
  fetchFcStatsData,
  positionLabel,
  formatHeight,
  computeFcPlayerMatchAggregates,
} from "@/lib/fcstats";
import {
  FcPageShell,
  FcPageHeader,
  FcDataUnavailable,
} from "@/components/fc/FcUI";
import SquadClient, { type SquadPlayer } from "./SquadClient";

export const metadata: Metadata = {
  title: "Squad | Bardownski FC",
  description:
    "Meet the Bardownski FC squad — player profiles, positions and season stats. EA FC 26 Pro Clubs.",
};

// Kit numbers (by real name) — same numbers as the hockey club
const KIT_NUMBERS: Record<string, number> = {
  RYDER: 14,
  DYLAN: 4,
  MATT: 8,
  ROB: 1,
  COLIN: 2,
  KADEN: 9,
  JIMMY: 69,
  LOGAN: 6,
};

export default async function FcSquadPage() {
  const data = await fetchFcStatsData();

  let players: SquadPlayer[] = [];
  if (data) {
    const aggs = computeFcPlayerMatchAggregates(data.matches);
    players = data.members.map((m) => {
      const agg = aggs.get(m.gamertag);
      return {
        gamertag: m.gamertag,
        name: m.name,
        proName: m.proName,
        posGroup: positionLabel(m.position),
        position: m.position || "—",
        height: formatHeight(m.proHeight),
        overall: m.proOverall,
        gamesPlayed: m.gamesPlayed,
        goals: m.goals,
        assists: m.assists,
        points: m.points,
        ratingAve: m.ratingAve,
        winRate: m.winRate,
        motm: m.manOfTheMatch,
        passSuccessRate: m.passSuccessRate,
        cleanSheets: m.cleanSheets,
        saves: agg?.saves ?? 0,
        number: KIT_NUMBERS[m.name] ?? null,
      };
    });
    // Order: FW, MID, DEF, GK, then by points
    const order: Record<string, number> = { FW: 0, MID: 1, DEF: 2, GK: 3, "—": 4 };
    players.sort(
      (a, b) =>
        (order[a.posGroup] ?? 4) - (order[b.posGroup] ?? 4) || b.points - a.points
    );
  }

  return (
    <FcPageShell>
      <FcPageHeader
        label="EA FC 26 · Pro Clubs"
        title="THE"
        titleAccent="SQUAD"
        right={
          data ? (
            <span className="text-xs text-white/40 uppercase tracking-[0.2em] self-start sm:self-auto">
              {players.length} Players
            </span>
          ) : undefined
        }
      />
      {!data ? <FcDataUnavailable /> : <SquadClient players={players} />}
    </FcPageShell>
  );
}
