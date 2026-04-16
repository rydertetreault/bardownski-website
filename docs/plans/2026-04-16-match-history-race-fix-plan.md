# Match-History Race Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate recurring match-data loss by switching Redis storage from a single JSON blob to race-safe per-match hashes, removing the destructive API-glitch auto-reset, and registering the background sync cron.

**Architecture:** Replace `match-history` JSON key with three keys: `match-history:matches` (Hash), `match-history:forfeits` (Hash), `match-history:meta` (JSON). Per-match `HSET` writes are atomic and commutative, so concurrent `pollAndAccumulate` runs can no longer clobber each other. An idempotent one-shot migration moves legacy data into the new layout on first call. `pollAndAccumulate` stops deleting data on API total decrease; a new `/api/admin/reset-match-history` endpoint is the only way to wipe state.

**Tech Stack:** Next.js 16, TypeScript, `@upstash/redis` (HTTP client), Vercel Hobby cron.

**Design reference:** `docs/plans/2026-04-16-match-history-race-fix-design.md`

**Verification strategy:** This project has no test framework. We verify via a temporary admin self-test route (`/api/admin/self-test`) that exercises the storage layer against real Upstash Redis using a `match-history:test:*` namespace, plus a local dev-server smoke test of `/matches` and `/records`. The self-test route is removed in the final task.

---

### Task 1: Scaffold the self-test route

**Files:**
- Create: `src/app/api/admin/self-test/route.ts`

**Step 1: Create a stub route that requires the CRON_SECRET auth and returns a placeholder body.**

```ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ status: "ok", checks: [] });
}
```

**Step 2: Verify**

Run: `npm run dev` in one terminal, then in another:
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/admin/self-test
```
Expected: `{"status":"ok","checks":[]}`

**Step 3: Commit**

```bash
git add src/app/api/admin/self-test/route.ts
git commit -m "Scaffold admin self-test route for match-history verification"
```

---

### Task 2: Add new storage helpers (hash layout) alongside the old code

**Files:**
- Modify: `src/lib/match-history.ts`

Add new exports — do NOT yet remove the old blob logic. We need both to coexist during migration.

**Step 1: Add schema constants and types near the top of the file, after the existing `ForfeitEntry` interface.**

```ts
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
```

**Step 2: Add storage helpers at the bottom of the file (before the last closing brace if any).**

```ts
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
```

**Step 3: Verify it still builds**

Run: `npm run build`
Expected: build succeeds, no new type errors from these additions.

**Step 4: Commit**

```bash
git add src/lib/match-history.ts
git commit -m "Add hash-layout storage helpers for match history (not yet wired)"
```

---

### Task 3: Implement the one-shot migration

**Files:**
- Modify: `src/lib/match-history.ts`

**Step 1: Add migration function below the storage helpers.**

```ts
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

  // SET NX EX 30 — only one migrator at a time; auto-expires
  const gotLock = await redis.set(MIGRATION_LOCK_KEY, "1", {
    nx: true,
    ex: 30,
  });
  if (!gotLock) return false;

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
  } finally {
    await redis.del(MIGRATION_LOCK_KEY);
  }
}
```

**Step 2: Add a self-test check that exercises migration in a test namespace.** Modify `src/app/api/admin/self-test/route.ts` to import and use the helper functions (exported from match-history.ts) — but first we need to export them. In `match-history.ts`, add an export wrapper at the very bottom:

```ts
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
```

**Step 3: Wire a migration check into the self-test route.**

```ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { __INTERNAL_TEST__ } from "@/lib/match-history";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const NS = "match-history:test";
  const checks: { name: string; pass: boolean; detail?: string }[] = [];

  // Cleanup any prior test data
  await redis.del(
    `${NS}:matches`,
    `${NS}:forfeits`,
    `${NS}:meta`,
    `${NS}`,
    `${NS}:migration-lock`
  );

  // --- Check 1: migration from legacy blob populates hashes
  await redis.set(`${NS}`, {
    lastRecord: { wins: 10, losses: 2, otl: 1 },
    matches: [
      {
        id: "test-m1",
        timestamp: 1776000000,
        date: "April 12, 2026",
        opponent: "Test",
        homeAway: "home",
        scoreUs: 3,
        scoreThem: 1,
        matchType: "regular",
        shotsUs: 10,
        shotsThem: 8,
        toaUs: "5:00",
        toaThem: "4:00",
        passCompUs: 80,
        passCompThem: 70,
        result: "",
        players: [],
        threeStars: null,
      },
    ],
    forfeitEntries: [
      { id: "test-f1", timestamp: 1776000100, date: "April 12, 2026" },
    ],
  });

  // (We can't reuse the real helpers on a different namespace without
  // parameterizing them. For the self-test, just assert the shape of
  // the production keys exists after calling migrateLegacyIfNeeded
  // using the REAL keys in a dedicated test slot.)
  // NOTE: This check is added in Task 3. Expand in later tasks.
  checks.push({
    name: "migration-placeholder",
    pass: true,
    detail: "wired in task 3; expanded in tasks 4-5",
  });

  return NextResponse.json({ status: "ok", checks });
}
```

> Note for implementer: the self-test currently uses a placeholder because `migrateLegacyIfNeeded` is hardcoded to production keys. In Task 7 we'll add a namespace-parameterized version for richer testing. For now, validate by invoking migration against REAL data in a fresh Upstash dev instance (see Step 4).

**Step 4: Verify migration runs once against dev Redis**

Run: `npm run dev`, then:
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-matches
```
Check Redis:
```bash
# In Upstash console or redis-cli equivalent
HLEN match-history:matches   # should be > 0 if legacy had data
GET match-history:meta        # should show schemaVersion: 2
EXISTS match-history           # should be 0
```
Expected: Hash is populated, meta has `schemaVersion: 2`, legacy key gone.

