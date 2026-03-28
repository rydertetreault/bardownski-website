import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMatch } from "@/lib/chelstats";
import { getNickname } from "@/lib/nicknames";
import type { Article } from "@/lib/news";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function tc(name: string): string {
  return titleCase(getNickname(name));
}

function formatMatchDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function buildGameBreakdown(m: ClubMatch): string {
  const won = m.scoreUs > m.scoreThem;
  const result = won ? "win" : "loss";
  const dateStr = formatMatchDate(m.timestamp);
  const typeLabel = m.matchType === "finals" ? " (Club Finals)" : m.matchType === "private" ? " (Private)" : "";

  let breakdown = `${dateStr}${typeLabel}: ${m.scoreUs}-${m.scoreThem} ${result} vs ${m.opponent}. `;

  // Shot differential
  if (m.shotsUs > 0 || m.shotsThem > 0) {
    const shotDiff = m.shotsUs - m.shotsThem;
    breakdown += `Bardownski ${shotDiff >= 0 ? "outshot" : "were outshot by"} the opponent ${m.shotsUs}-${m.shotsThem}. `;
  }

  // Top performer from our side
  const ourPlayers = (m.players || []).filter((p) => p.isOurPlayer);
  const topSkater = ourPlayers
    .filter((p) => !p.isGoalie)
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
  const goalie = ourPlayers.find((p) => p.isGoalie);

  if (topSkater && (topSkater.goals + topSkater.assists) > 0) {
    const pts = topSkater.goals + topSkater.assists;
    breakdown += `${tc(topSkater.name)} led the way with ${topSkater.goals}G ${topSkater.assists}A (${pts} points)`;
    if (topSkater.hits > 0) {
      breakdown += ` and ${topSkater.hits} hits`;
    }
    breakdown += `. `;
  }

  if (goalie && goalie.saves > 0) {
    const svPct = goalie.savePct > 1 ? goalie.savePct.toFixed(1) : (goalie.savePct * 100).toFixed(1);
    breakdown += `${tc(goalie.name)} stopped ${goalie.saves} of ${goalie.shotsAgainst} shots (${svPct}%)`;
    if (goalie.goalsAgainst === 0) {
      breakdown += ` for the shutout`;
    }
    breakdown += `. `;
  }

  // Three stars
  if (m.threeStars) {
    const ourStars = m.threeStars.filter((s) => s.isOurPlayer);
    if (ourStars.length > 0) {
      const starNames = ourStars.map((s) => tc(s.name)).join(" and ");
      breakdown += `${starNames} earned three-star honors.`;
    }
  }

  return breakdown;
}

