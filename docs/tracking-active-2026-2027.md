# NHL27 tracking activation

## Source and ownership boundaries

Current: **NHL27 / 2026–2027 / common-gen5 / Bardownski / club 29202**. The ID-pinned public Chelstats response is validated on every refresh, including title, top-level/ranking/nested club identities and core numeric fields. No NHL26 per-player position overrides are reused.

- API adapter: `src/lib/nhl27-api.ts`
- Persistence/refresh: `src/lib/hockey-tracker.ts`
- Server data boundary: `src/lib/hockey-season.ts`
- Client-safe constants/types: `src/lib/hockey-season-state.ts`
- Standalone collector: `npx tsx scripts/sync-hockey.ts`
- Authenticated site endpoint: `/api/cron/sync-matches`
- Hosted schedule: `.github/workflows/collect-nhl27.yml`

Current Redis keys are exclusively `hockey:nhl27:2026-2027:common-gen5:29202:{matches,snapshot,meta,sync-lock}`. Never point the current writer at legacy `match-history:*` keys.

## Last season is preserved

Before enabling writes, all **102 stored NHL26 matches** were exported read-only into `src/lib/archives/nhl26-match-history.json`. Its `sha256` verifies the sorted original match payload. The export also preserves original metadata and stored forfeits without treating that metadata as current season truth.

- Original Redis archive keys are unchanged.
- `getAllMatchesForRecords()` merges the code-backed copy with the read-only archive, allowing older match details to survive Redis failure.
- Final 2025–2026 totals remain in `chelstats-frozen.ts`; earlier published seasons remain in the Discord snapshot integration.
- Stats keeps a separate historical selector. Matches exposes all 102 saved historical results, not just the old display window. Explicit season-tagged detail URLs prevent current→archive fallback.
- Records and award winners remain historical. No archive reset or fabricated new forfeits.
- Legacy destructive reset/forfeit maintenance routes are retired (authenticated requests return 410). Missing-secret authentication fails closed.

## Persistence and health

A 60-second UUID lease fences concurrent/expired syncs. The adapter has a 20-second response-body timeout. A Lua operation preflights key types, stored JSON and incoming encoded strings before any writes; then commits match updates, snapshot and metadata without interleaving. Original JS JSON strings preserve empty arrays and numeric precision. No history is deleted on a record decrease. Decreased totals and out-of-order retrievals cannot replace a newer snapshot. Existing matches with more player detail are not downgraded by a shorter player list.

Five-minute page checks reuse persisted data; scheduled collection independently runs the same pipeline. A failed refresh shows the last saved **current-season** data with a stale message. No saved current snapshot means unavailable, never old stats presented as new. Retrievals older than 15 minutes are stale. `fetchedAt` means **Feed checked**; it does not promise Chelstats regenerated its own underlying cache. `rankingUpdatedAt` is retained as ranking metadata, not a whole-response version watermark.

The first verified collection reported **6–4–0 / 10 season games**, with **5 full detailed matches saved**. Repeat sync retained 5 distinct IDs. Upstream only exposes those five recent detailed matches; the other five results were not invented. Four of those recent matches are flagged as DNF/forfeit by source result evidence and correctly excluded from line recommendations, leaving one current complete-game coappearance sample at activation.

## Consumers

- `/stats`: current totals/MVP + feed/save time and coverage; historical seasons separate.
- `/matches`: accumulated current matches + preserved historical archive.
- `/lab#comparison`: current member totals and older seasons independently selectable.
- `/lab#lines`: current dataset by default, explicit 2025–2026 archive option. Current calculations pass `[]` as fallback and never merge bundled legacy games. Current goalie-only members are excluded from skater drafts; drafts are scoped by title/platform/club/season.
- Homepage keeps the approved archived feature content, with a truthful connection banner linking to current Season tracking.
- Weekly articles/POTW remain paused; they require a separate publishing rollover and are not enabled by match collection.

## Operations

GitHub Actions is chosen because this repository has working authorized Actions access and last year's Vercel plan rejected subdaily cron. Workflow cadence is `2-59/5 * * * *`, with manual dispatch and a single concurrent collector. It uses repository secrets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; no tokens are committed or printed. The workflow has read-only GitHub permissions and a four-minute timeout.

GitHub scheduling is **best-effort**, can be delayed, and public schedules may be disabled after 60 days without repository activity. The site's freshness notice exposes delayed collection. The timer does not rely on local machine uptime or site visits. Monitor Actions failures; no scheduler can recover games already missing from upstream without an independent backfill source.

```sh
# Manual collector, .env.local loaded locally; env secrets supplied by Actions
npx tsx scripts/sync-hockey.ts
# Trigger hosted collector
gh workflow run collect-nhl27.yml --repo rydertetreault/bardownski-website
# Latest run status
gh run list --workflow collect-nhl27.yml --repo rydertetreault/bardownski-website --limit 5
```

## Verification

```sh
for test in tests/*.test.ts; do npx tsx "$test" || exit; done
npx tsc --noEmit
npm run build
# Deliberate integration test: random diagnostic keys only, cleaned afterward
npx tsx scripts/test-tracker-redis.ts
# With application running; optional SITE_URL for production build
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROME=/path/to/chrome \
AXE_PATH=/path/to/axe.min.js node scripts/check-live-tracking.mjs
```

The real Redis protocol check verifies original JSON array preservation, replay, lease ownership, record-decrease protection and no early match writes when later preflight JSON is invalid. Unit tests never activate real collection. Browser tests verify live stats, current and archive line data, separate draft restoration, explicit detail routing, full historical record and new lab accessibility at desktop/phone sizes.
