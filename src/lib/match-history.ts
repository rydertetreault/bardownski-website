/**
 * Redis-backed match history tracking.
 *
 * The Chelstats API only returns ~5 recent games. This module
 * accumulates every match in Redis so older games aren't lost when
 * they rotate out of the API window. It also detects untracked wins
 * (forfeits) by comparing record deltas.
 *
 * Syncing happens on every page load (via getMatchHistory) and during
 * the weekly-update cron, so no dedicated high-frequency cron is needed.
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

/**
 * Hardcoded forfeit entries for games the API never returned.
 * These were lost during a Redis schema migration on 04/13 and are
 * preserved here so they survive future Redis resets.
 */
const MANUAL_FORFEITS: ForfeitEntry[] = [
  { id: "forfeit-1776027600-0", timestamp: 1776027600, date: "April 12, 2026" },
  { id: "forfeit-1776031200-1", timestamp: 1776031200, date: "April 12, 2026" },
  { id: "forfeit-1776034800-2", timestamp: 1776034800, date: "April 12, 2026" },
];

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
 * Called on every page load (via getMatchHistory) and during the
 * weekly-update cron. Returns the number of new matches added.
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

  // First run, or stale shape from a previous schema (e.g. trackedMatchIds):
  // re-seed with current API matches.
  if (!state || !Array.isArray(state.matches)) {
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
 * Runs a full pollAndAccumulate sync on every call so that each page
 * visit keeps the match history up to date -- no frequent cron needed.
 * Falls back to live API data if Redis is unavailable.
 */
export async function getMatchHistory(
  chelstats: ChelstatsData
): Promise<ClubMatch[]> {
  const redis = getRedis();
  if (!redis) return chelstats.matches;

  try {
    // Full sync: accumulate new matches and detect forfeits on every load
    await pollAndAccumulate(chelstats);

    const state = await redis.get<MatchHistoryState>("match-history");
    if (!state || !Array.isArray(state.matches)) return chelstats.matches;

    // Add forfeit entries (Redis-tracked + hardcoded manual ones)
    const allForfeitEntries = [...state.forfeitEntries];
    for (const mf of MANUAL_FORFEITS) {
      if (!allForfeitEntries.some((f) => f.id === mf.id)) {
        allForfeitEntries.push(mf);
      }
    }

    if (allForfeitEntries.length === 0) return state.matches;

    const forfeitMatches: ClubMatch[] = allForfeitEntries.map((f) => ({
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

    const combined = [...state.matches, ...forfeitMatches];
    combined.sort((a, b) => b.timestamp - a.timestamp);
    return combined;
  } catch (err) {
    console.error("[match-history] Failed to load:", err);
    return chelstats.matches;
  }
}
