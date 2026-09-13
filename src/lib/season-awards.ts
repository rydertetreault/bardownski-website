import awardGames from "./season-award-games.json";
import { computeMvpOddsFromMembers, type ClubMember } from "./chelstats";
import { FROZEN_CHELSTATS } from "./chelstats-frozen";
import { getDisplayNameFromGamertag, getNickname } from "./nicknames";

export interface SeasonAward {
  id: string;
  title: string;
  winners: string[];
  result: string;
  criteria: string;
  description?: string;
  selection?: "editorial";
}

// Frozen NHL 26 totals, never the next season's live API. All ties share honors.
export function calculateSeasonAwards(members: ClubMember[]): SeasonAward[] {
  const ranking = computeMvpOddsFromMembers(members);
  function ranked(id: string, title: string, entries: typeof ranking, criteria: string): SeasonAward {
    const best = entries[0]?.score;
    return { id, title, winners: entries.filter(e => e.score === best).map(e => getNickname(e.name)),
      result: best === undefined ? "No eligible players" : `${best.toFixed(2)} performance score`, criteria };
  }
  function leader(id: string, title: string, key: "points" | "goals" | "assists" | "hits" | "blockedShots" | "gwg", label: string): SeasonAward {
    const best = members.length ? Math.max(...members.map(m => m[key])) : undefined;
    return { id, title, winners: members.filter(m => m[key] === best).map(m => getDisplayNameFromGamertag(m.username)),
      result: best === undefined ? "No eligible players" : `${best.toLocaleString("en-US")} ${label}`,
      criteria: `Highest full-season ${label} total. No minimum games; tied totals share the award.` };
  }
  return [
    ranked("mvp", "Season MVP", ranking, "Highest score from the site's existing position-adjusted MVP model. Minimum 5 games in the scored role. Skater and goalie roles are scored separately; the highest role score wins, not their sum."),
    ranked("defense", "Top Defenseman", ranking.filter(e => !e.isGoalie && /^(d|ld|rd|defense|defenseman)$/i.test(e.position)), "Highest existing MVP-model score among listed defensemen, minimum 5 skater games. SKTR is not a confirmed defense position and is excluded from this positional award."),
    ranked("goalie", "Top Goaltender", ranking.filter(e => e.isGoalie), "Highest existing goalie MVP-model score, minimum 5 goalie games. Weights save percentage, GAA, wins, shutouts, shutout periods, workload, and games played."),
    leader("points", "Scoring Champion", "points", "points"),
    leader("goals", "Top Goal Scorer", "goals", "goals"),
    leader("assists", "Playmaker", "assists", "assists"),
    leader("hits", "Heavy Hitter", "hits", "hits"),
    leader("blocks", "Shot Blocker", "blockedShots", "blocked shots"),
    leader("clutch", "Game Winner", "gwg", "game-winning goals"),
  ];
}

export const SEASON_AWARDS = calculateSeasonAwards(FROZEN_CHELSTATS.members);
export const SEASON_MVP = SEASON_AWARDS[0];

// Team-approved editorial honor, separate from the statistical award model.
export const UNSUNG_HERO = {
  title: "Unsung Hero",
  winner: "Slobby Robby",
  detail: "170 assists · 123 blocked shots · 261 takeaways · 399 hits · +51 in 91 games",
  description: "The work outside the scoring spotlight: creating chances, blocking shots, and doing the supporting work that makes a team stronger.",
};

// Read-only snapshot of match-history:matches for NHL 26, March 7–July 22,
// 2026. Only our skaters, regular/finals games; forfeits/private games excluded.
// The archive is incomplete (75 of 366 club games), not full-season coverage.
export function calculateRecapHighlights(games: typeof awardGames): SeasonAward[] {
  const ordered = [...new Map(games.map(game => [game.id, game])).values()]
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const performances = ordered.flatMap(game => game.players.map(player => ({
    ...player, game, points: player.goals + player.assists,
  })));
  const best = Math.max(...performances.map(p => p.points));
  const bestGames = performances.filter(p => p.points === best);
  return [
    {
      id: "individual-performance",
      title: "Best Individual Performance",
      winners: [...new Set(bestGames.map(p => getNickname(p.name)))],
      result: bestGames.map(p => `${p.goals} goals · ${p.assists} assists in a ${p.game.scoreUs}–${p.game.scoreThem} game vs ${p.game.opponent} · ${p.game.date}`).join("; ") || "No eligible performances",
      criteria: "Highest single-game skater points (goals + assists) in the 2025–2026 archived regular-season and finals games. All ties share the award. Based on 75 archived games from March 7–July 22, 2026, not all 366 season games.",
    },

  ];
}

// Editorial honor, separate from calculated game/season rankings.
// Baseline: stats page's parsed 2024 Discord table, dated August 22, 2024
// (KADEN: 55 GP, 133 points, 54 goals, 25.1% shooting). Current figures
// are from FROZEN_CHELSTATS, not the incomplete match archive.
export const BREAKOUT_PLAYER: SeasonAward = {
  id: "breakout",
  title: "Breakout Player",
  selection: "editorial",
  winners: ["GOTTA BE"],
  result: "317 points · 109 blocks · 117 games",
  description: "More than doubled his appearances from the previous listed season, raised his shooting percentage from 25.1% to 35%, and delivered 121 goals, 196 assists and 109 blocks from defense.",
  criteria: "An editorial selection for a larger sustained contribution, improved finishing and production from defense—not a PPG leaderboard or a calculated most-improved award. Compared with the stats page’s 2024 table, appearances rose from 55 to 117, points from 133 to 317, goals from 54 to 121, and shooting percentage from 25.1% to 35%. The 2025–2026 season also included 255 takeaways and 384 hits. The larger workload explains part of the totals increase. His −33 and 745 giveaways remain caveats; historical defensive and discipline data are incomplete, so this is not a claim of across-the-board improvement.",
};

export const RECAP_HONORS: SeasonAward[] = [
  ...SEASON_AWARDS.filter(award => ["defense", "goalie"].includes(award.id)),
  ...calculateRecapHighlights(awardGames),
  BREAKOUT_PLAYER,
];
