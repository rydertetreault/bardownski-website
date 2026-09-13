import type { ClubMatch, ClubMember, MatchPlayerStat } from "./chelstats";
import {
  buildChemistryDataset, evaluateChemistrySelection, evaluateSkaterAppearances, normalizeChemistryName,
  type ChemistryGame,
} from "./line-chemistry";
import { getLineRating, type LineRating } from "./line-ratings";

export interface GoalieProfile {
  id: string;
  name: string;
  /** Selected-season goalie GP; observed eligible appearances if member GP is unavailable. */
  games: number;
  /** Season member totals only. Observed appearances do not fill missing season totals. */
  wins: number | null;
  /** 0–100, recomputed from valid season saves / shots; never the rounded source rate. */
  savePct: number | null;
  /** Valid source season GAA only; never inferred without ice time. */
  gaa: number | null;
  shutouts: number | null;
  saves: number | null;
  shotsAgainst: number | null;
}

export interface GoalieGame extends ChemistryGame {
  goalieId: string;
  saves: number | null;
  shotsAgainst: number | null;
  /** Recorded goalie GA, not the club score (which can include empty-net goals). */
  goalieGoalsAgainst: number | null;
}

export interface GoalieDataset {
  players: GoalieProfile[];
  games: GoalieGame[];
}

export interface GoalieLineEvaluation {
  goalie: GoalieProfile;
  stats: {
    games: number;
    wins: number;
    losses: number;
    draws: number;
    /** 0–100, total saves / total shots. Null unless every shared game has both. */
    savePct: number | null;
    /** Recorded goalie GA / shared games. NOT time-adjusted GAA. */
    goalsAgainstPerGame: number | null;
    /** Null if any shared game's corresponding count is unknown, or there are no games. */
    saves: number | null;
    shotsAgainst: number | null;
    /** 0–100; draws are not wins. */
    winPct: number | null;
  };
  rating: LineRating;
  matchingGames: GoalieGame[];
}

export const GOALIE_METHOD_DESCRIPTION =
  "Selected-season full regular/finals match records only; no partial archive, private games, forfeits or conflicting scores. " +
  "Exactly 2, 3 or 5 distinct skaters must coappear with one verified OUR goalie in the same selected whole record, " +
  "with no goalie/skater identity overlap. Conflicting equally selected goalie identities are excluded, not merged. " +
  "Shared wins/losses/draws and the local getLineRating index describe club outcomes, not goalie influence or a win probability. " +
  "No shared games means no rating or projection. Save percentage is 100 × total saves / total shots, never a mean of percentages. " +
  "Missing or inconsistent counts stay unknown; aggregate fields require complete evidence across the shared sample. " +
  "Recorded goalie goals against per game is NOT GAA: ice time is unavailable and club goals against can include empty-net goals. " +
  "Profile totals and valid GAA come only from supplied season members; impossible zero GAA is unknown. " +
  "Observed-only profiles show recorded appearances with unknown season totals. Callers must supply members and matches from one selected season.";

const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const nameId = (name: string) => typeof name === "string" ? normalizeChemistryName(name) : "";
const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const rate = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const savePercentage = (saves: number | null, shots: number | null): number | null =>
  saves !== null && shots !== null && shots > 0 ? 100 * (saves / shots) : null;
const isGoalie = (player: MatchPlayerStat) => player.isGoalie === true ||
  /^(g|gk|goalie|goaltender|goalkeeper)$/i.test(player.position?.trim() ?? "");

type GoalieCounts = Pick<GoalieGame, "saves" | "shotsAgainst" | "goalieGoalsAgainst">;

/** Invalid individual counts stay null. Contradictory relations cannot establish
 * which count is wrong, so quarantine the line's counts; never repair a field
 * from another or substitute the club score for goalie GA. */
function goalieCounts(sv: unknown, sa: unknown, ga: unknown, clubGA?: number): GoalieCounts {
  const saves = count(sv), shotsAgainst = count(sa), goalieGoalsAgainst = count(ga);
  if ((saves !== null && shotsAgainst !== null && saves > shotsAgainst) ||
      (goalieGoalsAgainst !== null && shotsAgainst !== null && goalieGoalsAgainst > shotsAgainst) ||
      (saves !== null && shotsAgainst !== null && goalieGoalsAgainst !== null &&
        saves + goalieGoalsAgainst !== shotsAgainst) ||
      (clubGA !== undefined && ((goalieGoalsAgainst !== null && goalieGoalsAgainst > clubGA) ||
        (saves !== null && shotsAgainst !== null && shotsAgainst - saves > clubGA)))) {
    return { saves: null, shotsAgainst: null, goalieGoalsAgainst: null };
  }
  return { saves, shotsAgainst, goalieGoalsAgainst };
}

