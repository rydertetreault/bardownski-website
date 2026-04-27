/**
 * Redis-backed match history tracking.
 *
 * The Chelstats API only returns ~5 recent games. This module accumulates
 * every match in Redis so older games aren't lost when they rotate out.
 *
 * Storage layout (schema v2, see migrateLegacyIfNeeded for the v1 blob):
 *   match-history:matches   Hash<matchId, ClubMatch>
 *   match-history:forfeits  Hash<forfeitId, ForfeitEntry>
 *   match-history:meta      JSON { lastRecord, schemaVersion }
 *
 * Per-match HSET writes are atomic and commutative, so concurrent
 * pollAndAccumulate calls cannot clobber each other. The 3-week retention
 * filter is applied at READ time only; Redis itself retains all history.
 *
 * Syncing happens on every page load (via getMatchHistory) and via the
 * /api/cron/sync-matches cron registered in vercel.json.
 */

import { Redis } from "@upstash/redis";
import type { ClubMatch, ChelstatsData } from "./chelstats";

interface LegacyMatchHistoryState {
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

/** Matches older than this are hidden at read time. Redis retains everything; see getMatchHistory. */
const RETENTION_SECONDS = 21 * 24 * 60 * 60; // 3 weeks

/**
 * Upper bound on ghost forfeits generated in a single pollAndAccumulate run.
 * In steady state at most 1-2 wins per run can slip out of the 5-game API
 * window before we sync, so anything above this is a sync anomaly (stale
 * lastRecord, API hiccup, etc.) rather than real untracked forfeits. When
 * exceeded, we skip forfeit creation but still advance meta so the next
 * run doesn't hit the same delta.
 */
const MAX_FORFEITS_PER_RUN = 10;

/**
 * Hardcoded forfeit entries for games the API never returned.
 * Preserved here so they survive future Redis resets.
 *
 * The April 26 entries used to live in Redis as auto-detected ghost
 * forfeits (`forfeit-win-N` format, generated when the API briefly
 * reported wins=854). The detection was wrong but the underlying 5
 * wins are real, so they're pinned here.
 */
const MANUAL_FORFEITS: ForfeitEntry[] = [
  { id: "forfeit-1776024000-0", timestamp: 1776024000, date: "April 12, 2026" },
  { id: "forfeit-1776027600-1", timestamp: 1776027600, date: "April 12, 2026" },
  { id: "forfeit-1776031200-2", timestamp: 1776031200, date: "April 12, 2026" },
  { id: "forfeit-1776034800-3", timestamp: 1776034800, date: "April 12, 2026" },
  { id: "forfeit-1775937600-4", timestamp: 1775937600, date: "April 11, 2026" },
  { id: "forfeit-1776020400-5", timestamp: 1776020400, date: "April 12, 2026" },
  { id: "forfeit-win-850", timestamp: 1777246360, date: "April 26, 2026" },
  { id: "forfeit-win-851", timestamp: 1777246420, date: "April 26, 2026" },
  { id: "forfeit-win-852", timestamp: 1777246480, date: "April 26, 2026" },
  { id: "forfeit-win-853", timestamp: 1777246540, date: "April 26, 2026" },
  { id: "forfeit-win-854", timestamp: 1777246600, date: "April 26, 2026" },
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
 * Called on every page load (via getMatchHistory) and via the
 * sync-matches / weekly-update crons. Returns the number of new
 * matches added.
 */
export async function pollAndAccumulate(
  chelstats: ChelstatsData
): Promise<{ newMatches: number; newForfeits: number }> {
  const redis = getRedis();
  if (!redis) return { newMatches: 0, newForfeits: 0 };

  await migrateLegacyIfNeeded(redis);

  const currentRecord = {
    wins: chelstats.clubStats.wins,
    losses: chelstats.clubStats.losses,
    otl: chelstats.clubStats.otl,
  };
  const currentTotal =
    currentRecord.wins + currentRecord.losses + currentRecord.otl;

  const meta = await readMeta(redis);
  const lastRecord = meta?.lastRecord ?? { wins: 0, losses: 0, otl: 0 };
  const storedTotal = lastRecord.wins + lastRecord.losses + lastRecord.otl;

  // Cold-start / post-reset guard: if we have no prior record, this run
  // establishes the baseline. Any wins already in the API record can't
  // be attributed — better to skip forfeit detection than hallucinate
  // ghost forfeits for every historical win.
  const isColdStart = storedTotal === 0 && currentTotal > 0;
  if (isColdStart) {
    console.info(
      "[match-history] cold start: establishing baseline, skipping forfeit detection"
    );
  }

  // Poisoned-meta recovery: if the gap is large enough that no plausible
  // sequence of glitches explains it, treat stored as poisoned (a prior
  // bad API response wrote nonsense into meta) and reset the baseline.
  // Without this the early-return below would lock us out forever.
  const isPoisonedMeta =
    currentTotal < storedTotal &&
    storedTotal - currentTotal > MAX_FORFEITS_PER_RUN;
  if (isPoisonedMeta) {
    console.warn(
      `[match-history] stored record (${storedTotal}) far exceeds API (${currentTotal}); treating as poisoned and resetting baseline`
    );
  }

  // API glitch protection: if totals decreased modestly, skip — the API
  // probably hiccuped and will recover. Poisoned-meta case above falls
  // through so we can re-baseline.
  if (currentTotal < storedTotal && !isPoisonedMeta) {
    console.warn(
      `[match-history] API total decreased (${storedTotal} -> ${currentTotal}); skipping sync to preserve history`
    );
    return { newMatches: 0, newForfeits: 0 };
  }

  // Merge API matches into the hash. HSET is idempotent, so no need
  // to diff — but diffing lets us return a useful newMatches count.
  const existingMatches = await readAllMatches(redis);
  const existingIds = new Set(existingMatches.map((m) => m.id));
  const newApiMatches = chelstats.matches.filter((m) => !existingIds.has(m.id));

  if (newApiMatches.length > 0) {
    await writeMatches(redis, newApiMatches);
  }

  // Deterministic forfeit detection. If wins increased by more than
  // the new tracked wins we saw, the delta is untracked (forfeit).
  // IDs are derived from the running win total so concurrent runs
  // produce identical IDs and HSET dedupes naturally.
  const newForfeits: ForfeitEntry[] = [];
  let metaPoisoned = false;
  if (currentTotal > storedTotal && !isColdStart) {
    const newTrackedWins = newApiMatches.filter(
      (m) => m.scoreUs > m.scoreThem
    ).length;
    const deltaWins = currentRecord.wins - lastRecord.wins;
    const untrackedWins = Math.max(0, deltaWins - newTrackedWins);

    if (untrackedWins > MAX_FORFEITS_PER_RUN) {
      // Sync anomaly: API jumped impossibly. Skip BOTH forfeit creation
      // AND the meta write below — accepting this as the new baseline
      // would poison `lastRecord` and lock out future syncs once the
      // API returns to its real value.
      console.warn(
        `[match-history] untrackedWins=${untrackedWins} exceeds MAX_FORFEITS_PER_RUN=${MAX_FORFEITS_PER_RUN}; skipping forfeit creation and meta update`
      );
      metaPoisoned = true;
    } else {
      const baseTs = Math.floor(Date.now() / 1000);
      for (let i = 0; i < untrackedWins; i++) {
        // ID keyed to the resulting cumulative win count — stable across
        // concurrent runs and across restarts.
        const winNumber = lastRecord.wins + newTrackedWins + i + 1;
        newForfeits.push({
          id: `forfeit-win-${winNumber}`,
          timestamp: baseTs + i * 60,
          date: formatDate(baseTs + i * 60),
        });
      }

      if (newForfeits.length > 0) {
        await writeForfeits(redis, newForfeits);
      }
    }
  }

  // Update meta last. If an earlier step failed, next run will retry.
  // Skip when the API jump was implausible (metaPoisoned) so a single
  // bad response can't latch the baseline at a nonsense value.
  if (!metaPoisoned) {
    await writeMeta(redis, {
      lastRecord: currentRecord,
      schemaVersion: SCHEMA_VERSION,
    });
  }

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
    await pollAndAccumulate(chelstats);

    const [matches, storedForfeits] = await Promise.all([
      readAllMatches(redis),
      readAllForfeits(redis),
    ]);

    // Stored forfeits + hardcoded manual forfeits. MANUAL_FORFEITS always
    // win on id collision: they're the authoritative safety-net list the
    // user maintains in code, and must not be shadowed by stale stored data.
    const forfeitsById = new Map<string, ForfeitEntry>();
    for (const f of storedForfeits) forfeitsById.set(f.id, f);
    for (const f of MANUAL_FORFEITS) forfeitsById.set(f.id, f);

    // 3-week filter is applied at read time; Redis retains everything
    const cutoff = Math.floor(Date.now() / 1000) - RETENTION_SECONDS;
    const visibleMatches = matches.filter((m) => m.timestamp >= cutoff);
    const visibleForfeits = Array.from(forfeitsById.values()).filter(
      (f) => f.timestamp >= cutoff
    );

    const forfeitMatches: ClubMatch[] = visibleForfeits.map((f) => ({
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

    const combined = [...visibleMatches, ...forfeitMatches];
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
      const legacy = await redis.get<LegacyMatchHistoryState>(LEGACY_KEY);
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
