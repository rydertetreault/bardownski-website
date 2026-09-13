import {
  evaluateChemistrySelection,
  normalizeChemistryName,
  recommendChemistryLines,
  type ChemistryEvaluation,
  type ChemistryGame,
  type ChemistrySize,
  type ChemistrySort,
} from "@/lib/line-chemistry";
import { getLineRating, getProjectedLineRating, type LineRating } from "@/lib/line-ratings";
import type { LinePlayer } from "./line-datasets";

export type BuilderSort = ChemistrySort | "chemistry";
export type BuilderLine = ChemistryEvaluation & {
  rating: LineRating;
  ratingSource: "shared" | "projected" | null;
};

/** Shared results take precedence. New combinations use a visibly distinct fit
 * projection only when every chosen player has valid selected-season stats. */
export function evaluateBuilderLine(
  games: readonly ChemistryGame[], ids: readonly string[], players: readonly LinePlayer[],
): BuilderLine {
  const names = ids.map(normalizeChemistryName);
  const valid = [2, 3, 5].includes(names.length) && new Set(names).size === names.length && names.every(Boolean);
  const line = evaluateChemistrySelection(games, valid ? names : []);
  const observed = getLineRating(line.stats);
  if (observed.percentage !== null) return { ...line, rating: observed, ratingSource: "shared" };
  const profiles = names.map(id => players.find(player => player.id === id));
  const projected = valid && profiles.every((player): player is LinePlayer => Boolean(player))
    ? getProjectedLineRating(profiles) : { percentage: null, grade: null };
  return { ...line, rating: projected, ratingSource: projected.percentage === null ? null : "projected" };
}

export function recommendBuilderLines(
  games: readonly ChemistryGame[], players: readonly LinePlayer[], size: ChemistrySize,
  { available, minGames, sort }: { available: readonly string[]; minGames: number; sort: BuilderSort },
): BuilderLine[] {
  if (![2, 3, 5].includes(size)) return [];
  // Positive minima mean actual shared games, never projected appearances.
  if (minGames !== 0) {
    const lines = recommendChemistryLines(games, size, {
      availablePlayers: available, minGames, sort: sort === "chemistry" ? "reliable" : sort,
    }).map(line => ({ ...line, rating: getLineRating(line.stats), ratingSource: "shared" as const }));
    return sort === "chemistry" ? sortLines(lines, sort) : lines;
  }
  const availableIds = new Set(available.map(normalizeChemistryName));
  const pool = [...new Set(players.map(player => player.id))].filter(id => availableIds.has(id)).sort();
  const lines: BuilderLine[] = [];
  function visit(start: number, selected: string[]) {
    if (selected.length === size) {
      const line = evaluateBuilderLine(games, selected, players);
      if (line.rating.percentage !== null) lines.push(line);
      return;
    }
    for (let index = start; index <= pool.length - (size - selected.length); index++) {
      visit(index + 1, [...selected, pool[index]]);
    }
  }
  visit(0, []);
  return sortLines(lines, sort);
}

function sortLines(lines: BuilderLine[], sort: BuilderSort): BuilderLine[] {
  const metric = (line: BuilderLine) => {
    switch (sort) {
      case "reliable": return line.stats.wilsonLowerBound;
      case "win-rate": return line.stats.winPct;
      case "goal-difference": return line.stats.gdPerGame;
      case "attack": return line.stats.gfPerGame;
      default: return line.rating.percentage;
    }
  };
  return lines.sort((a, b) => (metric(b) ?? -Infinity) - (metric(a) ?? -Infinity) ||
    b.stats.games - a.stats.games || a.players.join("|").localeCompare(b.players.join("|"), "en"));
}
