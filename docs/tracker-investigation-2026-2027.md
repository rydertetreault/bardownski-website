# NHL 27 tracker investigation — September 13, 2026

## Scope

Read-only investigation requested before resuming Stats, Matches and Player Lab tracking. No tracker activation, enrollment, cron/admin calls, environment changes, Redis writes, deployment or application-code changes were performed. Local credential presence was checked without printing values; production Vercel environment/scheduler configuration was not independently inspected.

## Verified current source

Public GET verified at **2026-09-13 06:05 UTC**:

```text
https://chelstats.app/api/clubs/stats?teamname=Bardownski&console=common-gen5&teamId=29202&strict=true
```

| Property | Observed value |
| --- | --- |
| Club | Bardownski |
| Club ID | `29202` |
| Platform | `common-gen5` |
| Title | `clubRanking.entry.gameTitle: NHL27` |
| Club record | 6–4–0, 10 total games |
| Goals | 35 for, 24 against |
| Returned members | `Mhut8`, `u4 Pablo`, `Julio 3026`, `Rydayro` |
| Detailed recent games | 5 regular, 0 finals, 0 private |
| Recent-game dates | September 12–13, 2026 UTC |

The exact roster overlap, returned club identity, recent dates and NHL27 metadata are strong evidence this is the continuing team, not an unrelated namesake. These are observations at the stated time, not permanently fixed totals or formal ownership verification.

No explicit game/year parameter is needed by the observed frontend stats request. Pin `teamId` as well as the platform, and validate response identity/title before accepting data. Individual raw games did not carry their own title field; their provenance needs to be attached by the verified adapter.

The old exact name `Bardownskii` returned HTTP 200 with JSON string `"Error"`; an old-ID request for `149602` failed with HTTP 502. That establishes unsuccessful current retrieval, not that old remote history was definitively deleted.

### History and chemistry limits

The public club-history listing for `29202` returned no stored games. Its tracker chemistry source reported zero tracked games. The all-period endpoint reported `tracked: false`, with 0 tracker games and 5 EA recent games. EA-source chemistry reported 5 games but empty pair maps.

- Club/member totals cover 10 games, while only 5 detailed games were verified available.
- “All” available period data is not equivalent to complete season history.
- Raw recent-game records contain `players[clubId][playerId]`, including player names, positions, platform and stats. Chemistry/period summaries alone do not establish each game's participants.
- Preserve stable source player IDs in the new ingestion model, not only mutable display names.
- No complete backfill for the other five games was established. Do not fabricate them or classify an unexplained record gap as forfeits.
- Public detail lookup worked for a known recent match ID, but that does not establish discovery/recovery of every older game.

## Why configuration alone is insufficient

Current local implementation:

1. `src/lib/chelstats.ts` hardcodes `Bardownskii`, `common-gen5`, club `149602`.
2. `fetchChelstatsData()` always returns `FROZEN_CHELSTATS`. The retained live function is not selected by an environment flag.
3. Match transformation independently selects club `149602`; changing just the URL would silently discard the new club's matches.
4. `src/lib/hockey-season.ts` always returns `awaiting-setup`, null data and no matches. It has no unavailable/stale variants yet.
5. Legacy match-history readers are now read-only, despite stale comments describing page-load sync.
6. `vercel.json` has no cron schedules; local `SEASON_LIVE` is unset.
7. `/api/cron/sync-matches` still calls the frozen fetcher and old accumulator if its flag is enabled.
8. Weekly/POTW has an independent literal code pause and legacy article/snapshot state; leave it paused for the initial data reconnection.

**Do not set `SEASON_LIVE=true` against the existing writer.** It does not connect the new feed and could mutate the legacy baseline or create unsupported synthetic forfeits.

### Existing infrastructure

