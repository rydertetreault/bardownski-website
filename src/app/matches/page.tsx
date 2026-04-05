import Image from "next/image";
import MatchesBackground from "./MatchesBackground";
import MatchesClient from "./MatchesClient";
import { fetchChelstatsData } from "@/lib/chelstats";
import { getMatchHistory } from "@/lib/match-history";
import type { Match, ClubRecord } from "@/types";

export default async function MatchesPage() {
  const chelstats = await fetchChelstatsData();

  // Load accumulated match history from Redis (populated by sync cron)
  const allMatches = chelstats
    ? await getMatchHistory(chelstats)
    : [];

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
    players: m.players,
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

  return (
    <div className="min-h-screen relative">
      <MatchesBackground />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Page title */}
        <div className="mb-10 flex flex-col items-center">
          <div className="relative w-12 h-12 md:w-16 md:h-16 mb-4 opacity-20">
            <Image
              src="/images/logo/BD - logo.png"
              alt=""
              fill
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-px w-12 bg-red/30" />
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.2em] text-center">
              Scores
            </h1>
            <div className="h-px w-12 bg-red/30" />
          </div>
          <p className="text-muted/50 text-xs uppercase tracking-widest mt-2">
            Season Results & Trends
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-24 bg-navy border border-border rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 relative overflow-hidden rounded-xl opacity-20">
              <Image
                src="/images/logo/BD - logo.png"
                alt="Bardownski"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-muted text-lg">Match schedule coming soon.</p>
            <p className="text-muted/50 text-sm mt-2">
              Results will be synced from chelstats.
            </p>
          </div>
        ) : (
          <MatchesClient matches={matches} clubRecord={clubRecord} />
        )}
      </div>
    </div>
  );
}
