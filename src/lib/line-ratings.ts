import type { ClubMember } from "./chelstats";
import { normalizeChemistryName, type ChemistryStats } from "./line-chemistry";

export type LineRating = { percentage: number | null; grade: string | null };
export type PlayerPerformanceStats = Pick<ClubMember,
  "gamesPlayed" | "goals" | "assists" | "points" | "plusMinus"
>;
export type PlayerPerformanceRating = { rating: number | null; grade: string | null };
export type SeasonSkaterStats = Readonly<Pick<ClubMember, "gamesPlayed" | "goals" | "assists" | "points">>;
/** All inputs must belong to the selected season. No history or grade strings. */
export type ProjectedLineProfile = {
  name: string;
  seasonStats: SeasonSkaterStats | null;
  overallRating: number | null;
  performanceRating: number | null;
};

/** Label the result “Projected fit”, never observed/shared chemistry. */
export const PROJECTED_LINE_RATING_DESCRIPTION =
  "Local player-based projected fit, not Chelstats' score, observed chemistry or a win probability. " +
  "Requires 2, 3 or 5 distinct players, each with valid selected-season skater GP > 0 and goals + assists = points. " +
  "Player score uses valid supplied OVR first, then available Lab performance rating; otherwise offense-only " +
  "score = round(50 + (100 × PPG / (PPG + 2) − 50) × GP / (GP + 5)). " +
  "PPG is recomputed from points / skater GP. Scoring share = goals / (goals + assists); " +
  "pair complementarity = absolute difference in scoring shares × GP1 / (GP1 + 5) × GP2 / (GP2 + 5), " +
  "or zero if either player has no points. Fit = round(clamp(mean player score + 10 × mean pair complementarity, 0, 100)). " +
  "This rewards differing goal/assist roles modestly; it does not establish actual passing links, defensive fit or shared history. " +
  "The 2-PPG reference, five-game damping, ten-point maximum bonus and A ≥80, B ≥65, C ≥45, D ≥30, F <30 bands " +
  "are transparent local choices, not league-calibrated. Supplied OVR can include mixed-role performance. " +
  "Unknown players or invalid season stats leave the entire selection unrated; no subset averaging, " +
  "grade-string inference, optional zero-filled defensive stats or cross-season fallback. No shared games are required.";

const LAB_GRADE_DESCRIPTION = "Lab bands: A ≥80, B ≥65, C ≥45, D ≥30, F <30.";

/** Display this alongside the percentage; it is not an upstream chemistry rating. */
export const LINE_RATING_DESCRIPTION =
  "Local descriptive chemistry index, not Chelstats' formula or a win probability. " +
  "Raw score = 100 × [0.5 × (wins + 0.5 × draws) / shared games + " +
  "0.5 × club goals for / (club goals for + against)]. A recorded goalless sample has 50% goal share. " +
  "Index = round(50 + (raw score − 50) × games / (games + 5)); five is a local small-sample damping choice, not extra games. " +
  LAB_GRADE_DESCRIPTION + " No shared games or invalid totals means unrated. " +
  "Use only the selected season. Club outcomes during recorded coappearances are not on-ice line goals; " +
  "opponents, other teammates and missing rosters affect the sample.";

/** A fallback grade must be labelled “Lab grade”, never “Chelstats OVR”. */
export const PLAYER_RATING_DESCRIPTION =
  "OVR is the supplied season member rating, not a reconstructed or necessarily skater-only rating. " +
  "Its local letter bands are A ≥90, B ≥80, C ≥70, D ≥60, F <60; missing/zero-filled OVR is unrated, not F. " +
  "When current-season OVR is unavailable, Lab performance uses skater stats only: " +
  "production = PPG / (PPG + 2); goal balance = clamp(0.5 + plus-minus per game / 4, 0, 1). " +
  "Raw score = 100 × (0.6 × production + 0.4 × goal balance); " +
  "Lab rating = round(50 + (raw score − 50) × skater GP / (skater GP + 5)). " +
  LAB_GRADE_DESCRIPTION + " These local weights and reference points are not league-calibrated: " +
  "this is an offense-leaning description, not an all-around skill or goalie grade. " +
  "Small samples are dampened, not made reliable. Zero skater GP or invalid totals means no Lab grade; " +
  "no archived stats, missing playstyles or optional zero-filled categories supply a fallback.";

/* Research: https://chelstats.app/static/js/main.1a853905.js (public bundle).
 * Its qme/Mme functions use default weights win:40, production:40, style:20,
 * positional pair production/defensive plays and style deviations. Actual pair
 * results are blended toward player-stat projections with n/(n+2); zero-shared-
 * game projections are allowed upstream. jme labels >=75 Elite, >=60 Strong,
 * >=40 Average, >=25 Weak, otherwise Poor (not letter grades).
 * Its offense Eme still adds 15% of capped defensive plays/12 to capped pair
 * points/4.5; projection qme also needs player winPct and style baselines.
 * Optional defensive categories and archive winPct may be zero-filled, so that
 * public projection is not reproducible here without pretending unknown inputs
 * are evidence. ChemistryStats has CLUB goals and W/L/draw only. None of the
 * local formulas claim to reproduce that model. No category grades are inferred.
 * ClubMember retains only overallRating/playstyle from the rating object;
 * nhl27-api's optional rating and chelstats' transform both default missing OVR
 * to 0. chelstats-frozen documents unrecovered playstyle="" and winPct=0.
 */

