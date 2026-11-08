import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getAllMatchesForRecords } from "@/lib/match-history";
import { getHockeySeason } from "@/lib/hockey-season";
import { buildRecordsData, liveMembersFrom, type ArchiveMatch, type RecordsData } from "./records-data";

/** The one source for club records: the Records page and record-break emails both use it. */
export async function loadRecordsData(): Promise<RecordsData> {
  const [archive, season] = await Promise.all([getAllMatchesForRecords(FROZEN_CHELSTATS), getHockeySeason()]);
  return buildRecordsData([
    { key: "2025", label: "2025–2026", param: "2025-2026", played: 366, matches: archive as unknown as ArchiveMatch[],
      roster: FROZEN_CHELSTATS.members.map(m => m.username) },
    { key: "2026", label: "2026–2027", param: "2026-2027", played: season.coverage.totalGames, matches: season.matches as unknown as ArchiveMatch[],
      roster: (season.data?.members ?? []).map(m => m.username) },
  ], "2026", {
    liveMembers: liveMembersFrom(season.data?.members as unknown as Record<string, unknown>[] | undefined),
    syncedAt: season.syncedAt,
  });
}
