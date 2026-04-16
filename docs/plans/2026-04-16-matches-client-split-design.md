# MatchesClient Component Split — Design

**Date:** 2026-04-16
**Status:** Approved, ready for implementation plan
**Goal:** Split `src/app/matches/MatchesClient.tsx` (1692 lines) into focused sub-components to improve maintainability, without changing any user-facing behavior.

---

## Context

Follows the exact same pattern that shipped for `StatsClient.tsx` — see `docs/plans/2026-04-16-stats-client-split-design.md` and `docs/plans/2026-04-16-stats-client-split-plan.md` for the proven template. This is the larger sibling refactor.

`MatchesClient.tsx` currently contains:
- Top-level helpers: `tooltipAlign`, `getResult`, `getWeekPeriods` + `WeekPeriod` interface
- 12 internal components: `LatestMatchHero`, `TeamRow`, `ScoreCard`, `ChartHeader`, `ResultsStrip`, `GoalsTrendChart`, `ShotDiffChart`, `WinPctChart`, `TrendsPanel`, `WeekStatsPanel`, `StreakBanner`, and the main `MatchesClient` export.

The file is already internally well-structured with clear section comments. Sub-components are self-contained and take props cleanly. Splitting is mechanical relocation.

## Constraints

- **Must not change user-facing behavior** — visual, interactive, or data-fetching.
- **No test suite exists** — verification is `npm run build` after each step + manual `npm run dev` click-through.
- **Pure mechanical extraction** — no drive-by cleanup, no type consolidation, no prop renaming. The one exception: extract the shared `getResult` helper to a small `utils.ts` so sub-components can reference a single source of truth without duplicating a 7-line function 5 times.

## Isolation

- Git worktree at `.worktrees/matches-client-split/`
- Branch: `feature/matches-client-split`
- One PR for the full split.

## File breakdown

Target directory: `src/app/matches/components/` (plus one helper at `src/app/matches/utils.ts`).

| File | Contents | Approx lines |
|---|---|---|
| `utils.ts` | `getResult(match)` helper | ~10 |
| `components/LatestMatchHero.tsx` | `LatestMatchHero` — top-of-page latest result card | ~275 |
| `components/ScoreCard.tsx` | `ScoreCard` + `TeamRow` (private helper) | ~220 |
| `components/StreakBanner.tsx` | `StreakBanner` — Stars & Stripes win/loss streak banner | ~90 |
| `components/WeekStatsPanel.tsx` | `WeekStatsPanel` — week-specific summary + games | ~115 |
| `components/TrendsPanel.tsx` | `TrendsPanel` + `ChartHeader`, `ResultsStrip`, `GoalsTrendChart`, `ShotDiffChart`, `WinPctChart`, `tooltipAlign`, `RESULTS_COLLAPSED_COUNT` (all private internals) | ~620 |
| `MatchesClient.tsx` (modified) | Season record bar, streak banner slot, week selector, divider, main layout switch (weeks vs. detail) | ~280 |

**Grouping rationale:**
- `ScoreCard` bundles `TeamRow` — `TeamRow` is only used by `ScoreCard`.
- `TrendsPanel` bundles `ChartHeader` (used by all 3 charts), `ResultsStrip`, and the 3 chart components (`GoalsTrendChart`, `ShotDiffChart`, `WinPctChart`). They form one cohesive Analytics module. This matches the `HeadToHeadCard` precedent (which kept `GenericRadarChart` + radar math + H2H types in one file).
- `tooltipAlign` is private to the charts inside `TrendsPanel.tsx` — no need to elevate it.
- `getResult` goes to `utils.ts` because it's used in 5+ places. This is the one deliberate deviation from pure mechanical; see rationale below.
- `WeekPeriod` and `getWeekPeriods` stay in `MatchesClient.tsx` — only used by the main component.

## Why `getResult` goes to a utils file

