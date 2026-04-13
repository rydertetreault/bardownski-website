import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { Article } from "@/lib/news";
import type { DetectedMilestone } from "@/lib/milestones";

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi, (m) => m.toUpperCase());
}

function name(m: ClubMember): string {
  return titleCase(getDisplayNameFromGamertag(m.username));
}

/**
 * Build a paragraph for a single player's milestones with full stats context.
 */
function buildPlayerSection(
  playerName: string,
  milestones: DetectedMilestone[],
  member: ClubMember | undefined,
): string {
  const displayName = titleCase(playerName);

  // Format milestone labels
  const labels = milestones
    .sort((a, b) => b.threshold - a.threshold)
    .map((m) => m.label.toLowerCase());

  let milestoneStr: string;
  if (labels.length === 1) {
    milestoneStr = labels[0];
  } else {
    const last = labels.pop()!;
    milestoneStr = labels.join(", ") + " and " + last;
  }

  const lines: string[] = [];
  lines.push(`${displayName} has crossed ${milestoneStr}.`);

  if (!member) return lines.join(" ");

  // Add stats context depending on whether this is a goalie or skater
  if (member.goalieGP > 0 && member.gamesPlayed === 0) {
    // Pure goalie
    const svPct = member.savePct > 1 ? member.savePct.toFixed(1) : (member.savePct * 100).toFixed(1);
    lines.push(
      `On the season, ${displayName} has ${member.goalieSaves} saves across ${member.goalieGP} games ` +
      `with a ${svPct}% save rate, a ${member.gaa.toFixed(2)} GAA, and ${member.shutouts} shutouts.`
    );
  } else {
    // Skater (possibly with some goalie games)
    lines.push(
      `${displayName} now sits at ${member.points} points (${member.goals} G, ${member.assists} A) ` +
      `in ${member.gamesPlayed} games with ${member.hits} hits on the season.`
    );
    if (member.gwg > 0) {
      lines.push(`${member.gwg} of those goals have been game-winners.`);
    }
    if (member.goalieGP > 0) {
      lines.push(
        `Between the pipes, ${displayName} also has ${member.goalieSaves} saves and ${member.shutouts} shutouts across ${member.goalieGP} goalie appearances.`
      );
    }
  }

  return lines.join(" ");
}

function buildBody(
  milestones: DetectedMilestone[],
  members: ClubMember[],
): string {
  const paras: string[] = [];

  // Group milestones by player
  const byPlayer = new Map<string, DetectedMilestone[]>();
  for (const m of milestones) {
    const existing = byPlayer.get(m.playerName) || [];
    // Keep only the highest threshold per stat
    const dominated = existing.find((e) => e.stat === m.stat);
    if (dominated) {
      if (m.threshold > dominated.threshold) {
        const filtered = existing.filter((e) => e.stat !== m.stat);
        filtered.push(m);
        byPlayer.set(m.playerName, filtered);
      }
    } else {
      existing.push(m);
      byPlayer.set(m.playerName, existing);
    }
  }

  // Sort players by highest single threshold (biggest milestone first)
  const sortedPlayers = [...byPlayer.entries()].sort((a, b) => {
    const maxA = Math.max(...a[1].map((m) => m.threshold));
    const maxB = Math.max(...b[1].map((m) => m.threshold));
    return maxB - maxA;
  });

  // Find the headline milestone
  const topMilestone = milestones.reduce((best, m) =>
    m.threshold > best.threshold ? m : best
  , milestones[0]);
  const headlineName = titleCase(topMilestone.playerName);

  // Opening paragraph
  const totalCount = sortedPlayers.reduce((sum, [, ms]) => sum + ms.length, 0);
  if (sortedPlayers.length === 1) {
    paras.push(
      `${headlineName} hit a major milestone this week and it deserves its own spotlight. ` +
      `These are the kind of numbers that define a player's legacy.`
    );
  } else {
    paras.push(
      `The milestones keep stacking up for Bardownski. ${totalCount} milestone${totalCount > 1 ? "s" : ""} ` +
      `across ${sortedPlayers.length} players were crossed this week, ` +
      `headlined by ${headlineName} reaching ${topMilestone.label.toLowerCase()}. ` +
      `These are the kind of numbers that define careers.`
    );
  }

  // Build a section for each player
  const memberByName = new Map<string, ClubMember>();
  for (const m of members) {
    const displayName = getDisplayNameFromGamertag(m.username).toUpperCase();
    memberByName.set(displayName, m);
  }

  for (const [playerName, playerMilestones] of sortedPlayers) {
    const member = memberByName.get(playerName.toUpperCase());
    paras.push(buildPlayerSection(playerName, playerMilestones, member));
  }

  // Closing
  paras.push(
    `Milestones like these do not happen by accident. They are the result of consistency, ` +
    `volume, and showing up game after game. This Bardownski roster continues to push the numbers ` +
    `higher and the season is far from over.`
  );

  return paras.join("\n\n");
}

export async function generateMilestoneRecap(milestones: DetectedMilestone[] = []): Promise<Article | null> {
  if (milestones.length === 0) return null;

  const data = await fetchChelstatsData();
  if (!data) return null;

  const { members } = data;

  // Find the headline milestone for the title
  const topMilestone = milestones.reduce((best, m) =>
    m.threshold > best.threshold ? m : best
  , milestones[0]);
  const headlineName = titleCase(topMilestone.playerName);

  const body = buildBody(milestones, members);
  const today = new Date().toISOString().split("T")[0];

  return {
    id: `auto-milestone-recap-${today}`,
    title: `Milestone Watch: ${headlineName} Crosses ${topMilestone.label}`,
    summary: body,
    date: today,
    image: "/images/gallery/screenshots/Screenshot%202026-03-16%20183953.webp",
    category: "Stats",
  };
}
