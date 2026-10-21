import type { Metadata } from "next";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getAllMatchesForRecords } from "@/lib/match-history";
import { getHockeySeason } from "@/lib/hockey-season";
import RecordsRedesign from "./redesign/RecordsRedesign";
import { buildRecordsData, liveMembersFrom, type ArchiveMatch } from "./redesign/records-data";

export const metadata: Metadata = {
  title: "Club Records | Bardownski",
  description: "Individual and team records from every logged game, updated as games are played, plus championships and season-by-season achievements.",
};

// Records follow every logged game; refresh on the same cadence as the tracker.
export const revalidate = 300;

export default async function RecordsPage() {
  const [archive, season] = await Promise.all([getAllMatchesForRecords(FROZEN_CHELSTATS), getHockeySeason()]);
  // Only per-game summaries and record entries reach the client, never the raw logs.
  const data = buildRecordsData([
    { key: "2025", label: "2025–2026", param: "2025-2026", played: 366, matches: archive as unknown as ArchiveMatch[],
      roster: FROZEN_CHELSTATS.members.map(m => m.username) },
    { key: "2026", label: "2026–2027", param: "2026-2027", played: season.coverage.totalGames, matches: season.matches as unknown as ArchiveMatch[],
      roster: (season.data?.members ?? []).map(m => m.username) },
  ], "2026", {
    liveMembers: liveMembersFrom(season.data?.members as unknown as Record<string, unknown>[] | undefined),
    syncedAt: season.syncedAt,
  });
  return <RecordsRedesign data={data} />;
}
