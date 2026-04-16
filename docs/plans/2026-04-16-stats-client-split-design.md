# StatsClient Component Split — Design

**Date:** 2026-04-16
**Status:** Approved, ready for implementation plan
**Goal:** Split `src/app/stats/StatsClient.tsx` (1060 lines) into focused sub-components to improve maintainability, without changing any user-facing behavior.

---

## Context

`src/app/stats/StatsClient.tsx` is a single client component containing:
- Season tab wrapper and state
- Stats display composition (`StatsDisplay`)
- Top-5 leader cards (`LeaderCard`, `SavesLeaderCard`) + `TrendArrow`
- Player dropdown rows with stat grids (`PlayerDropdown`, `StatCell`, `SkaterStatGrid`, `GoalieStatGrid`)
- Head-to-head compare modal with radar chart (`HeadToHeadCard`, `GenericRadarChart`, radar math helpers, profile builders)

The file is already internally well-structured — sub-components are self-contained, take props cleanly, and are separated by section comments. Splitting is a mechanical move of existing code, not a redesign.

This is a "warmup round" for a larger `MatchesClient.tsx` (1692 lines) split planned as a follow-up.

## Constraints

- **Must not change user-facing behavior** — visual, interactive, or data-fetching.
- **No test suite exists** — verification is build + manual click-through.
- **Approach: pure mechanical extraction** — no drive-by cleanup, no type consolidation, no prop renaming. Any improvements are follow-up commits.

## Isolation

- Git worktree at `.worktrees/stats-client-split/`
- Branch: `feature/stats-client-split`
- One PR for the full split (not one PR per extracted component)

## File breakdown

Target directory: `src/app/stats/components/`

| File | Contents | Approx lines |
|---|---|---|
| `components/HeadToHeadCard.tsx` | `HeadToHeadCard` + `GenericRadarChart` + radar math helpers + H2H-private types/constants | ~440 |
| `components/LeaderCard.tsx` | `LeaderCard` + `TrendArrow` | ~90 |
| `components/SavesLeaderCard.tsx` | `SavesLeaderCard` | ~70 |
| `components/PlayerDropdown.tsx` | `PlayerDropdown` + `StatCell` + `SkaterStatGrid` + `GoalieStatGrid` | ~160 |
| `components/StatsDisplay.tsx` | `StatsDisplay` (composes leader cards + player dropdown) | ~135 |
| `StatsClient.tsx` (modified) | Season tabs + `<StatsDisplay>` only | ~60 |

**Grouping rationale:**
- Head-to-head logic (card + radar + math + types) stays in one file — the radar is only used by H2H, its types/constants are private to H2H, and splitting across 4 files would be over-engineering.
- `PlayerDropdown` bundles `StatCell` + stat grids — they are only used by the dropdown.
- `LeaderCard` bundles `TrendArrow` — only used inside `LeaderCard`.

## Extraction order

Leaves first, roll up. Each step must `npm run build` successfully before moving on:

1. Extract `LeaderCard.tsx` (+ `TrendArrow`)
2. Extract `SavesLeaderCard.tsx`
3. Extract `PlayerDropdown.tsx` (+ `StatCell` + grids)
4. Extract `HeadToHeadCard.tsx` (+ radar chart + math + H2H types)
5. Extract `StatsDisplay.tsx` — imports 1–4
6. Slim `StatsClient.tsx` to season tab wrapper only

**Why this order:** At each step the original file only loses code, never simultaneously imports-from-new-file and still-contains-the-code. No intermediate broken state.

## Commit strategy

One commit per extraction step (6 commits). Each commit keeps the app building. Makes `git bisect` trivial if a regression is found later.

## Conventions

- Every new component file begins with `"use client"` (uses hooks or Framer Motion).
- New component files use named exports (`export function HeadToHeadCard`); only `StatsClient.tsx` retains `export default`.
- Imports from `@/lib/discord` and `@/lib/nicknames` are repeated per-file as needed — no shared barrel file.

## Verification

**During extraction (after each step):**
- `npm run build` must pass.

**After final step (step 6):**
- `npm run dev` and manually exercise:
  - Stats page loads without error.
  - Season tab switching animates and swaps data correctly.
  - Head-to-head: click player → modal opens → radar chart renders → select a comparison player → radar updates.
  - Player dropdowns: click row → expands → shows stat grid (skater + goalie variants).
  - All displayed numbers match the current live site.

**Out of scope:** screenshot diff, Vercel preview deploy, automated tests.

## Known risks & mitigations

| Risk | Mitigation |
|---|---|
| Module-scope constants referenced before declaration after move | TypeScript build catches |
| Missing `"use client"` directive on new files | Build errors on hook/motion usage |
| Default vs. named export mismatch | Build errors at import site |
| `AnimatePresence` key continuity lost | `key={selectedSeason}` stays on the motion wrapper in `StatsClient.tsx` |

## Rollback

- Build fails mid-extraction → `git reset --hard HEAD~1` on the branch.
- Manual QA finds regression pre-merge → fix on the branch or abandon the worktree.
- Regression caught post-merge → `git revert <merge-commit>` on master. Per-step commits also allow targeted reverts.

## Explicitly out of scope

- Prop renaming
- Dead code removal
- Type consolidation into shared file
- Performance tweaks (memoization, lazy loading)
- Any visual changes
- `MatchesClient.tsx` split (separate future effort using this as the template)
