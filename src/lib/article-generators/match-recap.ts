import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMatch } from "@/lib/chelstats";
import type { Article } from "@/lib/news";

function describeResult(m: ClubMatch): string {
  const won = m.scoreUs > m.scoreThem;
  const verb = won ? "W" : "L";
  return `${verb} ${m.scoreUs}-${m.scoreThem} vs ${m.opponent}`;
}

function formatMatchDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export async function generateMatchRecap(): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const now = Date.now() / 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60;

  // Get matches from the past week
  let recentMatches = data.matches.filter((m) => m.timestamp >= oneWeekAgo);

  // If no matches this week, use the last 5 matches
  if (recentMatches.length === 0) {
    recentMatches = data.matches.slice(0, 5);
  }

  if (recentMatches.length === 0) return null;

  // Sort newest first
  recentMatches.sort((a, b) => b.timestamp - a.timestamp);

  const wins = recentMatches.filter((m) => m.scoreUs > m.scoreThem).length;
  const losses = recentMatches.length - wins;
  const totalGoalsFor = recentMatches.reduce((s, m) => s + m.scoreUs, 0);
  const totalGoalsAgainst = recentMatches.reduce((s, m) => s + m.scoreThem, 0);

  const paras: string[] = [];

  // Overview
  paras.push(
    `Bardownski went ${wins}-${losses} over the last ${recentMatches.length} games, ` +
    `outscoring opponents ${totalGoalsFor}-${totalGoalsAgainst}. ` +
    `Here is a quick look at the results.`
  );

  // Individual game results
  const resultLines = recentMatches.map((m) => {
    const dateStr = formatMatchDate(m.timestamp);
    const result = describeResult(m);
    let stars = "";
    if (m.threeStars) {
      const ourStars = m.threeStars.filter((s) => s.isOurPlayer);
      if (ourStars.length > 0) {
        stars = ` (${ourStars.map((s) => s.name).join(", ")} earned star honors)`;
      }
    }
    const type = m.matchType !== "regular" ? ` [${m.matchType === "finals" ? "Club Finals" : "Private"}]` : "";
    return `${dateStr}: ${result}${type}${stars}`;
  });
  paras.push(resultLines.join("\n"));

  // Standout performance
  let bestGame: { match: ClubMatch; player: string; goals: number; assists: number } | null = null;
  for (const m of recentMatches) {
    for (const p of m.players || []) {
      if (!p.isOurPlayer) continue;
      const total = p.goals + p.assists;
      if (!bestGame || total > bestGame.goals + bestGame.assists) {
        bestGame = { match: m, player: p.name, goals: p.goals, assists: p.assists };
      }
    }
  }

  if (bestGame && bestGame.goals + bestGame.assists > 0) {
    const won = bestGame.match.scoreUs > bestGame.match.scoreThem;
    paras.push(
      `Standout performance of the week: ${bestGame.player} posted ${bestGame.goals}G ${bestGame.assists}A ` +
      `in a ${bestGame.match.scoreUs}-${bestGame.match.scoreThem} ${won ? "win over" : "loss to"} ${bestGame.match.opponent}.`
    );
  }

  // Team stat notes
  const avgGoalsFor = (totalGoalsFor / recentMatches.length).toFixed(1);
  paras.push(
    `The club averaged ${avgGoalsFor} goals per game over this stretch${wins > losses ? ", keeping the momentum going" : ""}.`
  );

  return {
    id: `auto-match-recap-${today}`,
    title: `Week in Review: ${wins}-${losses} in ${recentMatches.length} Games`,
    summary: paras.join("\n\n"),
    date: today,
    image: "/images/gallery/screenshots/team2.webp",
    category: "Results",
  };
}
