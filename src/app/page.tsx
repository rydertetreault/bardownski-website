import HeroSection from "@/components/sections/HeroSection";
import ChampionshipBanner from "@/components/sections/ChampionshipBanner";
import FloatingScoreboard from "@/components/sections/FloatingScoreboard";
import StatsTicker from "@/components/sections/StatsTicker";
import WhoWeAreSection from "@/components/sections/WhoWeAreSection";
import StatsPreviewSection from "@/components/sections/StatsPreviewSection";
import PlayerOfWeekBadge from "@/components/sections/PlayerOfWeekBadge";
import HighlightsSection from "@/components/sections/HighlightsSection";
import NewsSection from "@/components/sections/NewsSection";
import { fetchChannelMessages, computePlayerOfWeek } from "@/lib/discord";
import { fetchChelstatsData, computeMvpOddsFromMembers } from "@/lib/chelstats";
import { getMatchHistory } from "@/lib/match-history";
import { getAllArticles, getPlayerOfWeek, getPotwStandings } from "@/lib/articles";
import type { Match, WeeklyRecord } from "@/types";

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

  // Use accumulated Redis history (write-through) so all games show, not just API window
  const allMatches = chelstats ? await getMatchHistory(chelstats) : [];

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

  // Compute this week's record (Mon-Sun, local time)
  const weeklyRecord: WeeklyRecord | null = (() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = Math.floor(monday.getTime() / 1000);
    const weekEnd = Math.floor(sunday.getTime() / 1000);

    const weekMatches = matches.filter(
      (m) => m.timestamp >= weekStart && m.timestamp <= weekEnd
    );

    const w = weekMatches.filter((m) => m.scoreUs !== null && m.scoreThem !== null && m.scoreUs > m.scoreThem).length;
    const l = weekMatches.filter((m) => m.scoreUs !== null && m.scoreThem !== null && m.scoreUs < m.scoreThem).length;
    const gf = weekMatches.reduce((s, m) => s + (m.scoreUs ?? 0), 0);
    const ga = weekMatches.reduce((s, m) => s + (m.scoreThem ?? 0), 0);

    return { w, l, gp: weekMatches.length, gf, ga };
  })();

  return (
    <>
      {weeklyPlayer && <PlayerOfWeekBadge player={weeklyPlayer} standings={potwStandings} />}
      <ChampionshipBanner />
      <div className="relative z-10">
        <HeroSection />
        <FloatingScoreboard matches={matches} weeklyRecord={weeklyRecord} />
      </div>
      <StatsTicker messages={messages} members={chelstats?.members} />
      <NewsSection newsItems={allArticles.slice(0, 3)} />
      <WhoWeAreSection />
      <StatsPreviewSection members={chelstats?.members ?? []} mvpOdds={mvpOdds} />
      <HighlightsSection />
    </>
  );
}