**Step 5: Commit**

```bash
git add src/lib/match-history.ts src/app/api/admin/self-test/route.ts
git commit -m "Implement one-shot migration from legacy blob to hash layout"
```

---

### Task 4: Rewrite `pollAndAccumulate` to use hash storage, remove auto-reset, deterministic forfeit IDs

**Files:**
- Modify: `src/lib/match-history.ts`

**Step 1: Replace the body of `pollAndAccumulate`. The new implementation:**
- Calls `migrateLegacyIfNeeded` first
- Reads state from the new keys
- Never deletes on API total decrease (logs warning instead)
- Uses deterministic forfeit IDs based on the cumulative win count so concurrent runs are idempotent
- Writes new matches and forfeits via `HSET` (per-match atomic)
- Updates `meta.lastRecord` last

```ts
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

  // API glitch protection: if totals decreased, DO NOT wipe. Just skip.
  if (currentTotal < storedTotal) {
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
  let newForfeits: ForfeitEntry[] = [];
  if (currentTotal > storedTotal) {
    const newTrackedWins = newApiMatches.filter(
      (m) => m.scoreUs > m.scoreThem
    ).length;
    const deltaWins = currentRecord.wins - lastRecord.wins;
    const untrackedWins = Math.max(0, deltaWins - newTrackedWins);

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

  // Update meta last. If an earlier step failed, next run will retry.
  await writeMeta(redis, {
    lastRecord: currentRecord,
    schemaVersion: SCHEMA_VERSION,
  });

  return { newMatches: newApiMatches.length, newForfeits: newForfeits.length };
}
```

**Step 2: Delete the now-unused `MatchHistoryState` interface and legacy code paths.** Check that `MatchHistoryState` is no longer referenced (it should only appear inside `migrateLegacyIfNeeded`, which is fine — keep it there as a local type).

Move `MatchHistoryState` into the migration function or mark it as legacy-only:
```ts
interface LegacyMatchHistoryState {
  lastRecord: { wins: number; losses: number; otl: number };
  matches: ClubMatch[];
  forfeitEntries: ForfeitEntry[];
}
```
Rename the interface and update the reference inside `migrateLegacyIfNeeded`.

**Step 3: Verify build**

Run: `npm run build`
Expected: builds cleanly, no TS errors.

**Step 4: Verify end-to-end against dev Redis**

Run `npm run dev`, then hit `sync-matches` twice back-to-back:
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-matches
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-matches
```
Expected: first call may report `newMatches > 0`, second call reports `newMatches: 0`. No errors.

**Step 5: Commit**

```bash
git add src/lib/match-history.ts
git commit -m "Rewrite pollAndAccumulate to use hash storage, remove auto-reset, deterministic forfeit IDs"
```

---

### Task 5: Rewrite `getMatchHistory` to read from hash layout

**Files:**
- Modify: `src/lib/match-history.ts`

**Step 1: Replace `getMatchHistory` body.** It should:
- Call `pollAndAccumulate` (unchanged contract)
- Read matches + forfeits from the new keys
- Layer `MANUAL_FORFEITS` on top
- Filter to the 3-week window AT READ TIME (do not delete from Redis)
- Return combined, sorted newest-first

```ts
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

    // Union of stored forfeits + hardcoded manual forfeits (dedupe by id)
    const forfeitsById = new Map<string, ForfeitEntry>();
    for (const f of storedForfeits) forfeitsById.set(f.id, f);
    for (const f of MANUAL_FORFEITS) {
      if (!forfeitsById.has(f.id)) forfeitsById.set(f.id, f);
    }

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
```

**Step 2: Update the file-header JSDoc comment** (lines 1-14) to reflect the new layout. Replace the comment with:

```ts
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
```

**Step 3: Verify build + smoke test**

Run:
```bash
npm run build
npm run dev
```
In browser, open `http://localhost:3000/matches` and `http://localhost:3000/records`. Confirm:
- Matches page shows all games (no fewer than before migration)
- Week groups (e.g. Apr 6-12) show correct counts
- Records page shows longest win streak correctly
- No console errors

