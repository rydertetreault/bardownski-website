import "./matches-archive.css";
import MatchesClient from "./MatchesClient";
import { fetchChelstatsData } from "@/lib/chelstats";
import { getMatchHistory } from "@/lib/match-history";
import type { Match, ClubRecord } from "@/types";

export const revalidate = 300; // cache page for 5 min (matches Redis/chelstats TTL)

export default async function MatchesPage() {
  const chelstats = await fetchChelstatsData();

  // Load accumulated match history from Redis (populated by sync cron)
  const allMatches = chelstats
    ? await getMatchHistory(chelstats)
    : [];

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

  const clubRecord: ClubRecord | null = chelstats
    ? {
        wins: chelstats.clubStats.wins,
        losses: chelstats.clubStats.losses,
        otl: chelstats.clubStats.otl,
      }
    : null;

  return <MatchesClient matches={matches} clubRecord={clubRecord} />;
}
