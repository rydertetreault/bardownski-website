import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { WeeklyPlayer } from "@/lib/discord";
import type { Article } from "@/lib/news";

function name(m: ClubMember): string {
  return getDisplayNameFromGamertag(m.username);
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

function buildSkaterBody(m: ClubMember, members: ClubMember[]): string {
  const paras: string[] = [];

  paras.push(
    `This week's Player of the Week spotlight goes to ${name(m)}. ` +
    `Here is a full breakdown of what makes this player stand out on the ice.`
  );

  paras.push(
    `In ${m.gamesPlayed} games played, ${name(m)} has put up ${m.points} points (${m.goals} G, ${m.assists} A) ` +
    `with a ${m.plusMinus >= 0 ? "+" : ""}${m.plusMinus} plus/minus rating. ` +
    `That is good for ${ordinal(rank(members, m, "points"))} on the team in scoring.`
  );

  paras.push(
    `On the physical side, ${name(m)} has recorded ${m.hits} hits and ${m.takeaways} takeaways ` +
    `against ${m.giveaways} giveaways. Shooting at ${m.shotPct.toFixed(1)}% on ${m.shots} shots, ` +
    `with ${m.gwg} game-winning goals on the season.`
  );

  const strengths: string[] = [];
  if (rank(members, m, "goals") <= 3) strengths.push("elite goal-scoring");
  if (rank(members, m, "assists") <= 3) strengths.push("strong playmaking");
  if (rank(members, m, "hits") <= 3) strengths.push("physicality");
  if (rank(members, m, "takeaways") <= 3) strengths.push("defensive awareness");
  if (m.shotPct > 25) strengths.push("lethal shooting efficiency");

  if (strengths.length > 0) {
    paras.push(
      `Key strengths: ${strengths.join(", ")}. ${name(m)} is a player that impacts the game on multiple levels ` +
      `and continues to be a factor every time the puck drops.`
    );
  }

  return paras.join("\n\n");
}

function buildGoalieBody(m: ClubMember, members: ClubMember[]): string {
  const paras: string[] = [];
  const svPct = m.savePct > 1 ? m.savePct.toFixed(1) : (m.savePct * 100).toFixed(1);

  paras.push(
    `This week's Player of the Week spotlight goes to ${name(m)}, the backbone of the Bardownski defense.`
  );

  paras.push(
    `Across ${m.goalieGP} games in net, ${name(m)} has posted a ${svPct}% save percentage ` +
    `with a ${m.gaa.toFixed(2)} goals-against average. ${m.shutouts} shutouts and ${m.shutoutPeriods} shutout periods ` +
    `show the consistency night after night.`
  );

  paras.push(
    `${name(m)} has stopped ${m.goalieSaves} of ${m.goalieShots} shots faced this season. ` +
    `With a ${m.goalieWins}-${m.goalieGP - m.goalieWins} record, ` +
    `the numbers speak for themselves.`
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
    // Match by resolved name (weekly player uses real names, chelstats uses gamertags)
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
    ? buildGoalieBody(spotlightMember, members)
    : buildSkaterBody(spotlightMember, members);

  return {
    id: `auto-player-spotlight-${today}`,
    title: `Player of the Week: ${displayName}`,
    summary: body,
    date: today,
    image: "/images/gallery/screenshots/BD%20-%20home%20skt.webp",
    category: "Club News",
  };
}