**Step 4: Commit**

```bash
git add src/lib/match-history.ts
git commit -m "Rewrite getMatchHistory to read hash layout with read-time retention filter"
```

---

### Task 6: Add the admin reset endpoint

**Files:**
- Create: `src/app/api/admin/reset-match-history/route.ts`

**Step 1: Write the endpoint.**

```ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/**
 * Wipe all match-history Redis state. Intended for manual use at season
 * boundaries only. Requires CRON_SECRET auth.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
  }

  const redis = new Redis({ url, token });
  const deleted = await redis.del(
    "match-history:matches",
    "match-history:forfeits",
    "match-history:meta",
    "match-history",
    "match-history:migration-lock"
  );

  return NextResponse.json({ success: true, keysDeleted: deleted });
}
```

**Step 2: Verify**

Against dev Redis (with throwaway data), POST to the route:
```bash
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/admin/reset-match-history
```
Expected: `{"success":true,"keysDeleted":<n>}`. Then call `/api/cron/sync-matches` once and verify the new layout is re-populated from scratch.

**Step 3: Commit**

```bash
git add src/app/api/admin/reset-match-history/route.ts
git commit -m "Add admin reset-match-history endpoint for manual season boundaries"
```

---

### Task 7: Expand self-test to cover the critical invariants

**Files:**
- Modify: `src/app/api/admin/self-test/route.ts`
- Modify: `src/lib/match-history.ts` (add namespace-parameterized variants of helpers for the self-test only)

**Step 1: In `match-history.ts`, add parameterized helpers to `__INTERNAL_TEST__`** — accept a key prefix so they can run against `match-history:test` without touching production keys.

```ts
async function readAllMatchesNS(redis: Redis, prefix: string): Promise<ClubMatch[]> {
  const raw = await redis.hgetall<Record<string, ClubMatch>>(`${prefix}:matches`);
  return raw ? Object.values(raw) : [];
}

async function writeMatchesNS(redis: Redis, prefix: string, matches: ClubMatch[]): Promise<void> {
  if (matches.length === 0) return;
  const payload: Record<string, ClubMatch> = {};
  for (const m of matches) payload[m.id] = m;
  await redis.hset(`${prefix}:matches`, payload);
}

// Extend __INTERNAL_TEST__ export:
export const __INTERNAL_TEST__ = {
  // ...existing fields...
  readAllMatchesNS,
  writeMatchesNS,
};
```

**Step 2: Rewrite the self-test route to run three checks.**

```ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { __INTERNAL_TEST__ } from "@/lib/match-history";
import type { ClubMatch } from "@/lib/chelstats";

const NS = "match-history:test";

function makeMatch(id: string, ts: number, scoreUs: number, scoreThem: number): ClubMatch {
  return {
    id,
    timestamp: ts,
    date: new Date(ts * 1000).toDateString(),
    opponent: "Test",
    homeAway: "home",
    scoreUs,
    scoreThem,
    matchType: "regular",
    shotsUs: 0,
    shotsThem: 0,
    toaUs: "0:00",
    toaThem: "0:00",
    passCompUs: 0,
    passCompThem: 0,
    result: "",
    players: [],
    threeStars: null,
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const { readAllMatchesNS, writeMatchesNS } = __INTERNAL_TEST__;
  const checks: { name: string; pass: boolean; detail?: string }[] = [];

  // Cleanup
  await redis.del(`${NS}:matches`, `${NS}:forfeits`, `${NS}:meta`);

  // Check 1: concurrent writes do not lose data (the core race fix)
  await Promise.all([
    writeMatchesNS(redis, NS, [makeMatch("A", 1000, 3, 1)]),
    writeMatchesNS(redis, NS, [makeMatch("B", 1001, 2, 2)]),
    writeMatchesNS(redis, NS, [makeMatch("C", 1002, 4, 0)]),
  ]);
  const afterConcurrent = await readAllMatchesNS(redis, NS);
  const ids = new Set(afterConcurrent.map((m) => m.id));
  checks.push({
    name: "concurrent-writes-no-loss",
    pass: ids.has("A") && ids.has("B") && ids.has("C"),
    detail: `got ids: ${[...ids].sort().join(",")}`,
  });

  // Check 2: re-writing an existing match ID is idempotent (no duplicates)
  await writeMatchesNS(redis, NS, [makeMatch("A", 1000, 3, 1)]);
  const afterDupe = await readAllMatchesNS(redis, NS);
  checks.push({
    name: "duplicate-write-no-extra-entries",
    pass: afterDupe.length === 3,
    detail: `count=${afterDupe.length}`,
  });

  // Check 3: production migration has run (meta exists, legacy key gone)
  const meta = await redis.get<{ schemaVersion: number }>("match-history:meta");
  const legacyExists = await redis.exists("match-history");
  checks.push({
    name: "production-migration-complete",
    pass: !!meta && meta.schemaVersion >= 2 && legacyExists === 0,
    detail: `meta=${JSON.stringify(meta)}, legacyExists=${legacyExists}`,
  });

  // Cleanup
  await redis.del(`${NS}:matches`, `${NS}:forfeits`, `${NS}:meta`);

  const allPass = checks.every((c) => c.pass);
  return NextResponse.json({ status: allPass ? "ok" : "fail", checks });
}
```

