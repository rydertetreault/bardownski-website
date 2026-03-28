import { fetchChelstatsData, computeMvpOddsFromMembers } from "@/lib/chelstats";
import type { Article } from "@/lib/news";

export async function generateMvpRace(): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const odds = computeMvpOddsFromMembers(data.members);
  if (odds.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const top5 = odds.slice(0, 5);
  const leader = top5[0];

  const paras: string[] = [];

  paras.push(
    `The MVP race continues to take shape. Here is the latest look at the odds and what each candidate is bringing to the table.`
  );

  // Top 5 breakdown
  const lines = top5.map((p, i) => {
    const rank = i + 1;
    const oddsStr = p.americanOdds;
    const pct = (p.probability * 100).toFixed(1);
    const highlights = p.highlights.join(", ");
    const pos = p.isGoalie ? "Goalie" : p.position;
    return `${rank}. ${p.name} (${pos}) - ${oddsStr} (${pct}%): ${highlights}`;
  });
  paras.push(lines.join("\n"));

  // Leader narrative
  if (leader.isGoalie) {
    paras.push(
      `${leader.name} holds the top spot as a goalie, proving that elite netminding can carry MVP weight. ` +
      `${leader.highlights.join(", ")} tell the story of a wall between the pipes.`
    );
  } else {
    paras.push(
      `${leader.name} holds the top spot with ${leader.highlights[0]} and continues to set the pace for the club. ` +
      `The gap between first and second is ${leader.probability > 0.4 ? "significant" : "closing"}, ` +
      `making every game down the stretch critical.`
    );
  }

  // Goalie vs skater angle
  const topGoalie = top5.find((p) => p.isGoalie);
  const topSkater = top5.find((p) => !p.isGoalie);
  if (topGoalie && topSkater) {
    paras.push(
      `The skater vs. goalie debate is alive this season. ${topGoalie.name} is making a strong case between the pipes ` +
      `while ${topSkater.name} dominates on the offensive end. Both paths to MVP are legitimate.`
    );
  }

  return {
    id: `auto-mvp-race-${today}`,
    title: `MVP Race: ${leader.name} ${leader.probability > 0.3 ? "Holds the Lead" : "Among the Frontrunners"}`,
    summary: paras.join("\n\n"),
    date: today,
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20184232.webp",
    category: "Stats",
  };
}
