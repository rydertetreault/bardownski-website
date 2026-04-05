/**
 * Redis-backed match history tracking.
 *
 * The Chelstats API only returns ~5 recent games. This module polls
 * frequently and accumulates every match in Redis so older games
 * aren't lost when they rotate out of the API window. It also detects
 * untracked wins (forfeits) by comparing record deltas.
 */

import { Redis } from "@upstash/redis";
import type { ClubMatch, ChelstatsData } from "./chelstats";

interface MatchHistoryState {
  lastRecord: { wins: number; losses: number; otl: number };
  matches: ClubMatch[];
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
 * Accumulate new API matches into Redis and detect forfeits.
 * Called by the sync-matches cron every 5 minutes.
 * Returns the number of new matches added.
 */
export async function pollAndAccumulate(
  chelstats: ChelstatsData
): Promise<{ newMatches: number; newForfeits: number }> {
  const redis = getRedis();
  if (!redis) return { newMatches: 0, newForfeits: 0 };

  const state = await redis.get<MatchHistoryState>("match-history");
  const currentRecord = {
    wins: chelstats.clubStats.wins,
    losses: chelstats.clubStats.losses,
    otl: chelstats.clubStats.otl,
  };

  // First run: seed with current API matches
  if (!state) {
    await redis.set("match-history", {
      lastRecord: currentRecord,
      matches: chelstats.matches,
      forfeitEntries: [],
    } satisfies MatchHistoryState);
    return { newMatches: chelstats.matches.length, newForfeits: 0 };
  }

  // Detect new season (total games decreased) - reset
  const currentTotal =
    currentRecord.wins + currentRecord.losses + currentRecord.otl;
  const storedTotal =
    state.lastRecord.wins + state.lastRecord.losses + state.lastRecord.otl;
  if (currentTotal < storedTotal) {
    await redis.set("match-history", {
      lastRecord: currentRecord,
      matches: chelstats.matches,
      forfeitEntries: [],
    } satisfies MatchHistoryState);
    return { newMatches: chelstats.matches.length, newForfeits: 0 };
  }

  // Merge: add any API matches we haven't seen before
  const storedIds = new Set(state.matches.map((m) => m.id));
  const newApiMatches = chelstats.matches.filter((m) => !storedIds.has(m.id));
  const mergedMatches = [...state.matches, ...newApiMatches];
  mergedMatches.sort((a, b) => b.timestamp - a.timestamp);

  // Forfeit detection: compare record delta to newly tracked wins
  let newForfeits: ForfeitEntry[] = [];
  if (currentTotal > storedTotal) {
    let newTrackedWins = 0;
    for (const m of newApiMatches) {
      if (m.scoreUs > m.scoreThem) newTrackedWins++;
    }

    const deltaWins = currentRecord.wins - state.lastRecord.wins;
    const untrackedWins = Math.max(0, deltaWins - newTrackedWins);

    const latestTimestamp =
      mergedMatches.length > 0
        ? mergedMatches[0].timestamp
        : Math.floor(Date.now() / 1000);

    for (let i = 0; i < untrackedWins; i++) {
      const ts = latestTimestamp + (i + 1) * 60;
      newForfeits.push({
        id: `forfeit-${ts}-${i}`,
        timestamp: ts,
        date: formatDate(ts),
      });
    }
  }

  const allForfeits = [...state.forfeitEntries, ...newForfeits];

  await redis.set("match-history", {
    lastRecord: currentRecord,
    matches: mergedMatches,
    forfeitEntries: allForfeits,
  } satisfies MatchHistoryState);

  return { newMatches: newApiMatches.length, newForfeits: newForfeits.length };
}

/**
 * Load the full accumulated match history from Redis.
 * Falls back to live API data if Redis is unavailable.
 */
export async function getMatchHistory(
  chelstats: ChelstatsData
): Promise<ClubMatch[]> {
  const redis = getRedis();
  if (!redis) return chelstats.matches;

  try {
    const state = await redis.get<MatchHistoryState>("match-history");
    if (!state) return chelstats.matches;

    // Merge stored matches with current API matches (API may have newer data)
    const storedIds = new Set(state.matches.map((m) => m.id));
    const freshFromApi = chelstats.matches.filter((m) => !storedIds.has(m.id));
    const allMatches = [...state.matches, ...freshFromApi];
    allMatches.sort((a, b) => b.timestamp - a.timestamp);

    // Add forfeit entries
    if (state.forfeitEntries.length === 0) return allMatches;

    const forfeitMatches: ClubMatch[] = state.forfeitEntries.map((f) => ({
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

    const combined = [...allMatches, ...forfeitMatches];
    combined.sort((a, b) => b.timestamp - a.timestamp);
    return combined;
  } catch (err) {
    console.error("[match-history] Failed to load:", err);
    return chelstats.matches;
  }
}
