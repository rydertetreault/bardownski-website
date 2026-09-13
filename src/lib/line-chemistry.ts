import type { ClubMatch, MatchPlayerStat } from "./chelstats";
import localGames from "./season-award-games.json";
import { getDisplayNameFromGamertag, getNickname } from "./nicknames";

export type ChemistrySize = 2 | 3 | 5;
export type ChemistrySort = "reliable" | "win-rate" | "goal-difference" | "attack";

/** Scores are CLUB outcomes while these players coappeared, not on-ice line goals.
 * Skaters are canonical display-name IDs. Neither source guarantees a full roster. */
export interface ChemistryGame {
  id: string;
  date: string;
  timestamp: number;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  skaters: string[];
  source?: "full" | "local";
  coverage?: "recorded-roster" | "partial-scoresheet";
}

export interface ChemistryStats {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  /** 0–100, wins / all shared games. Draws are not counted as half-wins. */
  winPct: number | null;
  gfPerGame: number | null;
  gaPerGame: number | null;
  gdPerGame: number | null;
  /** 0–1 Wilson lower bound (z=1.96). Descriptive ordering of saved outcomes,
   * NOT a predicted win probability or a chemistry percentage. */
  wilsonLowerBound: number | null;
}

export interface ChemistryEvaluation {
  players: string[];
  stats: ChemistryStats;
  matchingGames: ChemistryGame[];
}

export interface ChemistryRecommendationOptions {
  /** Omitted = all observed skaters; [] = nobody available. Unknown names ignored. */
  availablePlayers?: readonly string[];
  minGames?: number;
  sort?: ChemistrySort;
}

type RecordedPlayer = Pick<MatchPlayerStat, "name" | "position" | "isOurPlayer" | "isGoalie"> & {
  goals?: number;
};
/** Structurally accepts readonly ClubMatch[] and untrusted nullable saved scores. */
export type ChemistryMatchInput = Pick<ClubMatch, "id" | "timestamp" | "date" | "opponent"> & {
  scoreUs?: number | null;
  scoreThem?: number | null;
  result?: string;
  matchType?: string;
  forfeit?: boolean;
  players?: readonly RecordedPlayer[] | null;
};

/** Only use for the archived OUR-skater scoresheets, not an arbitrary club roster.
 * Missing positions are unknown: never infer goalie from name, goals or assists. */
export interface ChemistryLocalGame {
  id: string;
  timestamp: number;
  date: string;
  opponent: string;
  scoreUs?: number | null;
  scoreThem?: number | null;
  result?: string;
  matchType?: string;
  forfeit?: boolean;
  players?: readonly {
    name: string;
    goals?: number;
    assists?: number;
    position?: string;
    isGoalie?: boolean;
    isOurPlayer?: boolean;
  }[] | null;
}

const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
// The nickname helper's gamertag lookup is case-sensitive. Index its known spellings
// once; display values still come exclusively from the shared nickname helpers.
const gamertagNames = new Map([
  "Rydayro", "S1obbyRobby", "Mhut8", "u4 Pablo", "oP wet", "u4 Hood", "Julio 3026", "oP Ding1633",
].map(tag => [tag.toUpperCase(), getDisplayNameFromGamertag(tag)]));

/** Use this on foreground member.username/name as well as selected player IDs. */
export function normalizeChemistryName(name: string): string {
  const trimmed = name.trim();
  return getNickname(gamertagNames.get(trimmed.toUpperCase()) ?? getDisplayNameFromGamertag(trimmed))
    .trim().toUpperCase();
}

