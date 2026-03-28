import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { Article } from "@/lib/news";

function name(m: ClubMember): string {
  return getDisplayNameFromGamertag(m.username);
}

function buildBody(members: ClubMember[], record: string): string {
  const skaters = members
    .filter((m) => m.gamesPlayed > 0)
    .sort((a, b) => b.points - a.points);
  const goalies = members.filter((m) => m.goalieGP > 0);

  const top3 = skaters.slice(0, 3);
  const paras: string[] = [];

  paras.push(
    `Bardownski sits at ${record} on the season. Here is where the leaderboard stands heading into this week.`
  );

  // Points leaders
  if (top3.length >= 3) {
    paras.push(
      `${name(top3[0])} leads the club with ${top3[0].points} points (${top3[0].goals} G, ${top3[0].assists} A) in ${top3[0].gamesPlayed} games. ` +
      `${name(top3[1])} sits second with ${top3[1].points} points, followed by ${name(top3[2])} at ${top3[2].points}.`
    );
  }

  // Goals leader
  const byGoals = [...skaters].sort((a, b) => b.goals - a.goals);
  if (byGoals.length > 0 && byGoals[0].username !== top3[0]?.username) {
    paras.push(
      `In the goals race, ${name(byGoals[0])} leads with ${byGoals[0].goals} on the season.`
    );
  }

  // Hits leader
  const byHits = [...skaters].sort((a, b) => b.hits - a.hits);
  if (byHits.length > 0) {
    paras.push(
      `${name(byHits[0])} leads the physicality department with ${byHits[0].hits} hits, while ` +
      `the top shot percentage belongs to ${name([...skaters].filter((s) => s.shots > 20).sort((a, b) => b.shotPct - a.shotPct)[0] || skaters[0])} ` +
      `at ${([...skaters].filter((s) => s.shots > 20).sort((a, b) => b.shotPct - a.shotPct)[0] || skaters[0]).shotPct.toFixed(1)}%.`
    );
  }

  // Goalie stats
  if (goalies.length > 0) {
    const g = goalies.sort((a, b) => b.goalieGP - a.goalieGP)[0];
    const svPct = g.savePct > 1 ? g.savePct.toFixed(1) : (g.savePct * 100).toFixed(1);
    paras.push(
      `Between the pipes, ${name(g)} has played ${g.goalieGP} games with a ${svPct}% save rate, ${g.gaa.toFixed(2)} GAA, and ${g.shutouts} shutouts.`
    );
  }

  return paras.join("\n\n");
}

export async function generateStatsRecap(): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const { members, clubStats } = data;

  if (members.length === 0) return null;

  const record = `${clubStats.wins}-${clubStats.losses}-${clubStats.otl}`;
  const leader = [...members].sort((a, b) => b.points - a.points)[0];

  return {
    id: `auto-stats-recap-${today}`,
    title: `Weekly Stats Recap: ${name(leader)} Leads With ${leader.points} Points`,
    summary: buildBody(members, record),
    date: today,
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20183710.webp",
    category: "Stats",
  };
}
