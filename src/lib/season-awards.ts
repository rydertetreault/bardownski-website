import { computeMvpOddsFromMembers, type ClubMember } from "./chelstats";
import { FROZEN_CHELSTATS } from "./chelstats-frozen";
import { getDisplayNameFromGamertag, getNickname } from "./nicknames";

export interface SeasonAward {
  id: string;
  title: string;
  winners: string[];
  result: string;
  criteria: string;
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
