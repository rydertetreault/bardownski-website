# Hockey interior retouch and Player lab

## Local entry points

- Actual app: **http://localhost:3000**
- Player comparison: **http://localhost:3000/lab#comparison**
- Line builder: **http://localhost:3000/lab#lines**
- Approved homepage reference remains **http://localhost:3500/variation-4**.

This work is local only: no deployment, commit, Redis writes, season activation, or captain/jersey announcement.

## Interior design refresh

`SiteTheme.tsx` adds `.hockey-interior` only on non-homepage hockey routes. `hockey-retouch.css` applies the homepage's condensed display face, black panels, teal/lilac accents, purple rules and selected flat teal/light section treatments. Matches, Roster, Stats, Records, Gallery, Highlights, News and Awards retain their existing layouts, content, filters, disclosures and media. Editorial stills are monochrome; Gallery preserves original image colors. FC and the approved homepage are outside this scope.

`HockeyMotion.tsx` adds finite heading entrances without scroll locking or moving images. `hockey-motion-preference.ts` shares the existing homepage `bd-home-motion` preference, with an in-memory fallback when browser storage is blocked. Existing Framer cards/dialogs, hover video previews and the Records counter/showcase respect the same pause setting. CSS position chapters expose static content when paused or reduced motion is requested. All hockey pages now bypass the old autoplay splash; FC retains its prior behavior.

No-JS rendering does not depend on the motion enhancer. Existing client-only Records behavior was not redesigned.

## Comparison lab relocation

Comparison-only code now belongs under `src/app/lab/`:

- `page.tsx`: dedicated route, metadata, archive reads and section navigation.
- `components/HeadToHeadCard.tsx` and `ComparisonCharts.tsx`: original independently selectable players/seasons, skater/goalie roles, totals/per-game basis, radar, grouped bars, scatter, trend, data tables and scoring explanations.
- `comparison-lab.css` and `lab.css`: standalone scoped styling; no Stats CSS dependency.

Stats no longer imports or mounts the comparison. Main navigation adds **Player lab**, and hockey switches to its existing menu at a wider breakpoint to accommodate the extra item without crowding FC navigation.

## Line builder

UI: `src/components/lines/LinePlanner.tsx` and `line-planner.css`.
Pure calculations: `src/lib/line-chemistry.ts`.

- Choose available skaters, then a pair, trio or five-skater draft.
- Native labeled selectors allow arbitrary **user-assigned** positions. Duplicate picks swap slots rather than duplicating a player.
- Recommendations enumerate exact-size combinations only within the available pool. Rank by sample-adjusted wins, observed win rate, club goal difference/game or club goals for/game; minimum shared games is 1, 3, 5 or 10.
- Every member of a selected group must appear in the same saved game. Additional teammates may have played. No inference of historical LW/C/RW/LD/RD or actual 3s/6s format is made.
- Show shared games, W–L (and recorded ties if present), observed win rate, club GF/GA/GD per game, separate pair evidence and the supporting game list.
- Incomplete drafts have no full-line stats. Complete unobserved combinations show unavailable rates, not zero chemistry. Pair samples are never summed into a full-line sample.
- Save/restore stores one local draft (`bardownski-line-draft-v1`); nothing is published or sent to the server. Restoring sanitizes unknown players, duplicate slots, malformed data and unavailable players. Storage errors leave the tool usable.

### Evidence and limitations

The reference at chelstats.app informed the available-player/line-evaluation workflow; its implementation and projected rating model were not copied. The reference currently resolves to a different NHL 27 club. That identity is **not** silently connected to this site's pending 2026–2027 integration.

The new route reads `getAllMatchesForRecords(FROZEN_CHELSTATS)`, whose implementation is read-only, and the bundled `season-award-games.json`. It does not call `pollAndAccumulate` or the display-only 21-day match-history adapter. Current-season matches are never merged into the NHL 26 archive.

The bundled source has 75 saved game IDs, of which 72 pass score consistency checks. Three inconsistent records are excluded **without editing the original data**. The richer saved archive may add records, so the UI reports actual source/usable/excluded counts rather than hardcoding them.

Deduplicate entire records by game ID, with valid full records taking priority over partial local sheets. Never combine disjoint player lists to invent a lineup. Quarantine contradictory equal-authority scores. Exclude private matches, forfeits, invalid/missing scores, opponents and identified goalie appearances; skater identities such as Ryder remain eligible for their recorded skater appearances.

“Sample-adjusted wins” uses the 95% Wilson lower bound as a descriptive ranking, not a displayed chemistry score or predicted win probability. Under five shared games is a very small sample; all results remain limited by missing players, opponents, unknown ice time and incomplete coverage. Frozen placeholder win percentages, playstyles and club goals-against totals are **not** used as prediction inputs.

Current-season setup and cron gates are unchanged. Historical awards, statistics, names and original match scores are preserved.

## Verification

```sh
for test in tests/*.test.ts; do npx tsx "$test" || exit; done
npx tsc --noEmit
npm run build

# With a running local application:
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs \
CHROME=/path/to/chrome \
AXE_PATH=/path/to/axe-core/axe.min.js \
node scripts/check-player-lab.mjs

# Existing homepage/isolation regression:
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs \
CHROME=/path/to/chrome \
AXE_PATH=/path/to/axe-core/axe.min.js \
node scripts/check-homepage.mjs
```

`SITE_URL` optionally points either browser script at an optimized local `next start` instance. `AXE_PATH` is optional; omit it only when axe is not installed.

The lab browser suite covers all nine interior routes at 1440, 1024, 768, 390 and 320px, comparison relocation/controls, available-player selection, slot swapping, sample evidence, save/restore and malformed drafts, reduced motion and paused legacy cards, blocked-storage pause, Records showcase synchronization, and hockey/FC/home isolation. Axe checks cover the new Player lab at desktop and phone widths; this is not a complete manual accessibility audit of every legacy route.

Focused lint is clean. Full-repository lint still includes unrelated legacy/worktree issues documented in prior handoffs.
