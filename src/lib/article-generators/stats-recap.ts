import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { Article } from "@/lib/news";
import { formatMilestonesParagraph, type DetectedMilestone } from "@/lib/milestones";

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi, (m) => m.toUpperCase());
}

function name(m: ClubMember): string {
  return titleCase(getDisplayNameFromGamertag(m.username));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildBody(members: ClubMember[], record: string, totalGames: number): string {
  const skaters = members
    .filter((m) => m.gamesPlayed > 0)
    .sort((a, b) => b.points - a.points);
  const goalies = members.filter((m) => m.goalieGP > 0);

  const top5 = skaters.slice(0, 5);
  const paras: string[] = [];

  // Opening
  paras.push(
    `Bardownski sits at ${record} on the season with ${totalGames} games in the books. ` +
    `The leaderboard continues to take shape and here is a full look at where every category stands heading into this week.`
  );

  // Points leaders - detailed top 5
  if (top5.length >= 3) {
    paras.push(
      `${name(top5[0])} leads the club in scoring with ${top5[0].points} points (${top5[0].goals} G, ${top5[0].assists} A) across ${top5[0].gamesPlayed} games. ` +
      `That puts ${name(top5[0])} at a ${top5[0].ppg.toFixed(2)} points-per-game pace, the kind of production that carries a roster. ` +
      `${name(top5[1])} sits second with ${top5[1].points} points (${top5[1].goals} G, ${top5[1].assists} A), ` +
      `followed by ${name(top5[2])} at ${top5[2].points} points. ` +
      (top5.length >= 5
        ? `Rounding out the top five, ${name(top5[3])} has ${top5[3].points} points and ${name(top5[4])} has ${top5[4].points}.`
        : "")
    );
  }

  // Goals race
  const byGoals = [...skaters].sort((a, b) => b.goals - a.goals);
  if (byGoals.length >= 3) {
    paras.push(
      `The goals race is led by ${name(byGoals[0])} with ${byGoals[0].goals} on the season, ` +
      `${byGoals[0].goals === top5[0].goals ? "matching the overall scoring leader" : `ahead of ${name(byGoals[1])} who has ${byGoals[1].goals}`}. ` +
      `${name(byGoals[2])} sits ${ordinal(3)} with ${byGoals[2].goals} goals. ` +
      `Pure goal-scoring ability is what separates good players from game-changers, and these three have been doing it all season.`
    );
  }

  // Assists race
  const byAssists = [...skaters].sort((a, b) => b.assists - a.assists);
  if (byAssists.length >= 3) {
    paras.push(
      `In the assists column, ${name(byAssists[0])} leads the club with ${byAssists[0].assists} helpers. ` +
      `${name(byAssists[1])} is second with ${byAssists[1].assists} and ${name(byAssists[2])} has ${byAssists[2].assists}. ` +
      `Playmaking and vision are just as important as finishing, and the top assist leaders are the ones driving possession and creating chances for everyone around them.`
    );
  }

  // Hits + physical game
  const byHits = [...skaters].sort((a, b) => b.hits - a.hits);
  if (byHits.length >= 2) {
    paras.push(
      `${name(byHits[0])} continues to lead the physicality department with ${byHits[0].hits} hits on the season. ` +
      `${name(byHits[1])} is not far behind with ${byHits[1].hits}. ` +
      `The physical game has been a defining characteristic of this Bardownski team all year.`
    );
  }

  // Shot percentage
  const byShotPct = [...skaters].filter((s) => s.shots > 20).sort((a, b) => b.shotPct - a.shotPct);
  if (byShotPct.length >= 2) {
    paras.push(
      `Efficiency-wise, ${name(byShotPct[0])} holds the best shot percentage on the team at ${byShotPct[0].shotPct.toFixed(1)}% on ${byShotPct[0].shots} shots. ` +
      `${name(byShotPct[1])} is second at ${byShotPct[1].shotPct.toFixed(1)}%. ` +
      `A high shot percentage means quality over quantity, and these players are making every look count.`
    );
  }

  // GWG
  const byGWG = [...skaters].sort((a, b) => b.gwg - a.gwg);
  if (byGWG.length > 0 && byGWG[0].gwg > 0) {
    paras.push(
      `When it comes to clutch moments, ${name(byGWG[0])} leads the team with ${byGWG[0].gwg} game-winning goals. ` +
      (byGWG.length > 1 && byGWG[1].gwg > 0
        ? `${name(byGWG[1])} has ${byGWG[1].gwg}. `
        : "") +
      `These are the goals that swing entire games and define seasons.`
    );
  }

  // Goalie stats
  if (goalies.length > 0) {
    const g = goalies.sort((a, b) => b.goalieGP - a.goalieGP)[0];
    const svPct = g.savePct > 1 ? g.savePct.toFixed(1) : (g.savePct * 100).toFixed(1);
    paras.push(
      `Between the pipes, ${name(g)} has been the backbone of the defense. In ${g.goalieGP} games, ` +
      `${name(g)} holds a ${svPct}% save rate with a ${g.gaa.toFixed(2)} goals-against average and ${g.shutouts} shutouts on the season. ` +
      `${g.goalieSaves} total saves tell the story of a goalie who faces volume and handles it. ` +
      `Goaltending at this level is what keeps a team in games they have no business winning.`
    );
  }

  return paras.join("\n\n");
}

export async function generateStatsRecap(milestones: DetectedMilestone[] = []): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const { members, clubStats } = data;

  if (members.length === 0) return null;

  const record = `${clubStats.wins}-${clubStats.losses}-${clubStats.otl}`;
  const leader = [...members].sort((a, b) => b.points - a.points)[0];

  let body = buildBody(members, record, clubStats.totalGames);
  const milestonePara = formatMilestonesParagraph(milestones);
  if (milestonePara) {
    body += "\n\n" + milestonePara;
  }

  return {
    id: `auto-stats-recap-${today}`,
    title: `Weekly Stats Recap: ${name(leader)} Leads With ${leader.points} Points`,
    summary: body,
    date: today,
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20183953.webp",
    category: "Stats",
  };
}