/** Equal chemistry projections may hide different goalie rows. Require one
 * identity across ALL such rows; common fields can survive, but missing or
 * conflicting fields cannot be filled from a complementary duplicate row. */
function agreedCounts(rows: readonly GoalieCounts[]): GoalieCounts {
  const agreed = (key: keyof GoalieCounts) => rows.length && rows.every(row => row[key] === rows[0][key])
    ? rows[0][key] : null;
  return { saves: agreed("saves"), shotsAgainst: agreed("shotsAgainst"), goalieGoalsAgainst: agreed("goalieGoalsAgainst") };
}

function recordedGoalie(match: ClubMatch, game: ChemistryGame): { id: string; counts: GoalieCounts } | null {
  if ((match.matchType !== "regular" && match.matchType !== "finals") ||
      count(game.goalsFor) === null || count(game.goalsAgainst) === null) return null;
  const ours = (match.players ?? []).filter(player => player.isOurPlayer === true);
  const goalies = ours.filter(isGoalie);
  if (!goalies.length) return null;
  const ids = new Set(goalies.map(player => nameId(player.name)));
  if (ids.size !== 1 || ids.has("")) return null;
  const id = [...ids][0];
  if (game.skaters.includes(id) || ours.some(player => !isGoalie(player) && nameId(player.name) === id)) return null;
  return {
    id,
    counts: agreedCounts(goalies.map(player =>
      goalieCounts(player.saves, player.shotsAgainst, player.goalsAgainst, game.goalsAgainst))),
  };
}

function unknownProfile(id: string, games: number): GoalieProfile {
  return { id, name: id, games, wins: null, savePct: null, gaa: null, shutouts: null, saves: null, shotsAgainst: null };
}

function memberProfile(member: ClubMember, id: string): GoalieProfile {
  const games = count(member.goalieGP)!; // Called only for positive, valid goalie GP.
  const { saves, shotsAgainst } = goalieCounts(member.goalieSaves, member.goalieShots, null);
  const wins = count(member.goalieWins), shutouts = count(member.shutouts);
  let gaa = rate(member.gaa);
  // Frozen minor-goalie totals can have placeholder GAA=0 despite allowed goals.
  // Without time data, retain a zero only when valid totals support no allowed goals.
  if (gaa === 0 && (saves === null || shotsAgainst === null || saves !== shotsAgainst)) gaa = null;
  return {
    id, name: id, games, wins: wins !== null && wins <= games ? wins : null,
    savePct: savePercentage(saves, shotsAgainst), gaa,
    shutouts: shutouts !== null && shutouts <= games ? shutouts : null, saves, shotsAgainst,
  };
}

/** Pure selected-season adapter. The caller supplies season isolation: neither
 * input has a season key. [] explicitly disables chemistry's bundled archive.
 * Compare canonical SINGLE-record projections to the selected whole game rather
 * than looking up a goalie by ID alone or unioning duplicate rosters. */
export function buildGoalieDataset(
  members: readonly ClubMember[], matches: readonly ClubMatch[],
): GoalieDataset {
  const selected = buildChemistryDataset(matches, []).games;
  const originals = new Map<string, { match: ClubMatch; game: ChemistryGame }[]>();
  for (const match of matches) {
    const game = buildChemistryDataset([match], []).games[0];
    if (!game) continue;
    const key = JSON.stringify(game);
    const rows = originals.get(key) ?? [];
    rows.push({ match, game });
    originals.set(key, rows);
  }
  const games: GoalieGame[] = [];
  for (const game of selected) {
    const rows = (originals.get(JSON.stringify(game)) ?? []).map(row => recordedGoalie(row.match, row.game));
    const first = rows[0];
    if (!first || rows.some(row => row === null || row.id !== first.id)) continue;
    games.push({ ...game, goalieId: first.id, ...agreedCounts(rows.map(row => row!.counts)) });
  }

  const observed = new Map<string, number>();
  for (const game of games) observed.set(game.goalieId, (observed.get(game.goalieId) ?? 0) + 1);
  const profiles = new Map<string, GoalieProfile[]>();
  for (const member of members) {
    const id = nameId(member.username);
    if (!id || (count(member.goalieGP) ?? 0) <= 0) continue;
    const rows = profiles.get(id) ?? [];
    rows.push(memberProfile(member, id));
    profiles.set(id, rows);
  }
  const players = [...new Set([...profiles.keys(), ...observed.keys()])].sort(lexical).map(id => {
    const rows = profiles.get(id);
    // Conflicting member totals are not summed or chosen by input order.
    return rows?.length && rows.every(row => JSON.stringify(row) === JSON.stringify(rows[0]))
      ? rows[0] : unknownProfile(id, observed.get(id) ?? 0);
  });
  return { players, games };
}

