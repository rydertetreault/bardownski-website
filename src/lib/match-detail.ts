import { FROZEN_CHELSTATS } from "./chelstats-frozen";
import { getHockeySeason } from "./hockey-season";
import { getAllMatchesForRecords } from "./match-history";
import type { Match } from "@/types";

type MatchSeason = "2026-2027" | "2025-2026";
export type MatchDetail = { match: Match; season: MatchSeason };

/** Explicit season tags never cross-fallback when IDs collide. Untagged legacy
 * URLs retain their current-first, then archive lookup. Archive reads do not
 * accumulate matches or write to the current-season namespace. */
export async function getMatchDetail(id: string, requestedSeason?: MatchSeason): Promise<MatchDetail | null> {
  if (requestedSeason !== "2025-2026") {
    const current = await getHockeySeason();
    const match = current.matches.find(item => item.id === id);
    if (match) return { match, season: "2026-2027" };
    if (requestedSeason === "2026-2027") return null;
  }
  const archive = await getAllMatchesForRecords(FROZEN_CHELSTATS);
  const match = archive.find(item => item.id === id);
  return match ? { match: { ...match, status: "final" }, season: "2025-2026" } : null;
}
