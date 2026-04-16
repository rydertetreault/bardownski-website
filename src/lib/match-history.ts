/**
 * Redis-backed match history tracking.
 *
 * The Chelstats API only returns ~5 recent games. This module
 * accumulates every match in Redis so older games aren't lost when
 * they rotate out of the API window. It also detects untracked wins
 * (forfeits) by comparing record deltas.
 *
 * Only the last 3 weeks of matches are kept; older games are pruned
 * on every sync so Redis stays lean and the UI stays current.
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

const SCHEMA_VERSION = 2;
const MATCHES_KEY = "match-history:matches";
const FORFEITS_KEY = "match-history:forfeits";
const META_KEY = "match-history:meta";
const LEGACY_KEY = "match-history";
const MIGRATION_LOCK_KEY = "match-history:migration-lock";

interface MatchHistoryMeta {
  lastRecord: { wins: number; losses: number; otl: number };
  schemaVersion: number;
}

/** Matches older than this are pruned from Redis on every sync. */
const RETENTION_SECONDS = 21 * 24 * 60 * 60; // 3 weeks

/**
 * Hardcoded forfeit entries for games the API never returned.
 * These were lost during a Redis schema migration on 04/13 and are
 * preserved here so they survive future Redis resets.
 */
const MANUAL_FORFEITS: ForfeitEntry[] = [
  { id: "forfeit-1776024000-0", timestamp: 1776024000, date: "April 12, 2026" },
  { id: "forfeit-1776027600-1", timestamp: 1776027600, date: "April 12, 2026" },
  { id: "forfeit-1776031200-2", timestamp: 1776031200, date: "April 12, 2026" },
  { id: "forfeit-1776034800-3", timestamp: 1776034800, date: "April 12, 2026" },
  { id: "forfeit-1775937600-4", timestamp: 1775937600, date: "April 11, 2026" },
  { id: "forfeit-1776020400-5", timestamp: 1776020400, date: "April 12, 2026" },
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

  // Prune matches and forfeits older than 3 weeks
  const cutoff = Math.floor(Date.now() / 1000) - RETENTION_SECONDS;
  const prunedMatches = mergedMatches.filter((m) => m.timestamp >= cutoff);
  const prunedForfeits = allForfeits.filter((f) => f.timestamp >= cutoff);

  await redis.set("match-history", {
    lastRecord: currentRecord,
    matches: prunedMatches,
    forfeitEntries: prunedForfeits,
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

    // Add forfeit entries (Redis-tracked + hardcoded manual ones within retention window)
    const cutoff = Math.floor(Date.now() / 1000) - RETENTION_SECONDS;
    const allForfeitEntries = [...state.forfeitEntries];
    for (const mf of MANUAL_FORFEITS) {
      if (mf.timestamp >= cutoff && !allForfeitEntries.some((f) => f.id === mf.id)) {
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

async function readAllMatches(redis: Redis): Promise<ClubMatch[]> {
  const raw = await redis.hgetall<Record<string, ClubMatch>>(MATCHES_KEY);
  if (!raw) return [];
  return Object.values(raw);
}

async function readAllForfeits(redis: Redis): Promise<ForfeitEntry[]> {
  const raw = await redis.hgetall<Record<string, ForfeitEntry>>(FORFEITS_KEY);
  if (!raw) return [];
  return Object.values(raw);
}

async function writeMatches(redis: Redis, matches: ClubMatch[]): Promise<void> {
  if (matches.length === 0) return;
  const payload: Record<string, ClubMatch> = {};
  for (const m of matches) payload[m.id] = m;
  await redis.hset(MATCHES_KEY, payload);
}

async function writeForfeits(redis: Redis, forfeits: ForfeitEntry[]): Promise<void> {
  if (forfeits.length === 0) return;
  const payload: Record<string, ForfeitEntry> = {};
  for (const f of forfeits) payload[f.id] = f;
  await redis.hset(FORFEITS_KEY, payload);
}

async function readMeta(redis: Redis): Promise<MatchHistoryMeta | null> {
  return await redis.get<MatchHistoryMeta>(META_KEY);
}

async function writeMeta(redis: Redis, meta: MatchHistoryMeta): Promise<void> {
  await redis.set(META_KEY, meta);
}

/**
 * One-shot migration from the legacy single-blob layout to the
 * per-match hash layout. Idempotent and guarded by a Redis lock so
 * concurrent calls can't double-migrate.
 *
 * Returns true if migration ran, false if already migrated or locked.
 */
async function migrateLegacyIfNeeded(redis: Redis): Promise<boolean> {
  const meta = await readMeta(redis);
  if (meta && meta.schemaVersion >= SCHEMA_VERSION) return false;

  // SET NX EX 30 — only one migrator at a time; auto-expires.
  // Trade-off: if a migration ever exceeds 30s the lock can be stolen,
  // but HSETs are idempotent and the meta gate short-circuits the second
  // migrator, so the worst case is a harmless duplicate write, not data loss.
  const gotLock = await redis.set(MIGRATION_LOCK_KEY, "1", {
    nx: true,
    ex: 30,
  });
  if (!gotLock) return false;

  try {
    try {
      const legacy = await redis.get<MatchHistoryState>(LEGACY_KEY);
      if (legacy && Array.isArray(legacy.matches)) {
        await writeMatches(redis, legacy.matches);
        if (Array.isArray(legacy.forfeitEntries)) {
          await writeForfeits(redis, legacy.forfeitEntries);
        }
        await writeMeta(redis, {
          lastRecord: legacy.lastRecord ?? { wins: 0, losses: 0, otl: 0 },
          schemaVersion: SCHEMA_VERSION,
        });
        await redis.del(LEGACY_KEY);
        console.log("[match-history] migrated legacy blob to hash layout");
      } else {
        // No legacy data — just write meta so future calls skip this branch
        await writeMeta(redis, {
          lastRecord: { wins: 0, losses: 0, otl: 0 },
          schemaVersion: SCHEMA_VERSION,
        });
      }
      return true;
    } catch (err) {
      console.error("[match-history] migration failed:", err);
      throw err;
    }
  } finally {
    await redis.del(MIGRATION_LOCK_KEY);
  }
}

/** @internal — exported only for self-test route */
export const __INTERNAL_TEST__ = {
  SCHEMA_VERSION,
  MATCHES_KEY,
  FORFEITS_KEY,
  META_KEY,
  LEGACY_KEY,
  readAllMatches,
  writeMatches,
  readMeta,
  writeMeta,
  migrateLegacyIfNeeded,
};