function completeTotal(games: readonly GoalieGame[], key: keyof GoalieCounts): number | null {
  if (!games.length) return null;
  let total = 0;
  for (const game of games) {
    const value = count(game[key]);
    if (value === null) return null;
    total += value;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}

/** Evaluate a built dataset, not a projected roster. A complete nonblank valid-
 * size selection with no coappearances still returns an unrated zero sample.
 * Unknown goalie IDs, blanks, duplicate aliases and same-human roles are invalid. */
function evaluateGoalieSelection(
  dataset: GoalieDataset, skaters: readonly string[], goalieId: string, allowSingle = false,
): GoalieLineEvaluation | null {
  if (![2, 3, 5].includes(skaters.length) && !(allowSingle && skaters.length === 1)) return null;
  const selected = skaters.map(nameId), id = nameId(goalieId);
  if (!id || selected.some(name => !name || name === id) || new Set(selected).size !== selected.length) return null;
  const goalie = dataset.players.find(player => nameId(player.id) === id);
  if (!goalie) return null;
  const appearances = (games: readonly ChemistryGame[]) => allowSingle
    ? evaluateSkaterAppearances(games, selected[0])
    : evaluateChemistrySelection(games, selected);
  const originals = new Map<string, GoalieGame[]>();
  for (const game of dataset.games) {
    const projected = appearances([game]).matchingGames[0];
    if (!projected) continue;
    const key = JSON.stringify(projected);
    const rows = originals.get(key) ?? [];
    rows.push(game);
    originals.set(key, rows);
  }
  const matchingGames: GoalieGame[] = [];
  // Select whole records BEFORE filtering by goalie. Discarded or conflicting
  // same-ID records must not supply a different goalie or stat line here either.
  for (const game of appearances(dataset.games).matchingGames) {
    const rows = originals.get(JSON.stringify(game)) ?? [];
    if (!rows.length || rows.some(row => nameId(row.goalieId) !== id ||
        row.source === "local" || row.coverage === "partial-scoresheet" ||
        row.skaters.some(name => nameId(name) === id)) ||
        count(game.goalsFor) === null || count(game.goalsAgainst) === null) continue;
    matchingGames.push({ ...game, goalieId: id, ...agreedCounts(rows.map(row =>
      goalieCounts(row.saves, row.shotsAgainst, row.goalieGoalsAgainst, game.goalsAgainst))) });
  }
  const evaluation = appearances(matchingGames);
  const { games, wins, losses, draws, winPct } = evaluation.stats;
  const saves = completeTotal(matchingGames, "saves"), shotsAgainst = completeTotal(matchingGames, "shotsAgainst");
  const goalsAgainst = completeTotal(matchingGames, "goalieGoalsAgainst");
  return {
    goalie,
    stats: { games, wins, losses, draws, savePct: savePercentage(saves, shotsAgainst),
      goalsAgainstPerGame: games && goalsAgainst !== null ? goalsAgainst / games : null,
      saves, shotsAgainst, winPct },
    rating: getLineRating(evaluation.stats), matchingGames,
  };
}


/** Full-unit result requires the entire 2/3/5-skater selection. */
export function evaluateGoalieLine(
  dataset: GoalieDataset, skaters: readonly string[], goalieId: string,
): GoalieLineEvaluation | null {
  return evaluateGoalieSelection(dataset, skaters, goalieId);
}

export interface GoaliePairEvaluation extends GoalieLineEvaluation {
  skaterId: string;
}

export const GOALIE_PAIR_METHOD_DESCRIPTION =
  "Compatibility is a local shared-performance index for one goalie and one skater, not a win probability or a claim of isolated influence. " +
  "Each pairing uses games where that skater and goalie played together; it does not require the other selected skaters. " +
  "Raw = 100 × [0.5 × (wins + draws / 2) / games + 0.5 × club goals for / (club goals for + against)]. " +
  "The percentage is round(50 + (raw − 50) × games / (games + 5)); a goalless sample uses 50% goal share. " +
  "Grades: A ≥80, B ≥65, C ≥45, D ≥30, otherwise F. Pairings with the same shared results can have the same score. " +
  "No shared games means not rated, never zero compatibility. Save % is total saves / shots, and GA/game uses recorded goalie goals allowed. " +
  "Pair samples can overlap and are never summed into a unit record. Every pairing stays within the selected season; other teammates and opponents also affect results.";

/** Goalie + ONE skater. Useful before a full line exists and independently of
 * its other picks. No fabricated skater, single-player line or season fallback. */
export function evaluateGoaliePair(
  dataset: GoalieDataset, skaterId: string, goalieId: string,
): GoaliePairEvaluation | null {
  const result = evaluateGoalieSelection(dataset, [skaterId], goalieId, true);
  return result ? { ...result, skaterId: nameId(skaterId) } : null;
}