function getTopPerformers(matches: ClubMatch[]): { name: string; totalGoals: number; totalAssists: number; totalPoints: number; totalHits: number; games: number }[] {
  const playerMap: Record<string, { goals: number; assists: number; hits: number; games: number }> = {};

  for (const m of matches) {
    for (const p of m.players || []) {
      if (!p.isOurPlayer || p.isGoalie) continue;
      if (!playerMap[p.name]) {
        playerMap[p.name] = { goals: 0, assists: 0, hits: 0, games: 0 };
      }
      playerMap[p.name].goals += p.goals;
      playerMap[p.name].assists += p.assists;
      playerMap[p.name].hits += p.hits;
      playerMap[p.name].games += 1;
    }
  }

  return Object.entries(playerMap)
    .map(([name, stats]) => ({
      name,
      totalGoals: stats.goals,
      totalAssists: stats.assists,
      totalPoints: stats.goals + stats.assists,
      totalHits: stats.hits,
      games: stats.games,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export async function generateMatchRecap(): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const now = Date.now() / 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60;

  // Get matches from the past week
  let recentMatches = data.matches.filter((m) => m.timestamp >= oneWeekAgo);

  // If no matches this week, use the last 10 matches
  if (recentMatches.length === 0) {
    recentMatches = data.matches.slice(0, 10);
  }

  if (recentMatches.length === 0) return null;

  // Sort newest first
  recentMatches.sort((a, b) => b.timestamp - a.timestamp);

  const wins = recentMatches.filter((m) => m.scoreUs > m.scoreThem).length;
  const losses = recentMatches.length - wins;
  const totalGoalsFor = recentMatches.reduce((s, m) => s + m.scoreUs, 0);
  const totalGoalsAgainst = recentMatches.reduce((s, m) => s + m.scoreThem, 0);
  const totalShotsFor = recentMatches.reduce((s, m) => s + (m.shotsUs || 0), 0);
  const totalShotsAgainst = recentMatches.reduce((s, m) => s + (m.shotsThem || 0), 0);

  const paras: string[] = [];

  // Opening overview
  const streak = wins > losses ? "winning stretch" : wins === losses ? "back-and-forth stretch" : "tough stretch";
  paras.push(
    `Bardownski went ${wins}-${losses} over the last ${recentMatches.length} games in what was a ${streak} for the club. ` +
    `The team combined for ${totalGoalsFor} goals scored against ${totalGoalsAgainst} allowed, ` +
    `${totalGoalsFor > totalGoalsAgainst ? "outscoring" : "being outscored by"} opponents by a margin of ${Math.abs(totalGoalsFor - totalGoalsAgainst)}. ` +
    `The shot totals tell a similar story at ${totalShotsFor}-${totalShotsAgainst}. Here is the full breakdown of every game this week.`
  );

  // Detailed game-by-game breakdown
  for (const m of recentMatches) {
    paras.push(buildGameBreakdown(m));
  }

  // Top performers across all games
  const topPerformers = getTopPerformers(recentMatches);
  if (topPerformers.length >= 3) {
    const top3 = topPerformers.slice(0, 3);
    paras.push(
      `Across all ${recentMatches.length} games, the top performers were ${tc(top3[0].name)} ` +
      `(${top3[0].totalGoals}G ${top3[0].totalAssists}A, ${top3[0].totalPoints} points), ` +
      `${tc(top3[1].name)} (${top3[1].totalGoals}G ${top3[1].totalAssists}A, ${top3[1].totalPoints} points), ` +
      `and ${tc(top3[2].name)} (${top3[2].totalGoals}G ${top3[2].totalAssists}A, ${top3[2].totalPoints} points). ` +
      `${tc(top3[0].name)} led the way with the most combined production over the stretch.`
    );

    // Hits leader
    const hitsLeader = [...topPerformers].sort((a, b) => b.totalHits - a.totalHits)[0];
    if (hitsLeader.totalHits > 0) {
      paras.push(
        `On the physical side, ${tc(hitsLeader.name)} led the team in hits with ${hitsLeader.totalHits} across ${hitsLeader.games} games. ` +
        `The physicality has been a staple of Bardownski's identity all season.`
      );
    }
  }

  // Goalie recap
  const goalieGames: { name: string; saves: number; shotsAgainst: number; ga: number; shutouts: number; games: number }[] = [];
  for (const m of recentMatches) {
    for (const p of m.players || []) {
      if (!p.isOurPlayer || !p.isGoalie) continue;
      const existing = goalieGames.find((g) => g.name === p.name);
      if (existing) {
        existing.saves += p.saves;
        existing.shotsAgainst += p.shotsAgainst;
        existing.ga += p.goalsAgainst;
        existing.shutouts += p.goalsAgainst === 0 ? 1 : 0;
        existing.games += 1;
      } else {
        goalieGames.push({
          name: p.name,
          saves: p.saves,
          shotsAgainst: p.shotsAgainst,
          ga: p.goalsAgainst,
          shutouts: p.goalsAgainst === 0 ? 1 : 0,
          games: 1,
        });
      }
    }
  }

  if (goalieGames.length > 0) {
    const mainGoalie = goalieGames.sort((a, b) => b.games - a.games)[0];
    const svPct = mainGoalie.shotsAgainst > 0
      ? ((mainGoalie.saves / mainGoalie.shotsAgainst) * 100).toFixed(1)
      : "100.0";
    paras.push(
      `Between the pipes, ${tc(mainGoalie.name)} made ${mainGoalie.saves} saves on ${mainGoalie.shotsAgainst} shots across ${mainGoalie.games} games ` +
      `for a ${svPct}% save rate over the stretch. ` +
      (mainGoalie.shutouts > 0
        ? `${tc(mainGoalie.name)} posted ${mainGoalie.shutouts} shutout${mainGoalie.shutouts > 1 ? "s" : ""} during the week. `
        : "") +
      `Consistent goaltending continues to be a major factor in keeping Bardownski competitive every night.`
    );
  }

  // Closing
  const avgGoalsFor = (totalGoalsFor / recentMatches.length).toFixed(1);
  paras.push(
    `The club averaged ${avgGoalsFor} goals per game over this stretch. ` +
    (wins > losses
      ? `The winning record shows the team is trending in the right direction heading into the next set of games.`
      : wins === losses
        ? `A .500 record is not where the club wants to be, but there were bright spots worth building on.`
        : `It was a rough week, but the talent on this roster is more than capable of bouncing back.`)
  );

  return {
    id: `auto-match-recap-${today}`,
    title: `Week in Review: ${wins}-${losses} in ${recentMatches.length} Games`,
    summary: paras.join("\n\n"),
    date: today,
    image: "/images/gallery/screenshots/team%20shot.webp",
    category: "Results",
  };
}
