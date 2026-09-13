# Stats page rework

## Layout and data

- `/stats` now uses the home page's Barlow display face, club photography, teal hero/closing, cream stat book and purple weekly feature rather than the black interior palette.
- The current-season MVP race comes before the player stat book, with an explicit tied-leader feature, full standings and scoring explanation.
- One accessible season tablist contains current and archived snapshots. Arrow keys, Home/End and roving focus are supported; changing seasons resets native player disclosures. Missing current data never selects archived data automatically.
- Category cards, visible skater/goalie tables with sticky player columns, and full player disclosures retain missing values as dashes. `SaveEntry.gaa` now preserves member-snapshot GAA; reported zero shutouts are retained by the adapter.
- Player of the Week is a single season award-wins list (Rank / Player / Wins). Current roster members without a recorded win appear with zero; unavailable history displays dashes instead. Winners no longer on the roster remain listed. The weekly race, featured winner, photograph, performance scores and total-award widgets were removed per feedback.
- `calculateWeeklyAwardHistory(matches, asOf)` reuses the unchanged weekly scoring/validation for each observed completed week. The page supplies only accumulated current NHL27 matches. Shared winners each get one win; cumulative ties share ranks. Current/provisional leaders never increment wins.
- Counts are reconstructed from captured games, not an immutable or complete award ledger. Late source corrections can change results. Source IDs are retained; unresolved ID-less players are not guessed across weeks. Stale/unavailable/empty states are distinguished.
- Stats-specific dark overrides were removed from `hockey-retouch.css`; other route styling remains owned by those routes. Existing `#standings`, `#numbers` and `#archive` anchors remain; `#weekly-honors` is the honors entry point and `#weekly-tracker` remains only as an empty legacy anchor.

## Verification

- `npm run build`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- Targeted ESLint on new/changed stats UI, history calculation, tests and browser script: passed.
- 67 targeted tests across stats client/page, weekly history, hockey awards/season/tracker, charts, season awards and API parsing: passed.
- Full test inventory at verification: 110 passed, 1 failed. Failure is `tests/player-comparison.test.ts`, an existing Player Lab markup assertion requiring `<h1>Player lab</h1>` while concurrent Player Lab changes have different markup. The stats-specific assertion in that file was updated for one unified current/archive client; unrelated Lab assertions were not altered.
- `scripts/check-stats-page.mjs`: Chromium passed at 1440, 768, 390, 320px. Covers season clicks/keyboard wrap/Home/End/focus, ARIA panels, reset disclosures, horizontal containment, anchors, full stats-content WCAG axe checks, client-side home-to-stats navigation, no-JS default content and no runtime/hydration errors.

Browser script uses optional `PLAYWRIGHT_MODULE`, `CHROME`, `AXE_PATH`, and `SITE_URL` environment variables; browser dependencies were reused outside the repository. No package changes required.
