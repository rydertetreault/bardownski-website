import type { ClubMember } from "@/lib/chelstats";
import type { GoalieDataset } from "@/lib/goalie-lines";
import { normalizeChemistryName, type ChemistryGame } from "@/lib/line-chemistry";
import { getPlayerGrade, getPlayerPerformanceRating, type SeasonSkaterStats } from "@/lib/line-ratings";

export type LinePlayer = {
  id: string;
  name: string;
  position: string;
  /** Available source member OVR only; never filled with a local score. May be
   * a mixed-role member rating, not a verified skater-only rating. */
  overallRating: number | null;
  /** Local letter mapping, not a grade supplied by Chelstats. */
  grade: string | null;
  /** Label lab-performance as “Lab grade”, not “OVR”. */
  gradeSource: "overall-rating" | "lab-performance" | null;
  /** Current-season local fallback; separate from the real upstream OVR. */
  performanceRating: number | null;
  /** Valid selected-season skater totals, current OR archive. Rates are derived
   * from these, not rounded PPG or optional zero-filled defensive categories. */
  seasonStats: SeasonSkaterStats | null;
};
export type LineDataset = {
  /** Club, platform, title and season identity; also isolates browser drafts. */
  id: string;
  season: string;
  kind: "current" | "archive";
  totalGames: number | null;
  games: ChemistryGame[];
  players: LinePlayer[];
  goalies?: GoalieDataset;
  sourceTotal: number;
  excluded: number;
};

/** Keep the archive's roster intact. Current goalie-only members need recorded
 * skater GP or an observed skater appearance, never an inherited archive role.
 * Members and games must belong to the selected season; there are no lookups or
 * archive fallbacks here. An appearance alone cannot supply season rating data. */
export function buildLinePlayers(
  members: readonly ClubMember[], games: readonly ChemistryGame[], kind: LineDataset["kind"],
): LinePlayer[] {
  const players = new Map<string, LinePlayer>();
  const observed = new Set(games.flatMap(game => game.skaters));
  for (const member of members) {
    const id = normalizeChemistryName(member.username);
    if (!id || (kind === "current" && member.gamesPlayed <= 0 && !observed.has(id))) continue;
    const hasSkaterSample = Number.isSafeInteger(member.gamesPlayed) && member.gamesPlayed > 0;
    const { gamesPlayed, goals, assists, points } = member;
    const seasonStats = hasSkaterSample && [goals, assists, points].every(value => Number.isSafeInteger(value) && value >= 0)
      && goals + assists === points ? { gamesPlayed, goals, assists, points } : null;
    const sourceGrade = hasSkaterSample ? getPlayerGrade(member.overallRating) : null;
    const overallRating = sourceGrade === null ? null : member.overallRating;
    // Archived optional fields can be recovered/neutral placeholders. Preserve
    // its real OVR when available, but do not synthesize a historical fallback.
    const performance = kind === "current" && overallRating === null
      ? getPlayerPerformanceRating(member) : null;
    const grade = sourceGrade ?? performance?.grade ?? null;
    players.set(id, {
      id, name: id, position: member.position, overallRating, grade,
      gradeSource: sourceGrade !== null ? "overall-rating" : grade !== null ? "lab-performance" : null,
      performanceRating: performance?.rating ?? null, seasonStats,
    });
  }
  for (const id of observed) {
    if (id && !players.has(id)) players.set(id, {
      id, name: id, position: "Unrecorded", overallRating: null, grade: null,
      gradeSource: null, performanceRating: null, seasonStats: null,
    });
  }
  return [...players.values()];
}

export function lineDraftKey(dataset: Pick<LineDataset, "id" | "season">): string {
  return `bardownski-line-draft-v2:${encodeURIComponent(dataset.id)}:${encodeURIComponent(dataset.season)}`;
}
