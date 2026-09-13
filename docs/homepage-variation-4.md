# Homepage: Variation 4 production handoff

> **2027 reveal:** the approved film and announcement are now prepared for publication; see [season reveal handoff](season-reveal-2027.md). Older “announcement pending” notes below describe earlier stages.


> **Tracking is now active.** This document records an earlier stage. See [NHL27 activation](tracking-active-2026-2027.md) for current data wiring, preserved archives, hosted collection and deployment details.


> Follow-up: the comparison lab now lives at `/lab`, and other hockey tabs share this visual identity. See [Player lab and interior retouch](player-lab-and-interior-retouch.md). The later pass skips the old splash on all hockey routes, not only `/`.

## Scope and local URLs

The approved Variation 4 layout is ported into the real Next.js homepage at **http://localhost:3000/**. The reference demo at **http://localhost:3500/variation-4** is a separate local preview, not the production route. Start the real application with `npm run dev -- --port 3000`; do not mistake the demo server for application verification. The reference files under `demos/homepage/` are not runtime dependencies and were not modified by this test/documentation handoff.

This is a local implementation and verification handoff only. **No deployment, remote mutation, tracking activation or announcement publication is included.**

## Port map

- `src/app/page.tsx`: server route, metadata, published articles through `getAllArticles()`, and the three-card news limit.
- `src/components/homepage/HomepageClient.tsx`: server-renderable `.bd-home` wrapper and client enhancement lifecycle.
- `src/components/homepage/views.js`: generated layout and detail markup, including escaped dynamic article content.
- `src/components/homepage/home-data.ts` and `archive.json`: preserved historical content and model-score inputs; not a current-season feed.
- `src/components/homepage/interactions.js`: delegated controls, details dialogs, archive/season/album interactions and explicit video playback.
- `src/components/homepage/runtime.js`, `motion.js`, `content-motion.js` and `refined-motion.js`: scoped enhancement, motion and cleanup.
- `src/components/homepage/homepage.css` and `production.css`: port and application overrides. Selectors stay inside `.bd-home`, except homepage-guarded document scrolling and view-transition rules. Root state classes such as `.motion-enabled` belong on the same root; fonts and animations are namespaced.
- `public/images/homepage/`: generated layout imagery, archive images, posters, local font and its license. `public/videos/homepage/`: locally served archived clips, requested only after selection.
- `src/components/layout/Navbar.tsx` and `SplashScreen.tsx`: real navigation integration and homepage-only splash bypass. The port does not introduce a duplicate global header or main landmark.

## Content and behavior contract

Section order is **hero → recent matches → archived weekly selection → archived MVP tracker → highlights → published news → past seasons/captains → previous award winners → club photos**. Keep the approved interludes, disclosures, section cuts and footer alongside that order.

- Recent results show four saved **2025–2026** games, in order: The Buffalo Wings (10–4), Thrasherz (6–5), BILLS 717 (9–8), Tkachuk You (1–5). The expanded dialog contains eight saved results and discloses incomplete archive/player coverage.
- The weekly selection is dated April 22, 2026 and explicitly archived. Archived model scores are not votes or betting odds. Prior awards remain historical until new awards are presented.
- The six historical season tabs retain their start-year IDs and captain register, from 2020–2021 through 2025–2026. Do not invent a 2026–2027 captain, completed season, fixture or score. Historical images may be from a later season and are not verified contemporaneous portraits.
- Published news uses the existing article layer, capped at three cards, with real `/news/[id]` links. An empty supplied feed must not manufacture demo news. IDs, titles, categories, dates and summaries must remain escaped in cards and dialogs while preserving literal text and paragraph breaks.
- Section links resolve to unique real anchors. Plain primary news clicks may open the enhanced dialog; modified clicks retain native link behavior. Server markup and native disclosures remain useful without JavaScript.
- Clips are archived gameplay, not a new-season reveal. Initial markup has posters, not eager video sources. Playback requires explicit selection and supports failure handling. Dialog close/reopen and motion cleanup must not strand focus or stale transitions.
- Generated homepage assets remain in their own namespace. The supplied jersey photo is only a palette reference, not a published asset or a source for crops.

See [the season handoff](hockey-2026-2027.md) for the unchanged current-season/legacy archive boundary and future integration requirements.

## Verification

Focused regression tests and lint:

```sh
npx tsx tests/homepage-live-layout.test.ts
npx tsx tests/homepage-runtime.test.ts
npx eslint tests/homepage-live-layout.test.ts
npm run lint
```

The focused homepage run passed **13/13 tests**, and focused ESLint passed. Repository-wide `npm run lint` was also run and reports out-of-scope errors, including `.worktrees/position-aware-mvp/`; this handoff does not claim a clean full-repository lint result.

The 13 homepage tests exercise rendered production markup, real delegated handlers through a small HTML-parser event adapter, route imports/navigation, the four-result archive, truthful historical labels/captains, published news and injection payloads, local assets, and parsed CSS selector/asset scope. The click adapter supplies a native primary-button event (`button: 0`, no modifiers) and the ID regression uses an actual anchor; it must not bypass the anchor guard. These tests do not simulate browser layout, media loading or animation.

Related integration checks:

```sh
npx tsx tests/hockey-season.test.ts
npx tsx tests/season-awards.test.ts
npx tsx tests/weekly-update-paused.test.ts
npx tsc --noEmit
npm run build
```

With the application running on port 3000, the browser suite is:

```sh
node scripts/check-homepage.mjs
```

Its environment options are `SITE_URL` (defaults to `http://localhost:3000`), `PLAYWRIGHT_MODULE` (defaults to `playwright-core`), `CHROME` (local Chromium executable), and optional `AXE_PATH` (local `axe.min.js`). Use installed local tooling; no deployment or remote mutation is needed.

### Verified in this resumption

- All `tests/*.test.ts` passed, including 13 homepage markup/data/CSS tests and the runtime regression for late callbacks after disposal.
- `npx tsc --noEmit`, focused ESLint for the homepage integration, and `npm run build` passed. Full-repository lint still has unrelated legacy/worktree errors.
- `scripts/check-homepage.mjs` passed against both the dev application and an optimized local `next start` build. The temporary production-check server was stopped afterward; the normal app remains on port 3000.
- Browser coverage: **1440, 1024, 768, 390 and 320px**, image decoding, all six history tabs, anchor clearance, dialogs/nested details/focus return, keyboard disclosures, video playback/cleanup/failure recovery, rapid reopen, modified news links, album controls, motion persistence and live reduced-motion changes, repeated hockey/FC client navigation, mobile menu and no-JS content.
- Automated axe WCAG A/AA checks passed at desktop and phone widths. This is automated coverage, not a complete manual accessibility audit.
- The reference demo, current-season tracking gates, frozen archive totals and unrelated site edits were preserved. **Nothing was deployed or committed.**

To regenerate the scoped stylesheet after a deliberate approved-demo CSS update, run `node scripts/import-homepage-css.mjs`, then rerun the tests and browser suite. This command is deterministic; don't manually patch generated `homepage.css`.
