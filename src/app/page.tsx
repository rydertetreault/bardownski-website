import HeroSection from "@/components/sections/HeroSection";
import FloatingScoreboard from "@/components/sections/FloatingScoreboard";
import StatsTicker from "@/components/sections/StatsTicker";
import WhoWeAreSection from "@/components/sections/WhoWeAreSection";
import StatsPreviewSection from "@/components/sections/StatsPreviewSection";
import PlayerOfWeekBadge from "@/components/sections/PlayerOfWeekBadge";
import HighlightsSection from "@/components/sections/HighlightsSection";
import NewsSection from "@/components/sections/NewsSection";
import { fetchChannelMessages, computePlayerOfWeek } from "@/lib/discord";
import { fetchChelstatsData, computeMvpOddsFromMembers } from "@/lib/chelstats";
import { getAllArticles, getPlayerOfWeek, getPotwStandings } from "@/lib/articles";
import type { Match } from "@/types";

export default async function Home() {
  const [messages, chelstats, allArticles] = await Promise.all([
    fetchChannelMessages(),
    fetchChelstatsData(),
    getAllArticles(),
  ]);

  // Player of the Week: prefer KV (set by weekly cron), fall back to Discord computation
  const [kvPlayer, potwStandings] = await Promise.all([getPlayerOfWeek(), getPotwStandings()]);
  const weeklyPlayer = kvPlayer ?? computePlayerOfWeek(messages);

  const mvpOdds = chelstats ? computeMvpOddsFromMembers(chelstats.members) : [];

  const matches: Match[] = chelstats
    ? chelstats.matches.map((m) => ({
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
      }))
    : [];

  return (
    <>
      {weeklyPlayer && <PlayerOfWeekBadge player={weeklyPlayer} standings={potwStandings} />}
      <div className="relative z-10">
        <HeroSection />
        <FloatingScoreboard matches={matches} />
      </div>
      <StatsTicker messages={messages} members={chelstats?.members} />
      <NewsSection newsItems={allArticles.slice(0, 3)} />
      <WhoWeAreSection />
      <StatsPreviewSection messages={messages} mvpOdds={mvpOdds} />
      <HighlightsSection />
    </>
  );
}
