import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { WeeklyPlayer } from "@/lib/discord";
import type { Article } from "@/lib/news";

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi, (m) => m.toUpperCase());
}

function name(m: ClubMember): string {
  return titleCase(getDisplayNameFromGamertag(m.username));
}

function rank(members: ClubMember[], member: ClubMember, key: keyof ClubMember): number {
  const sorted = [...members]
    .filter((m) => m.gamesPlayed > 0)
    .sort((a, b) => (b[key] as number) - (a[key] as number));
  return sorted.findIndex((m) => m.username === member.username) + 1;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildSkaterBody(m: ClubMember, members: ClubMember[], weeklyPlayer: WeeklyPlayer | null): string {
  const paras: string[] = [];
  const n = name(m);
  const ptsRank = ordinal(rank(members, m, "points"));
  const goalsRank = ordinal(rank(members, m, "goals"));
  const assistsRank = ordinal(rank(members, m, "assists"));
  const hitsRank = ordinal(rank(members, m, "hits"));

  paras.push(
    `This week's Player of the Week spotlight goes to ${n}. ` +
    `After another strong stretch of games, ${n} has earned the nod as the most impactful player on the roster this week. ` +
    `Here is a full breakdown of what makes this player stand out on the ice.`
  );

  // Weekly performance (if we have delta data)
  if (weeklyPlayer && weeklyPlayer.deltaPoints > 0) {
    if (weeklyPlayer.isGoalie) {
      paras.push(
        `This week, ${n} added +${weeklyPlayer.deltaSaves} saves to the total. ` +
        `That kind of workload and consistency is what earns Player of the Week honors.`
      );
    } else {
      paras.push(
        `This week, ${n} added +${weeklyPlayer.deltaGoals} goals, +${weeklyPlayer.deltaAssists} assists ` +
        `for +${weeklyPlayer.deltaPoints} points and +${weeklyPlayer.deltaHits} hits. ` +
        `That kind of all-around production across a single week is exactly what separates good from elite.`
      );
    }
  }

  // Season stat line
  paras.push(
    `On the season, ${n} has put up ${m.points} points (${m.goals} G, ${m.assists} A) across ${m.gamesPlayed} games. ` +
    `That is a ${m.ppg.toFixed(2)} points-per-game pace, good for ${ptsRank} on the team in scoring. ` +
    `${n} ranks ${goalsRank} in goals and ${assistsRank} in assists, showing the ability to both finish and create at a high level.`
  );

  // Physical and defensive game
  paras.push(
    `The impact goes beyond the scoresheet. ${n} has recorded ${m.hits} hits (${hitsRank} on the team) ` +
    `and ${m.takeaways} takeaways against ${m.giveaways} giveaways. ` +
    `With a ${m.plusMinus >= 0 ? "+" : ""}${m.plusMinus} plus/minus rating, the two-way game is there. ` +
    `${n} is not just producing offensively but making life difficult for opponents on every shift.`
  );

  // Shooting efficiency
  paras.push(
    `Shooting at ${m.shotPct.toFixed(1)}% on ${m.shots} shots with ${m.gwg} game-winning goals on the season. ` +
    `The shot percentage tells you this is a player who picks spots and makes quality looks count. ` +
    `Game-winning goals are the ones that matter most, and ${n} has been delivering in the clutch all year.`
  );

  // Strengths summary
  const strengths: string[] = [];
  if (rank(members, m, "goals") <= 3) strengths.push("elite goal-scoring");
  if (rank(members, m, "assists") <= 3) strengths.push("high-level playmaking");
  if (rank(members, m, "hits") <= 3) strengths.push("physicality");
  if (rank(members, m, "takeaways") <= 3) strengths.push("defensive awareness");
  if (m.shotPct > 25) strengths.push("lethal shooting efficiency");
  if (m.gwg >= 3) strengths.push("clutch performance");

  if (strengths.length > 0) {
    paras.push(
      `The defining qualities: ${strengths.join(", ")}. ` +
      `${n} impacts the game on multiple levels and continues to be one of the most important players on this roster. ` +
      `When the puck is on this player's stick, something is about to happen.`
    );
  }

  return paras.join("\n\n");
}

function buildGoalieBody(m: ClubMember, members: ClubMember[], weeklyPlayer: WeeklyPlayer | null): string {
  const paras: string[] = [];
  const n = name(m);
  const svPct = m.savePct > 1 ? m.savePct.toFixed(1) : (m.savePct * 100).toFixed(1);

  paras.push(
    `This week's Player of the Week spotlight goes to ${n}, the backbone of the Bardownski defense. ` +
    `Goaltending is the most thankless position in hockey. You can make 30 saves and the one that beats you is the one everyone remembers. ` +
    `But ${n} has been making sure those moments are rare this season.`
  );

  // Weekly performance
  if (weeklyPlayer && weeklyPlayer.deltaSaves > 0) {
    paras.push(
      `This week, ${n} added +${weeklyPlayer.deltaSaves} saves to the season total. ` +
      `The workload has been relentless and ${n} continues to answer the bell every single game.`
    );
  }

  // Core goalie stats
  paras.push(
    `Across ${m.goalieGP} games in net, ${n} has posted a ${svPct}% save percentage ` +
    `with a ${m.gaa.toFixed(2)} goals-against average. Those are numbers that anchor a team. ` +
    `${m.shutouts} shutouts and ${m.shutoutPeriods} shutout periods show the consistency is not a fluke. ` +
    `When ${n} is locked in, the opposition knows it is going to be a long night.`
  );

  // Volume and record
  paras.push(
    `${n} has stopped ${m.goalieSaves} of ${m.goalieShots} shots faced this season. ` +
    `That is the kind of volume that would break most goalies, but ${n} thrives under pressure. ` +
    `With a ${m.goalieWins}-${m.goalieGP - m.goalieWins} record, the win column backs up everything the advanced numbers show.`
  );

  // Closing
  paras.push(
    `Goaltending at this level is what keeps a team in games they have no business winning. ` +
    `${n} has been that player all season, and this week was no exception. The wall stands.`
  );

  return paras.join("\n\n");
}

export async function generatePlayerSpotlight(
  weeklyPlayer: WeeklyPlayer | null
): Promise<Article | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const { members } = data;

  // Find the chelstats member matching the weekly player
  let spotlightMember: ClubMember | undefined;

  if (weeklyPlayer) {
    spotlightMember = members.find(
      (m) => getDisplayNameFromGamertag(m.username).toUpperCase() === weeklyPlayer.name.toUpperCase()
        || m.username.toUpperCase() === weeklyPlayer.name.toUpperCase()
    );
  }

  // Fallback: pick the top scorer if no weekly player match
  if (!spotlightMember) {
    spotlightMember = [...members]
      .filter((m) => m.gamesPlayed > 0)
      .sort((a, b) => b.points - a.points)[0];
  }

  if (!spotlightMember) return null;

  const isGoalie = weeklyPlayer?.isGoalie ?? spotlightMember.goalieGP > spotlightMember.gamesPlayed;
  const displayName = name(spotlightMember);

  const body = isGoalie
    ? buildGoalieBody(spotlightMember, members, weeklyPlayer)
    : buildSkaterBody(spotlightMember, members, weeklyPlayer);

  return {
    id: `auto-player-spotlight-${today}`,
    title: `Player of the Week: ${displayName}`,
    summary: body,
    date: today,
    image: "/images/gallery/screenshots/IMG_3288.webp",
    category: "Club News",
  };
}
