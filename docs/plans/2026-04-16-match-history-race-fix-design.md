# Match-History Race Fix — Design

**Date:** 2026-04-16
**Status:** Approved, pending implementation plan
**Author:** Ryder + Claude

## Problem

Matches periodically disappear from the Redis-backed match history after
they were previously recorded. This recurs despite an earlier schema
migration and manual patching of `MANUAL_FORFEITS`. The Chelstats API
only returns ~5 recent games, so once a match rotates out of the API
window, Redis is the only source of truth — losing it from Redis means
it is gone forever.

Observed symptom (2026-04-16): the Apr 6–12 week group previously held
7 games and an 11-game win streak was intact; today the group is short
games and the streak count is broken.

## Root causes

Four independent failure modes in `src/lib/match-history.ts`, any one
of which can delete matches:

1. **No background sync.** `src/app/api/cron/sync-matches/route.ts`
   exists but is not registered in `vercel.json` (only `weekly-update`
   is). Sync only runs when a human loads a page. If 5+ games are
   played between visits, games rotate out of the API before we see
   them.

2. **Read-modify-write race in `pollAndAccumulate`** (lines 73–148).
   Concurrent page loads both GET the same state, each merges their
   own new matches, and the second SET clobbers the first. Matches
   the first writer added are silently lost.

3. **Auto-reset on API total decrease** (lines 91–103). If the
   Chelstats API returns a smaller total than we have stored — e.g.
   due to a transient glitch or partial response — the code assumes
   "new season" and overwrites the entire accumulated history with
   just the 5 matches currently in the API window. All older matches
   are unrecoverable.

4. **Synthetic forfeit timestamps** (lines 122–134). Detected
   forfeits get timestamp `latestMatchTs + (i+1)*60`, placing them
   "just after the most recent match" rather than at their real time.
   This is why `MANUAL_FORFEITS` has to be hand-dated.

The 21-day retention prune is *not* a cause here (Apr 6 is only 10
days old).

## Design: Option A — race-safe hash storage, no auto-reset, registered cron

### Redis layout (new)

```
match-history:matches    → Hash<matchId, ClubMatchJSON>
match-history:forfeits   → Hash<forfeitId, ForfeitEntryJSON>
match-history:meta       → JSON { lastRecord, schemaVersion }
```

Splitting the one JSON blob into three keys eliminates whole-record
contention and makes each data category independently safe.

### Writes (race-safe)

- New API match detected → `HSET match-history:matches <id> <json>`.
  Atomic per match; two concurrent syncs cannot clobber each other's
  additions because `HSET` on different fields is commutative.
- New forfeit detected → `HSET match-history:forfeits <id> <json>`.
- `lastRecord` update → separate key write. If this ever has a bad
  value, it cannot damage the match list.

### Reads

- `HGETALL match-history:matches` + `HGETALL match-history:forfeits`
  → combine → filter to 3-week window at render time.
- **Do not delete from the hashes when pruning.** The render filter
  hides old matches; actual deletion is deferred. Optional GC can be
  added later if Redis size becomes an issue (it won't at current
  volume).

### Remove auto-reset

Delete lines 91–103 of `match-history.ts`. If Chelstats returns a
lower total than stored, log a warning and skip the sync. Never
wipe.

### Manual season reset

New protected endpoint: `POST /api/admin/reset-match-history`, auth'd
by `CRON_SECRET` (reusing existing secret). Clears all three keys.
Called by hand only, when an actual new season starts.

### Migration

One-time, automatic, idempotent:
- On `pollAndAccumulate` entry, if `match-history:meta` is missing or
  has `schemaVersion < 2`, read the legacy `match-history` blob,
  `HSET` every match and forfeit into the new hashes, write
  `match-history:meta` with `schemaVersion = 2`, then `DEL` the
  legacy key.
- Migration is guarded by a Redis `SET NX` lock so concurrent
  requests can't double-migrate.

### Cron

Add to `vercel.json`:
```json
{
  "path": "/api/cron/sync-matches",
  "schedule": "0 12 * * *"
}
```
Daily at noon UTC (fits Vercel Hobby's daily-cadence rule). Page-load
sync continues to catch all matches during active hours; this cron
is the safety net for long quiet stretches.

Optional follow-up: free external pinger (GitHub Actions every 5
min) hitting `/api/cron/sync-matches` with `Authorization: Bearer
$CRON_SECRET` for tighter coverage without Vercel Pro.

## Testing

- Unit: simulate two concurrent `pollAndAccumulate` calls with
  different new matches → assert both land in Redis.
- Unit: simulate API response with `totalGames < stored` → assert
  no data is deleted and a warning is logged.
- Unit: run migration against a seeded legacy blob → assert hashes
  populated, legacy key deleted, second run is a no-op.
- Local smoke: load `/matches` page, verify migration runs once,
  subsequent loads do not re-migrate, displayed matches match
  pre-migration state.

## Out of scope

- Fixing synthetic forfeit timestamps (separate cleanup; the user
  still hand-curates `MANUAL_FORFEITS` for correctness).
- Redis GC beyond the render-time filter.
- Multi-season archive UI.

## Immediate hotfix (already applied in same commit as this doc)

Added two `MANUAL_FORFEITS` entries (Apr 11, Apr 12) to restore the
correct game count and win-streak length for the Apr 6–12 week group.
