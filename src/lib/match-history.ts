/**
 * Redis-backed match history tracking.
 *
 * The Chelstats API only returns ~5 recent games. Games where opponents
 * forfeit/disconnect may not appear at all, but the club record still
 * counts them. This module detects the gap by comparing the club record
 * delta to newly tracked matches and creates synthetic "forfeit" entries
 * for any unaccounted wins.
 */

import { Redis } from "@upstash/redis";
import type { ClubMatch, ChelstatsData } from "./chelstats";

interface MatchHistoryState {
  lastRecord: { wins: number; losses: number; otl: number };
  trackedMatchIds: string[];
  forfeitEntries: ForfeitEntry[];
}

interface ForfeitEntry {
  id: string;
  timestamp: number;
  date: string;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Sync match history with Redis and return the full match list
 * including synthetic forfeit entries for untracked games.
 */
export async function syncMatchHistory(
  chelstats: ChelstatsData
): Promise<ClubMatch[]> {
  const redis = getRedis();
  if (!redis) return chelstats.matches;

  try {
    const state = await redis.get<MatchHistoryState>("match-history");
    const currentRecord = {
      wins: chelstats.clubStats.wins,
      losses: chelstats.clubStats.losses,
      otl: chelstats.clubStats.otl,
    };
    const currentMatchIds = chelstats.matches.map((m) => m.id);

    // First run: initialize state, no forfeits to detect yet
    if (!state) {
      await redis.set("match-history", {
        lastRecord: currentRecord,
        trackedMatchIds: currentMatchIds,
        forfeitEntries: [],
      } satisfies MatchHistoryState);
      return chelstats.matches;
    }

    // Detect new season (total games decreased) - reset tracking
    const currentTotal =
      currentRecord.wins + currentRecord.losses + currentRecord.otl;
    const storedTotal =
      state.lastRecord.wins + state.lastRecord.losses + state.lastRecord.otl;
    if (currentTotal < storedTotal) {
      await redis.set("match-history", {
        lastRecord: currentRecord,
        trackedMatchIds: currentMatchIds,
        forfeitEntries: [],
      } satisfies MatchHistoryState);
      return chelstats.matches;
    }

    // No record change - return existing forfeits without updating
    if (currentTotal === storedTotal) {
      return mergeForfeits(chelstats.matches, state.forfeitEntries);
    }

    // Find new matches we haven't tracked before
    const trackedSet = new Set(state.trackedMatchIds);
    const newMatchIds = currentMatchIds.filter((id) => !trackedSet.has(id));

    // Count wins among new tracked matches
    let newTrackedWins = 0;
    for (const id of newMatchIds) {
      const match = chelstats.matches.find((m) => m.id === id);
      if (match && match.scoreUs > match.scoreThem) newTrackedWins++;
    }

    // How many wins increased in the record vs what we tracked
    const deltaWins = currentRecord.wins - state.lastRecord.wins;
    const untrackedWins = Math.max(0, deltaWins - newTrackedWins);

    // Create forfeit entries for untracked wins
    const newForfeits: ForfeitEntry[] = [];
    const latestTimestamp =
      chelstats.matches.length > 0
        ? chelstats.matches[0].timestamp
        : Math.floor(Date.now() / 1000);

    for (let i = 0; i < untrackedWins; i++) {
      // Place forfeits slightly after the latest tracked game
      const ts = latestTimestamp + (i + 1) * 60;
      newForfeits.push({
        id: `forfeit-${ts}-${i}`,
        timestamp: ts,
        date: formatDate(ts),
      });
    }

    // Update stored state
    const allForfeits = [...state.forfeitEntries, ...newForfeits];
    const allTrackedIds = [
      ...new Set([...state.trackedMatchIds, ...currentMatchIds]),
    ];

    await redis.set("match-history", {
      lastRecord: currentRecord,
      trackedMatchIds: allTrackedIds,
      forfeitEntries: allForfeits,
    } satisfies MatchHistoryState);

    return mergeForfeits(chelstats.matches, allForfeits);
  } catch (err) {
    console.error("[match-history] Sync failed:", err);
    return chelstats.matches;
  }
}

/** Convert forfeit entries to ClubMatch objects and merge with API matches. */
function mergeForfeits(
  apiMatches: ClubMatch[],
  forfeitEntries: ForfeitEntry[]
): ClubMatch[] {
  if (forfeitEntries.length === 0) return apiMatches;

  const forfeitMatches: ClubMatch[] = forfeitEntries.map((f) => ({
    id: f.id,
    timestamp: f.timestamp,
    date: f.date,
    opponent: "Unknown",
    homeAway: "home" as const,
    scoreUs: 1,
    scoreThem: 0,
    matchType: "regular" as const,
    shotsUs: 0,
    shotsThem: 0,
    toaUs: "0:00",
    toaThem: "0:00",
    passCompUs: 0,
    passCompThem: 0,
    result: "forfeit",
    players: [],
    threeStars: null,
    forfeit: true,
  }));

  const all = [...apiMatches, ...forfeitMatches];
  all.sort((a, b) => b.timestamp - a.timestamp);
  return all;
}