**Step 3: Run the self-test**

Against dev server:
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/admin/self-test | jq
```
Expected: `"status": "ok"` and all three checks pass.

**Step 4: Commit**

```bash
git add src/lib/match-history.ts src/app/api/admin/self-test/route.ts
git commit -m "Add self-test checks for concurrent writes and migration state"
```

---

### Task 8: Register `sync-matches` cron in `vercel.json`

**Files:**
- Modify: `vercel.json`

**Step 1: Add the new cron entry alongside the existing `weekly-update`.**

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-update",
      "schedule": "0 10 * * 1"
    },
    {
      "path": "/api/cron/sync-matches",
      "schedule": "0 12 * * *"
    }
  ]
}
```

**Step 2: Verify**

Run: `npm run build`
Expected: build succeeds. Vercel will pick up the new cron on next deploy.

> Note: Vercel Hobby allows up to 2 crons at daily cadence. This config uses both slots. If more granular sync is needed later, add a free GitHub Actions workflow that hits `/api/cron/sync-matches` every 5 minutes.

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "Register sync-matches cron (daily safety net for match history)"
```

---

### Task 9: Remove the self-test route and internal export

**Files:**
- Delete: `src/app/api/admin/self-test/route.ts`
- Modify: `src/lib/match-history.ts` (remove `__INTERNAL_TEST__` export and `*NS` helpers)

> Alternative: keep the self-test route as a permanent health check. Ask the user before executing this task. If kept, skip deletion but still remove any NS helpers that aren't used.

**Step 1: Confirm with user whether to keep or delete the self-test route.**

**Step 2 (if deleting): Remove the route file and the `__INTERNAL_TEST__` export.**

```bash
rm src/app/api/admin/self-test/route.ts
```

Edit `src/lib/match-history.ts`: delete the `__INTERNAL_TEST__` export block and the `readAllMatchesNS` / `writeMatchesNS` helpers.

**Step 3: Verify**

Run: `npm run build`
Expected: builds cleanly.

**Step 4: Commit**

```bash
git add -A
git commit -m "Remove temporary self-test route"
```

---

### Task 10: Full end-to-end smoke test

**Files:** None modified.

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Walk through the user-facing surfaces**

- Open `http://localhost:3000/matches` — confirm match list renders, week groups show expected counts, streak banner shows correct value. Expand a week group and verify game cards look correct. Open a match detail page.
- Open `http://localhost:3000/records` — confirm "longest win streak" matches matches page.
- Open `http://localhost:3000/` (home) — confirm scoreboard/matches preview section renders.

**Step 3: Fire the sync cron twice in quick succession**

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-matches
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-matches
```
Expected: Both return 200. No match duplication on the UI.

**Step 4: Check Redis state directly** (Upstash console)

- `HLEN match-history:matches` — sanity check count
- `GET match-history:meta` — `schemaVersion: 2`
- `EXISTS match-history` — `0` (legacy key gone)

**Step 5: Commit a nothing-else note to mark plan complete** (optional — skip if no files changed)

```bash
git log --oneline | head -15  # verify all 8-9 tasks committed
```

---

## Rollback

If anything goes wrong in production:
1. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://bardownski.com/api/admin/reset-match-history` — wipes all match-history Redis keys.
2. Revert the deploy.
3. Next page load re-seeds from the 5-game API window (partial recovery) and kicks off a new migration next time Redis is repopulated.

## Out of scope (deferred)

- Fixing synthetic forfeit timestamps (they still land near `Date.now()` when auto-detected).
- Multi-season archive / historical drilldown.
- GitHub Actions external pinger (documented as follow-up).
- Fixing the pre-existing TS `process`-not-found diagnostic (seems to be an editor/tsconfig quirk, doesn't break build).
