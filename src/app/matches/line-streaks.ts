import { normalizeChemistryName } from "@/lib/line-chemistry";

/** A group of club members who are currently winning every game they play together. */
export interface LineStreak {
  /** Canonical display names (nicknames), sorted. */
  players: string[];
  /** Members who played goalie in every game of the active streak. */
  goalies: string[];
  /** Consecutive wins in the most recent games with exactly this lineup. */
  current: number;
  /** Longest run of wins together this season. */
  best: number;
  /** Games this season with exactly this lineup of club members. */
  games: number;
  /** Date of the most recent win in the active streak. */
  lastWin: string;
}

/** Structural subset of a current-season match; works for Match and ClubMatch. */
export interface LineStreakMatch {
  id: string;
  timestamp: number;
  date: string;
  scoreUs?: number | null;
  scoreThem?: number | null;
  matchType?: string;
  forfeit?: boolean;
  shotsUs?: number;
  shotsThem?: number;
  toaUs?: string;
  toaThem?: string;
  players?: readonly {
    name: string;
    position?: string;
    isGoalie?: boolean;
    isOurPlayer?: boolean;
    goals?: number;
    assists?: number;
    shots?: number;
    hits?: number;
    saves?: number;
  }[] | null;
}

interface LineupGame {
  date: string;
  won: boolean;
  /** name -> played goalie this game */
  lineup: Map<string, boolean>;
}

const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;
const clockRan = (value: unknown) => typeof value === "string" && /[1-9]/.test(value);
const validScore = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isGoalie = (player: { position?: string; isGoalie?: boolean }) =>
  player.isGoalie === true || /^(g|gk|goalie|goaltender|goalkeeper)$/i.test(player.position?.trim() ?? "");

/** A forfeit only counts when the feed recorded real play (e.g. the opponent quit mid-game). */
function recordedPlay(match: LineStreakMatch): boolean {
  if (positive(match.shotsUs) || positive(match.shotsThem) || clockRan(match.toaUs) || clockRan(match.toaThem)) return true;
  return (match.players ?? []).some(p => [p.goals, p.assists, p.shots, p.hits, p.saves].some(positive));
}

/**
 * Active win streaks for each exact lineup of club members this season,
 * whether they were skating or in net. A game only counts for the exact group
 * of club members who played it: Matt + JRT winning with Xavier is a streak
 * for that trio, not for the Matt + JRT duo. Guests are ignored, private
 * games and forfeits without recorded play are skipped, and a loss ends the
 * streak.
 */
export function lineWinStreaks(
  matches: readonly LineStreakMatch[],
  clubMembers: readonly string[],
  { minWins = 2, limit = 6 }: { minWins?: number; limit?: number } = {},
): LineStreak[] {
  const members = new Set(clubMembers.map(normalizeChemistryName).filter(Boolean));
  const seen = new Set<string>();
  const games: LineupGame[] = [];
  for (const match of [...matches].sort((a, b) => b.timestamp - a.timestamp)) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    if (match.matchType?.trim().toLowerCase() === "private") continue;
    if (!validScore(match.scoreUs) || !validScore(match.scoreThem)) continue;
    if (match.forfeit && !recordedPlay(match)) continue;
    const lineup = new Map<string, boolean>();
    for (const player of match.players ?? []) {
      if (player.isOurPlayer !== true) continue;
      const name = normalizeChemistryName(player.name);
      if (members.has(name)) lineup.set(name, (lineup.get(name) ?? false) || isGoalie(player));
    }
    games.push({ date: match.date, won: match.scoreUs > match.scoreThem, lineup });
  }

  const byGroup = new Map<string, { players: string[]; games: LineupGame[] }>();
  for (const game of games) {
    const players = [...game.lineup.keys()].sort();
    if (players.length < 2) continue;
    const key = players.join("|");
    const entry = byGroup.get(key) ?? { players, games: [] };
    entry.games.push(game);
    byGroup.set(key, entry);
  }

  const streaks: LineStreak[] = [];
  for (const { players, games: together } of byGroup.values()) {
    let current = 0;
    while (current < together.length && together[current].won) current++;
    if (current < minWins) continue;
    let best = 0;
    let run = 0;
    for (const game of together) {
      run = game.won ? run + 1 : 0;
      best = Math.max(best, run);
    }
    const active = together.slice(0, current);
    const goalies = players.filter(name => active.every(game => game.lineup.get(name)));
    streaks.push({ players, goalies, current, best, games: together.length, lastWin: together[0].date });
  }

  return streaks
    .sort((a, b) => b.current - a.current || b.players.length - a.players.length ||
      b.best - a.best || a.players.join().localeCompare(b.players.join()))
    .slice(0, limit);
}
