import { fetchChelstatsData, computeMvpOddsFromMembers } from "@/lib/chelstats";
import { getNickname } from "@/lib/nicknames";
import type { Article } from "@/lib/news";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function tc(name: string): string {
  return titleCase(getNickname(name));
}

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
    `The MVP race continues to evolve week over week. As the season pushes forward, the numbers are painting a clearer picture of who is separating themselves from the pack. ` +
    `Here is the latest look at the odds and what each candidate is bringing to the table.`
  );

  // Detailed top 5 breakdown - each gets their own paragraph
  for (let i = 0; i < top5.length; i++) {
    const p = top5[i];
    const rank = i + 1;
    const oddsStr = p.americanOdds;
    const pct = (p.probability * 100).toFixed(1);
    const highlights = p.highlights.join(", ");
    const pos = p.isGoalie ? "Goalie" : p.position;

    if (i === 0) {
      if (p.isGoalie) {
        paras.push(
          `${rank}. ${tc(p.name)} (${pos}) at ${oddsStr} (${pct}%): ${highlights}. ` +
          `${tc(p.name)} holds the top spot as a goalie, proving that elite netminding can carry MVP weight in this league. ` +
          `The numbers between the pipes speak for themselves and it is hard to argue against a wall that gives your team a chance to win every single night.`
        );
      } else {
        paras.push(
          `${rank}. ${tc(p.name)} (${pos}) at ${oddsStr} (${pct}%): ${highlights}. ` +
          `${tc(p.name)} is the frontrunner right now. The combination of volume production and consistency has been impossible to ignore. ` +
          `${leader.probability > 0.4 ? "The gap at the top is significant, and it would take a massive run from someone else to close it." : "But the gap is not comfortable, and one big week from a challenger could flip the script."}`
        );
      }
    } else if (i === 1) {
      paras.push(
        `${rank}. ${tc(p.name)} (${pos}) at ${oddsStr} (${pct}%): ${highlights}. ` +
        `${tc(p.name)} is the biggest threat to the frontrunner. ` +
        (p.isGoalie
          ? `Goalies rarely get MVP consideration but the numbers this season demand it. The saves, the consistency, the big-game performances all add up.`
          : `The offensive production has been there all season and a hot streak down the stretch could change everything. This is far from a done deal.`)
      );
    } else {
      paras.push(
        `${rank}. ${tc(p.name)} (${pos}) at ${oddsStr} (${pct}%): ${highlights}. ` +
        (p.isGoalie
          ? `${tc(p.name)} continues to make a case from the crease. The goalie vs. skater MVP debate is alive and well.`
          : `${tc(p.name)} has been quietly stacking numbers and could be the dark horse if the top candidates cool off.`)
      );
    }
  }

  // Goalie vs skater angle
  const topGoalie = top5.find((p) => p.isGoalie);
  const topSkater = top5.find((p) => !p.isGoalie);
  if (topGoalie && topSkater) {
    paras.push(
      `The skater vs. goalie debate is alive and well this season. ${tc(topGoalie.name)} is making a legitimate case between the pipes ` +
      `while ${tc(topSkater.name)} dominates on the offensive end. Both paths to MVP are valid, and the final stretch of games will determine ` +
      `which style of dominance carries more weight when the votes are counted.`
    );
  }

  // Closing
  paras.push(
    `The race is not over yet. Every game from here on out matters, and the odds will continue to shift as the numbers pile up. Stay locked in.`
  );

  return {
    id: `auto-mvp-race-${today}`,
    title: `MVP Race: ${tc(leader.name)} ${leader.probability > 0.3 ? "Holds the Lead" : "Among the Frontrunners"}`,
    summary: paras.join("\n\n"),
    date: today,
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20184232.webp",
    category: "Stats",
  };
}
