import type { Match } from "@/types";

export type MatchSeason = "2026-2027" | "2025-2026";
export type MatchFilter = "all" | "W" | "L" | "upcoming";

export const PREVIOUS_SEASON_WIN_STREAK = 24;

/** Newest first, retaining the newest occurrence of each ID (first on ties). */
export function sortMatches(matches: Match[]): Match[] {
  const seen = new Set<string>();
  return [...matches]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((match) => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      return true;
    });
}

export function matchDetailHref(match: Match, season: MatchSeason): string | null {
  if (match.status !== "final" || match.forfeit) return null;
  return `/matches/${encodeURIComponent(match.id)}?season=${season}`;
}

function validScore(score: unknown): score is number {
  return typeof score === "number" && Number.isFinite(score) && score >= 0;
}

/** Match the board's W/L convention: a valid final that isn't a win is L. */
function result(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    !validScore(match.scoreUs) ||
    !validScore(match.scoreThem)
  ) {
    return null;
  }
  return match.scoreUs > match.scoreThem ? "W" : "L";
}

/** Literal opponent search and result filtering, preserving the supplied order. */
export function filterMatches(
  matches: Match[],
  filter: MatchFilter,
  query: string,
): Match[] {
  const search = query.toLowerCase();
  return matches.filter((match) => {
    if (!match.opponent.toLowerCase().includes(search)) return false;
    if (filter === "all") return true;
    if (filter === "upcoming") return match.status === "upcoming";
    return result(match) === filter;
  });
}

/**
 * Consecutive wins in the supplied season's available competitive finals only.
 * Unknown finals interrupt the run rather than joining wins on either side.
 * The previous-season benchmark is intentionally not used as a seed.
 */
export function currentWinRun(matches: Match[]): number | null {
  const finals = sortMatches(matches).filter(
    (match) => match.status === "final" && match.matchType !== "private",
  );
  if (finals.length === 0 || result(finals[0]) === null) return null;

  let wins = 0;
  for (const match of finals) {
    if (result(match) !== "W") break;
    wins += 1;
  }
  return wins;
}
