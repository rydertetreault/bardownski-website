import "./matches-archive.css";
import MatchesClient from "./MatchesClient";
import type { Metadata } from "next";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getHockeySeason } from "@/lib/hockey-season";
import { getAllMatchesForRecords } from "@/lib/match-history";
import type { Match, ClubRecord } from "@/types";

// The preserved Redis archive is read at request time, never accumulated here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "2026–2027 Match Centre | Bardownski Hockey",
  description: "Follow the next Bardownski season: match results and tracking, with saved 2025–2026 results kept in a separate archive.",
};

export default async function MatchesPage() {
  const chelstats = FROZEN_CHELSTATS;
  const season = await getHockeySeason();

  // Read the preserved 2025–2026 history; never mix it into season.matches.
  const allMatches = await getAllMatchesForRecords(chelstats);

  // Strip per-player stats (only used on /matches/[id] detail page) to keep
  // the RSC payload small. With 100+ matches the players arrays dominate size.
  const matches: Match[] = allMatches.map((m) => ({
    id: m.id,
    timestamp: m.timestamp,
    date: m.date,
    opponent: m.opponent,
    homeAway: m.homeAway,
    scoreUs: m.scoreUs,
    scoreThem: m.scoreThem,
    status: "final" as const,
    matchType: m.matchType,
    shotsUs: m.shotsUs,
    shotsThem: m.shotsThem,
    toaUs: m.toaUs,
    toaThem: m.toaThem,
    passCompUs: m.passCompUs,
    passCompThem: m.passCompThem,
    threeStars: m.threeStars,
    forfeit: m.forfeit,
  }));

  const clubRecord: ClubRecord = {
    wins: chelstats.clubStats.wins,
    losses: chelstats.clubStats.losses,
    otl: chelstats.clubStats.otl,
  };

  return <MatchesClient season={season} archivedMatches={matches} archivedRecord={clubRecord} />;
}