Local Upstash URL/token, cron secret and Discord credentials are configured (values not printed). Read-only Redis PING succeeded. Existing `match-history:matches` contains **102 matches**, all dated **March 7–July 22, 2026**. No September games were found in that hash. Its metadata reports schema 2 but a baseline of **2–20–0**, inconsistent with the preserved final 207–144–15 season. This is another reason not to reuse the baseline. No baseline repair or archive reset was performed.

An existing Redis account can be reused with separate keys; there is no evidence a new database or new public Chelstats credential is necessary. Production credentials and hosting tier still require deployment-side verification.

## Player Lab must share the new feed

`/lab#comparison` already conditionally accepts `getHockeySeason().data.members`, so correct current-season totals can flow through its existing comparison adapter.

`/lab#lines` needs explicit changes:

- It always reads the frozen roster and legacy game archive today.
- Build current-season chemistry from full persisted current-season game/player records, not stripped match-list rows or season aggregate totals.
- Call `buildChemistryDataset(currentGames, [])`: its default second argument adds the bundled NHL26 archive, which must never enter a current-season calculation.
- Keep current and archived datasets as separate selections; parameterize the planner's hardcoded season/366-game/archive copy.
- Scope saved local drafts by title, season and club; reset selections on dataset change.
- Retain explicit sample sizes, unmatched/partial coverage, goalie exclusions and missing-evidence behavior. Do not blindly adopt the remote projected chemistry rating, especially while pair maps are empty.

The homepage also still renders archived match/MVP/weekly data independently of `getHockeySeason()`. A later homepage feed update needs intentional wiring; it will not become live automatically when Stats is connected.

## Minimum safe implementation

1. **New source adapter**: configurable NHL27/platform/club ID, ID-pinned fetch, response validation, explicit timeouts and structured unavailable/stale states. Keep the archive fetcher intact. Update array/numeric schema types and avoid carrying old per-player position overrides into new match roles.
2. **Separate persistence**: e.g. `hockey:nhl27:2026-2027:common-gen5:29202:{matches,snapshot,meta}`. No migration/reset/reuse of `match-history:*`. Preserve full per-game players, source identifiers, timestamps and successful-fetch/persistence metadata.
3. **Safe ingestion**: idempotent match updates, guarded concurrent snapshot advancement, no deletion on record reset, no inferred forfeits for missing games, explicit reporting of storage failure rather than a false successful zero-count sync. Handle incomplete/newly corrected upstream records deliberately.
4. **Wire one shared current-season boundary** into Stats/MVP, Matches/detail routes and both Player Lab panels. Never substitute last year's frozen totals on fetch failure. Keep archives and honors untouched.
5. **Restore ongoing collection**, not only page-load fetching. Last year's git history records a daily Vercel safety net plus page-driven syncing; five-minute Vercel schedules were rejected under the then-current Hobby plan. Verify today's hosting limits and use a compatible external scheduler or eligible plan for roughly five-minute polling, adjusted to upstream rate limits/cache behavior. Daily-only fetching can miss a five-game window.
6. **Fix fail-closed cron/admin auth**: sync and both admin handlers presently allow the literal `Bearer undefined` comparison when CRON_SECRET is absent. Weekly already has the required nonempty-secret check.
7. **Keep articles/POTW separate** until their generators, keys, baseline and idempotency are migrated. Their existing generators still call the frozen fetcher themselves.

### Before activation

Use mocked source/storage tests for wrong club/title, malformed or partial responses, real zero values vs missing values, duplicate/concurrent polls, corrected matches, partial persistence failure, a new-season record reset, stale responses, missing Redis, and preserved full player details. Verify no legacy key is written and no NHL26 fallback enters current chemistry. Test both the current and archive UI, explicit data freshness, and authenticated scheduler behavior. Verify production configuration and a read-only archive inventory/backup before the first authorized persistence run.

## Outcome

The current source is available and has familiar players. Reconnection is feasible using the existing infrastructure, but requires a small new-season integration rather than simply re-enabling last year's flag. Investigation complete; syncing remains disabled.