function uniqueNames(names: readonly string[]): string[] {
  return [...new Set(names.map(normalizeChemistryName).filter(Boolean))].sort(lexical);
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function goalie(player: { position?: string; isGoalie?: boolean }): boolean {
  return player.isGoalie === true || /^(g|gk|goalie|goaltender|goalkeeper)$/i.test(player.position?.trim() ?? "");
}

function excludedType(game: ChemistryMatchInput | ChemistryLocalGame): boolean {
  return game.matchType?.trim().toLowerCase() === "private" || game.forfeit === true ||
    /forfeit/i.test(game.result ?? "") || /^forfeit(?:-|$)/i.test(game.id.trim());
}

/** Repeated aliases are one player, not additional goals. Missing/invalid player
 * goal fields cannot establish inconsistency and never supply a replacement score. */
function recordedGoals(players: readonly { name: string; goals?: number }[]): number {
  const goals = new Map<string, number>();
  for (const player of players) {
    const name = normalizeChemistryName(player.name);
    if (name && validNumber(player.goals)) goals.set(name, Math.max(goals.get(name) ?? 0, player.goals));
  }
  return [...goals.values()].reduce((sum, value) => sum + value, 0);
}

function preference(a: ChemistryGame, b: ChemistryGame): number {
  const sourceRank = (game: ChemistryGame) => game.source === "full" ? 2 : game.source === "local" ? 1 : 0;
  const detail = (game: ChemistryGame) => Number(Boolean(game.date)) + Number(Boolean(game.opponent));
  return sourceRank(b) - sourceRank(a) || b.skaters.length - a.skaters.length ||
    detail(b) - detail(a) || lexical(JSON.stringify(a), JSON.stringify(b));
}

/** Choose one WHOLE record per ID. Never union two disjoint player lists, even
 * for the same ID. Full records win; within a source prefer more unique skaters,
 * then metadata completeness, then a stable lexical tie-break (not input order).
 * Conflicting outcomes at the selected source priority are quarantined. */
function canonicalGames(games: readonly ChemistryGame[]): ChemistryGame[] {
  const byId = new Map<string, ChemistryGame>();
  const outcomes = new Map<string, Map<string, Set<string>>>();
  for (const game of games) {
    if (!game.id.trim() || !validNumber(game.goalsFor) || !validNumber(game.goalsAgainst) ||
        !validNumber(game.timestamp)) continue;
    const candidate: ChemistryGame = {
      id: game.id.trim(), date: game.date.trim(), timestamp: game.timestamp,
      opponent: game.opponent.trim(), goalsFor: game.goalsFor, goalsAgainst: game.goalsAgainst,
      skaters: uniqueNames(game.skaters),
      ...(game.source ? { source: game.source } : {}),
      ...(game.coverage ? { coverage: game.coverage } : {}),
    };
    const source = candidate.source ?? "unknown";
    const sources = outcomes.get(candidate.id) ?? new Map<string, Set<string>>();
    const scores = sources.get(source) ?? new Set<string>();
    scores.add(`${candidate.goalsFor}:${candidate.goalsAgainst}`);
    sources.set(source, scores);
    outcomes.set(candidate.id, sources);
    const previous = byId.get(candidate.id);
    if (!previous || preference(candidate, previous) < 0) byId.set(candidate.id, candidate);
  }
  // Equal-authority contradictory results have no verified winner. Quarantine
  // that ID rather than allowing serialized order to decide a club outcome.
  return [...byId.values()].filter(game =>
    (outcomes.get(game.id)?.get(game.source ?? "unknown")?.size ?? 0) === 1,
  ).sort((a, b) => b.timestamp - a.timestamp || lexical(a.id, b.id));
}

/** Pure adapter: no fetching, environment access or archive mutation. Pass [] as
 * fallbackLocal to disable the bundled 75-game partial archive. Invalid full
 * scores/inconsistent records may fall back to an independently valid record,
 * but explicit forfeits/private games veto the ID across both sources.
 * Local players are never attached to a different/full game to invent a lineup. */
export function buildChemistryGames(
  fullMatches: readonly ChemistryMatchInput[],
  fallbackLocal: readonly ChemistryLocalGame[] = localGames,
): ChemistryGame[] {
  return buildChemistryDataset(fullMatches, fallbackLocal).games;
}

export interface ChemistryDataset {
  games: ChemistryGame[];
  /** Unique nonblank source IDs, not source rows or full-season club totals. */
  total: number;
  /** Unique source IDs with no eligible record, not the number of duplicate rows. */
  excluded: number;
}

export function buildChemistryDataset(
  fullMatches: readonly ChemistryMatchInput[],
  fallbackLocal: readonly ChemistryLocalGame[] = localGames,
): ChemistryDataset {
  const records = [...fullMatches, ...fallbackLocal];
  const total = new Set(records.map(game => game.id.trim()).filter(Boolean)).size;
  const blocked = new Set(records.filter(excludedType).map(game => game.id.trim()));
  const candidates: ChemistryGame[] = [];
  for (const [source, records] of [["full", fullMatches], ["local", fallbackLocal]] as const) {
    for (const game of records) {
      if (blocked.has(game.id.trim()) || !validNumber(game.scoreUs) || !validNumber(game.scoreThem)) continue;
      const players = (game.players ?? []).filter(player =>
        (source === "full" ? player.isOurPlayer === true && player.isGoalie === false : player.isOurPlayer !== false) &&
        !goalie(player));
      if (recordedGoals(players) > game.scoreUs) continue;
      candidates.push({
        id: game.id, date: game.date, timestamp: game.timestamp, opponent: game.opponent,
        goalsFor: game.scoreUs, goalsAgainst: game.scoreThem, skaters: players.map(player => player.name),
        source, coverage: source === "full" ? "recorded-roster" : "partial-scoresheet",
      });
    }
  }
  const games = canonicalGames(candidates);
  return { games, total, excluded: total - games.length };
}

export function getAvailableSkaters(games: readonly ChemistryGame[]): string[] {
  return uniqueNames(canonicalGames(games).flatMap(game => game.skaters));
}

function supportedSize(size: number): size is ChemistrySize {
  return size === 2 || size === 3 || size === 5;
}

function evaluate(games: readonly ChemistryGame[], players: string[], allowSingle = false): ChemistryEvaluation {
  // Empty/unsupported selections must not match every archived game vacuously.
  const matchingGames = (supportedSize(players.length) || (allowSingle && players.length === 1))
    ? games.filter(game => players.every(player => game.skaters.includes(player))) : [];
  const stats: ChemistryStats = {
    games: matchingGames.length, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0,
    winPct: null, gfPerGame: null, gaPerGame: null, gdPerGame: null, wilsonLowerBound: null,
  };
  for (const game of matchingGames) {
    stats.goalsFor += game.goalsFor;
    stats.goalsAgainst += game.goalsAgainst;
    if (game.goalsFor > game.goalsAgainst) stats.wins++;
    else if (game.goalsFor < game.goalsAgainst) stats.losses++;
    else stats.draws++;
  }
  if (stats.games) {
    const n = stats.games;
    const p = stats.wins / n;
    const z2 = 1.96 ** 2;
    stats.winPct = 100 * p;
    stats.gfPerGame = stats.goalsFor / n;
    stats.gaPerGame = stats.goalsAgainst / n;
    stats.gdPerGame = (stats.goalsFor - stats.goalsAgainst) / n;
    stats.wilsonLowerBound = Math.max(0,
      (p + z2 / (2 * n) - 1.96 * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n));
  }
  return { players, stats, matchingGames };
}

export function evaluateChemistrySelection(
  games: readonly ChemistryGame[], selectedPlayers: readonly string[],
): ChemistryEvaluation {
  return evaluate(canonicalGames(games), uniqueNames(selectedPlayers));
}

/** Single-skater coappearances for goalie-to-skater analysis. This deliberately
 * does not relax the full-line evaluator's 2/3/5-player selection contract. */
export function evaluateSkaterAppearances(
  games: readonly ChemistryGame[], playerId: string,
): ChemistryEvaluation {
  return evaluate(canonicalGames(games), uniqueNames([playerId]), true);
}

/** Exhaustive unique combinations of exactly 2, 3 or 5 available observed skaters.
 * No zero-sample recommendations, even with minGames=0. Fractional minima round up;
 * invalid minima use 3. Ties: shared sample descending, then canonical names. */
export function recommendChemistryLines(
  games: readonly ChemistryGame[], size: ChemistrySize,
  options: ChemistryRecommendationOptions = {},
): ChemistryEvaluation[] {
  if (!supportedSize(size)) return [];
  const canonical = canonicalGames(games);
  const observed = new Set(canonical.flatMap(game => game.skaters));
  const pool = uniqueNames(options.availablePlayers ?? [...observed]).filter(player => observed.has(player));
  const minGames = validNumber(options.minGames) ? Math.max(1, Math.ceil(options.minGames)) : 3;
  const results: ChemistryEvaluation[] = [];
  function combinations(start: number, selected: string[]) {
    if (selected.length === size) {
      const result = evaluate(canonical, selected);
      if (result.stats.games >= minGames) results.push(result);
      return;
    }
    for (let index = start; index <= pool.length - (size - selected.length); index++) {
      combinations(index + 1, [...selected, pool[index]]);
    }
  }
  combinations(0, []);
  const metric: Record<ChemistrySort, "wilsonLowerBound" | "winPct" | "gdPerGame" | "gfPerGame"> = {
    reliable: "wilsonLowerBound", "win-rate": "winPct", "goal-difference": "gdPerGame", attack: "gfPerGame",
  };
  const key = metric[options.sort ?? "reliable"] ?? metric.reliable;
  return results.sort((a, b) => (b.stats[key] ?? -Infinity) - (a.stats[key] ?? -Infinity) ||
    b.stats.games - a.stats.games || lexical(JSON.stringify(a.players), JSON.stringify(b.players)));
}
