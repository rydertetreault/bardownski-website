import { fetchChelstatsData } from "@/lib/chelstats";
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
import type { Article } from "@/lib/news";

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSkaterBody(m: ClubMember, members: ClubMember[]): string {
  const paras: string[] = [];
  const n = name(m);
  const ptsRank = rank(members, m, "points");
  const goalsRank = rank(members, m, "goals");
  const assistsRank = rank(members, m, "assists");
  const hitsRank = rank(members, m, "hits");
  const takeawaysRank = rank(members, m, "takeaways");

  // Find this player's strongest category to lead the article
  const ranks = [
    { key: "scoring", rank: ptsRank, value: m.points, label: `${m.points} points` },
    { key: "goals", rank: goalsRank, value: m.goals, label: `${m.goals} goals` },
    { key: "playmaking", rank: assistsRank, value: m.assists, label: `${m.assists} assists` },
    { key: "physicality", rank: hitsRank, value: m.hits, label: `${m.hits} hits` },
    { key: "two-way play", rank: takeawaysRank, value: m.takeaways, label: `${m.takeaways} takeaways` },
  ].sort((a, b) => a.rank - b.rank);
  const best = ranks[0];

  // Opening
  paras.push(
    `Roster spotlight: ${n}. ` +
    `Not every name on the leaderboard gets the headlines, but every player on this roster has a story worth telling. ` +
    `Here is a closer look at what ${n} has been bringing to the rink this season.`
  );

  // Lead with their strongest category
  paras.push(
    `Where ${n} stands out: ${best.key}. ` +
    `Sitting ${ordinal(best.rank)} on the team with ${best.label}, ${n} has carved out a clear identity within the lineup. ` +
    `That kind of role-defining production is what holds a roster together over a long season.`
  );

  // Full stat line
  paras.push(
    `On the season, ${n} has put up ${m.points} points (${m.goals} G, ${m.assists} A) across ${m.gamesPlayed} games, ` +
    `a ${m.ppg.toFixed(2)} points-per-game pace. ` +
    `${n} ranks ${ordinal(ptsRank)} in scoring, ${ordinal(goalsRank)} in goals, and ${ordinal(assistsRank)} in assists. ` +
    `The numbers say this is a player you can count on every shift.`
  );

  // Two-way game
  paras.push(
    `Beyond the scoresheet, ${n} has logged ${m.hits} hits, ${m.takeaways} takeaways, and ${m.blockedShots} blocked shots, ` +
    `posting a ${m.plusMinus >= 0 ? "+" : ""}${m.plusMinus} plus/minus on the year. ` +
    `Those are the small-margin numbers that don't always make highlight reels but absolutely show up in the win column.`
  );

  // Shooting
  if (m.shots > 0) {
    paras.push(
      `Shooting at ${m.shotPct.toFixed(1)}% on ${m.shots} shots with ${m.gwg} game-winning goals, ` +
      `${n} has been picking spots and making them count when it matters most.`
    );
  }

  // Closing
  const closers = [
    `Every roster needs players who do their job without needing the spotlight. ${n} is one of those players, and the numbers are quietly stacking up.`,
    `Watch this name down the stretch. ${n} has the kind of game that only gets more valuable as the season tightens up.`,
    `${n} might not always be the loudest name in the box score, but the impact is real and it shows up where it matters.`,
  ];
  paras.push(pickRandom(closers));

  return paras.join("\n\n");
}

function buildGoalieBody(m: ClubMember, members: ClubMember[]): string {
  const paras: string[] = [];
  const n = name(m);
  const svPct = m.savePct > 1 ? m.savePct.toFixed(1) : (m.savePct * 100).toFixed(1);

  paras.push(
    `Roster spotlight: ${n}. ` +
    `Goaltending is a position you only notice when something goes wrong, but the work that goes into a quiet night between the pipes is enormous. ` +
    `Here is a look at what ${n} has been doing for Bardownski this season.`
  );

  paras.push(
    `Across ${m.goalieGP} games in net, ${n} holds a ${svPct}% save percentage with a ${m.gaa.toFixed(2)} goals-against average. ` +
    `${m.shutouts} shutouts and ${m.shutoutPeriods} shutout periods are the kind of numbers that turn close games into wins. ` +
    `${m.goalieSaves} total saves on ${m.goalieShots} shots faced shows the volume ${n} has handled.`
  );

  paras.push(
    `Record-wise, ${n} sits at ${m.goalieWins}-${Math.max(0, m.goalieGP - m.goalieWins)} on the year. ` +
    `That win column is the bottom-line stat for any goalie, and ${n} has been delivering it consistently.`
  );

  const closers = [
    `Goaltending wins games. ${n} has been quietly making sure Bardownski has a chance every night.`,
    `When ${n} is locked in, the team plays with a different kind of confidence in front. That is what a starter does.`,
    `The wall stands. ${n} continues to be the steadying force this team needs.`,
  ];
  paras.push(pickRandom(closers));

  // Avoid unused-var warning if members ever becomes used in future tweaks
  void members;

  return paras.join("\n\n");
}

export interface RandomSpotlightResult {
  article: Article;
  playerName: string;
}

/**
 * Generate a roster spotlight on any player with games played.
 * Avoids picking the same player as the previous random spotlight.
 */
export async function generateRandomSpotlight(
  lastSpotlightPlayer: string
): Promise<RandomSpotlightResult | null> {
  const data = await fetchChelstatsData();
  if (!data) return null;

  const today = new Date().toISOString().split("T")[0];
  const { members } = data;

  // Pool: any player with games played, excluding the previous random pick
  const eligible = members.filter((m) => {
    const hasGames = m.gamesPlayed > 0 || m.goalieGP > 0;
    const isDifferent = m.username !== lastSpotlightPlayer;
    return hasGames && isDifferent;
  });

  if (eligible.length === 0) return null;

  const pick = pickRandom(eligible);
  const isGoalie = pick.goalieGP > pick.gamesPlayed;
  const displayName = name(pick);

  const body = isGoalie
    ? buildGoalieBody(pick, members)
    : buildSkaterBody(pick, members);

  return {
    article: {
      id: `auto-random-spotlight-${today}`,
      title: `Roster Spotlight: ${displayName}`,
      summary: body,
      date: today,
      image: "/images/gallery/screenshots/IMG_3288.webp",
      category: "Club News",
    },
    playerName: pick.username,
  };
}
