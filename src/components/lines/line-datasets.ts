import type { ClubMember } from "@/lib/chelstats";
import { normalizeChemistryName, type ChemistryGame } from "@/lib/line-chemistry";

export type LinePlayer = { id: string; name: string; position: string };
export type LineDataset = {
  /** Club, platform, title and season identity; also isolates browser drafts. */
  id: string;
  season: string;
  kind: "current" | "archive";
  totalGames: number | null;
  games: ChemistryGame[];
  players: LinePlayer[];
  sourceTotal: number;
  excluded: number;
};

/** Keep the archive's roster intact. Current goalie-only members need recorded
 * skater GP or an observed skater appearance, never an inherited archive role. */
export function buildLinePlayers(
  members: readonly ClubMember[], games: readonly ChemistryGame[], kind: LineDataset["kind"],
): LinePlayer[] {
  const players = new Map<string, LinePlayer>();
  const observed = new Set(games.flatMap(game => game.skaters));
  for (const member of members) {
    const id = normalizeChemistryName(member.username);
    if (!id || (kind === "current" && member.gamesPlayed <= 0 && !observed.has(id))) continue;
    players.set(id, { id, name: id, position: member.position });
  }
  for (const id of observed) {
    if (id && !players.has(id)) players.set(id, { id, name: id, position: "Unrecorded" });
  }
  return [...players.values()];
}

export function lineDraftKey(dataset: Pick<LineDataset, "id" | "season">): string {
  return `bardownski-line-draft-v2:${encodeURIComponent(dataset.id)}:${encodeURIComponent(dataset.season)}`;
}