function count(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function labGrade(score: number): string {
  return score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : score >= 30 ? "D" : "F";
}

function dampenedScore(raw: number, games: number): number {
  return Math.round(clamp(50 + (raw - 50) * (games / (games + 5)), 0, 100));
}

/** Pure, rounded 0–100 descriptive index. Recomputes from totals, never from
 * cached winPct, rates or Wilson bounds. No sample/invalid counts return nulls.
 * The caller must aggregate only one season; stats carry no season identity. */
export function getLineRating(stats: ChemistryStats): LineRating {
  const { games, wins, losses, draws, goalsFor, goalsAgainst } = stats;
  const totalGoals = goalsFor + goalsAgainst;
  if (![games, wins, losses, draws, goalsFor, goalsAgainst, totalGoals].every(count) ||
      games === 0 || wins + losses + draws !== games ||
      goalsFor < wins || goalsAgainst < losses ||
      (losses === 0 && goalsFor - goalsAgainst < wins) ||
      (wins === 0 && goalsAgainst - goalsFor < losses)) {
    return { percentage: null, grade: null };
  }
  const resultShare = (wins + draws / 2) / games;
  const goalShare = totalGoals === 0 ? 0.5 : goalsFor / totalGoals;
  const percentage = dampenedScore(100 * (0.5 * resultShare + 0.5 * goalShare), games);
  return { percentage, grade: labGrade(percentage) };
}

/** Local letter mapping of an available upstream OVR, not an upstream grade.
 * The legacy adapters use 0 for unknown OVR, so only finite (0, 100] is usable.
 * No clamping/coercion: a missing, malformed or out-of-range rating is unknown. */
export function getPlayerGrade(rating: number | null): string | null {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0 || rating > 100) return null;
  return rating >= 90 ? "A" : rating >= 80 ? "B" : rating >= 70 ? "C" : rating >= 60 ? "D" : "F";
}

/** Local fallback, NOT an upstream OVR. Requires a real skater sample with
 * consistent core totals. GP comes from skater games, never goalie GP or the
 * partial shared-game archive. Ignores rounded PPG and optional ancillary stats.
 * Adapter enables this only for current-season members with unavailable OVR. */
export function getPlayerPerformanceRating(stats: PlayerPerformanceStats): PlayerPerformanceRating {
  const { gamesPlayed, goals, assists, points, plusMinus } = stats;
  if (![gamesPlayed, goals, assists, points].every(count) || gamesPlayed === 0 ||
      !Number.isSafeInteger(plusMinus) || goals + assists !== points) {
    return { rating: null, grade: null };
  }
  const ppg = points / gamesPlayed;
  const production = ppg / (ppg + 2);
  const goalBalance = clamp(0.5 + (plusMinus / gamesPlayed) / 4, 0, 1);
  const rating = dampenedScore(100 * (0.6 * production + 0.4 * goalBalance), gamesPlayed);
  return { rating, grade: labGrade(rating) };
}


/** Independent of getLineRating's no-sample contract. Every player needs real
 * season totals, even with an OVR. Callers must not mix seasons; profiles do not
 * carry season identity. Sorting a copy makes all pick orders deterministic. */
export function getProjectedLineRating(profiles: readonly ProjectedLineProfile[]): LineRating {
  const unrated: LineRating = { percentage: null, grade: null };
  if (![2, 3, 5].includes(profiles.length)) return unrated;
  const seen = new Set<string>();
  const inputs: { name: string; score: number; share: number | null; reliability: number }[] = [];
  for (const profile of profiles) {
    if (!profile || typeof profile.name !== "string") return unrated;
    const name = normalizeChemistryName(profile.name);
    if (!name || seen.has(name)) return unrated;
    seen.add(name);
    const stats = profile.seasonStats;
    if (!stats) return unrated;
    const { gamesPlayed, goals, assists, points } = stats;
    if (![gamesPlayed, goals, assists, points].every(count) || gamesPlayed === 0 || goals + assists !== points) return unrated;
    const ppg = points / gamesPlayed;
    const local = profile.performanceRating;
    const score = getPlayerGrade(profile.overallRating) !== null ? profile.overallRating!
      : typeof local === "number" && Number.isFinite(local) && local >= 0 && local <= 100 ? local
      : dampenedScore(100 * ppg / (ppg + 2), gamesPlayed);
    inputs.push({ name, score, share: points === 0 ? null : goals / points, reliability: gamesPlayed / (gamesPlayed + 5) });
  }
  inputs.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  let complementarity = 0;
  let pairs = 0;
  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      const a = inputs[i], b = inputs[j];
      pairs++;
      if (a.share !== null && b.share !== null) {
        complementarity += Math.abs(a.share - b.share) * a.reliability * b.reliability;
      }
    }
  }
  const mean = inputs.reduce((sum, player) => sum + player.score, 0) / inputs.length;
  const percentage = Math.round(clamp(mean + 10 * complementarity / pairs, 0, 100));
  return { percentage, grade: labGrade(percentage) };
}