`getResult` is a 7-line pure function used by 6 different places: `LatestMatchHero`, `ScoreCard`, `ResultsStrip` (inside TrendsPanel), `WinPctChart` (inside TrendsPanel), `WeekStatsPanel`, and `MatchesClient` main. The choices were:
1. Duplicate it into each file that uses it (5 copies of the same 7 lines — ugly, violates DRY).
2. Have sub-components import it from `MatchesClient.tsx` (circular-ish — parent imports child, child imports parent).
3. Put it in a small `utils.ts` file that everyone imports from (single source of truth).

Option 3 is minimal and clean. `StatsClient` didn't need this because no equivalent cross-sub-component helper existed there — each component imported what it needed directly from `@/lib/discord`.

## Extraction order

Leaves first, roll up. Each step must `npm run build` successfully before moving on:

1. Create `utils.ts` with `getResult`; update `MatchesClient.tsx` to import from it.
2. Extract `StreakBanner.tsx` (standalone, no dependencies on other local components).
3. Extract `LatestMatchHero.tsx` (standalone).
4. Extract `ScoreCard.tsx` (+ `TeamRow` private helper).
5. Extract `WeekStatsPanel.tsx` (imports `ScoreCard` + `getResult` from utils).
6. Extract `TrendsPanel.tsx` (+ all 4 charts + `ChartHeader` + `tooltipAlign` + `RESULTS_COLLAPSED_COUNT` private).
7. `MatchesClient.tsx` ends up as slim wrapper (~280 lines, mostly the season record bar + week selector UI + layout switch).

## Commit strategy

One commit per extraction step (7 commits). Each commit keeps the app building. `git bisect` stays trivial.

## Conventions (same as StatsClient split)

- Every new component file starts with `"use client"`.
- New component files use named exports (`export function XyzCard`). `MatchesClient.tsx` keeps `export default`.
- `utils.ts` does NOT need `"use client"` — it's a pure function, no hooks.
- Imports from `@/types`, `@/lib/nicknames`, etc. are repeated per-file as needed. No barrel file.

## Verification

**During extraction (after each step):**
- `npm run build` must pass.

**After final step:**
- `npm run dev` and manually exercise `/matches`:
  - Page loads without console error.
  - Season record bar (W/L/OTL) displays.
  - Streak banner appears when a 3+ game streak is active; US-flag sidebar + number + label render correctly.
  - Week selector shows recent weeks with game counts; clicking a week switches to the `WeekStatsPanel` view with summary cards + game cards.
  - "All Weeks" back button returns to the default view.
  - Latest match hero shows correctly for the most recent game.
  - Analytics panel: `ResultsStrip` renders with correct W/L colors, expand toggle works, hover tooltips work; `WinPctChart`, `ShotDiffChart`, `GoalsTrendChart` render with hover interactions.
  - Every forfeit and finals/OT match label renders correctly on cards.
  - Numbers match the live site.

**Out of scope:** screenshot diff, Vercel preview deploy, automated tests.

## Known risks & mitigations

| Risk | Mitigation |
|---|---|
| Module-scope constants referenced before declaration after move | TypeScript build catches |
| Missing `"use client"` directive on new files | Build errors on hook/motion usage |
| Default vs. named export mismatch | Build errors at import site |
| Animation key/delay continuity lost | All `motion.div` wrappers preserved verbatim |
| Circular imports (e.g., sub-component importing from MatchesClient) | Shared helper goes to `utils.ts` which has zero imports of local components |

## Rollback

- Build fails mid-extraction → `git reset --hard HEAD~1` on the branch.
- Manual QA finds regression pre-merge → fix on the branch or abandon the worktree.
- Post-merge regression → `git revert <specific-extraction-commit>` to undo only the broken piece.

## Explicitly out of scope

- Prop renaming
- Dead code removal
- Type consolidation
- Performance tweaks
- Visual changes
- Splitting the 4 individual chart components into their own files (deliberately kept together in `TrendsPanel.tsx` — follows the `HeadToHeadCard` precedent)
