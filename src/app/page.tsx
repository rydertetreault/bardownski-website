import HeroSection from "@/components/sections/HeroSection";
import FloatingScoreboard from "@/components/sections/FloatingScoreboard";
import StatsTicker from "@/components/sections/StatsTicker";
import WhoWeAreSection from "@/components/sections/WhoWeAreSection";
import StatsPreviewSection from "@/components/sections/StatsPreviewSection";
import PlayerOfCycleBadge from "@/components/sections/PlayerOfCycleBadge";
import HighlightsSection from "@/components/sections/HighlightsSection";
import NewsSection from "@/components/sections/NewsSection";
import { fetchChannelMessages, computePlayerOfCycle } from "@/lib/discord";
import { fetchChelstatsData, computeMvpOddsFromMembers } from "@/lib/chelstats";
import type { Match } from "@/types";

export default async function Home() {
  const [messages, chelstats] = await Promise.all([
    fetchChannelMessages(),
    fetchChelstatsData(),
  ]);
  const cyclePlayer = computePlayerOfCycle(messages);
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
      {cyclePlayer && <PlayerOfCycleBadge player={cyclePlayer} />}
      <div className="relative z-10">
        <HeroSection />
        <FloatingScoreboard matches={matches} />
      </div>
      <StatsTicker messages={messages} members={chelstats?.members} />
      <NewsSection />
      <WhoWeAreSection />
      <StatsPreviewSection messages={messages} mvpOdds={mvpOdds} />
      <HighlightsSection />
    </>
  );
}
