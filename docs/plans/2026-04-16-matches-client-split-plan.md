# MatchesClient Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `src/app/matches/MatchesClient.tsx` (1692 lines) into focused sub-components under `src/app/matches/components/` plus a small `src/app/matches/utils.ts`, without changing any user-facing behavior.

**Architecture:** Pure mechanical extraction. One shared helper (`getResult`) moves to `utils.ts` so 5+ sub-components can import from a single source. Five sub-components move into their own files. `MatchesClient.tsx` keeps the season record bar, week selector, streak banner slot, and layout switch.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Framer Motion, Tailwind. React Compiler auto-memoization is enabled.

**Design reference:** `docs/plans/2026-04-16-matches-client-split-design.md`

**Prior-work template reference:** `docs/plans/2026-04-16-stats-client-split-plan.md` — follow the same per-task format.

**Verification strategy:** No test framework exists. We verify via `npm run build` after each extraction (catches missing imports, type mismatches, missing `"use client"` directives) and a final `npm run dev` manual click-through on `/matches`.

**Isolation:** All work in a git worktree at `.worktrees/matches-client-split/` on branch `feature/matches-client-split`. Git identity via inline `git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com"` per commit — do NOT modify `git config`.

---

### Task 1: Set up the worktree and branch

**Files:** none created yet

**Step 1: Create the worktree and branch from master.**

From the main repo root (`/home/rydertetreault/bardownski-website`):

```bash
git worktree add -b feature/matches-client-split .worktrees/matches-client-split master
```

Expected: `Preparing worktree (new branch 'feature/matches-client-split')`.

**Step 2: Verify worktree is clean.**

```bash
cd .worktrees/matches-client-split && git status && git branch --show-current
```

Expected: clean working tree, on `feature/matches-client-split`.

**Step 3: Create the target directory.**

```bash
mkdir -p src/app/matches/components
```

**Step 4: Install deps.**

```bash
ls node_modules/.bin/next 2>/dev/null || npm install
```

**No commit for this task — infrastructure only.**

---

### Task 2: Extract `getResult` to `utils.ts`

**Files:**
- Create: `src/app/matches/utils.ts`
- Modify: `src/app/matches/MatchesClient.tsx` (remove the `getResult` function, add import)

**Step 1: Create `src/app/matches/utils.ts` with this exact content:**

```ts
import type { Match } from "@/types";

export function getResult(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    match.scoreUs === null ||
    match.scoreThem === null
  )
    return null;
  return match.scoreUs > match.scoreThem ? "W" : "L";
}
```

Note: no `"use client"` directive — this is a pure function with no hooks.

**Step 2: Remove the `getResult` function from `src/app/matches/MatchesClient.tsx`.** It's the block:

```ts
function getResult(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    match.scoreUs === null ||
    match.scoreThem === null
  )
    return null;
  return match.scoreUs > match.scoreThem ? "W" : "L";
}
```

(currently around lines 69–77, including any `/* ── */` comment directly above it if present).

**Step 3: Add the import to `src/app/matches/MatchesClient.tsx`** after the existing imports:

```tsx
import { getResult } from "./utils";
```

**Step 4: Verify the build.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run build
```

Expected: `✓ Compiled successfully`.

**Step 5: Commit.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && git add src/app/matches/utils.ts src/app/matches/MatchesClient.tsx && git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract getResult helper to matches/utils.ts"
```

---

### Task 3: Extract `StreakBanner`

**Files:**
- Create: `src/app/matches/components/StreakBanner.tsx`
- Modify: `src/app/matches/MatchesClient.tsx` (remove the `StreakBanner` function + section comment, add import)

**Step 1: Read the current `src/app/matches/MatchesClient.tsx` to locate the `StreakBanner` function.** Look for the `/* ── Streak Banner (Stars & Stripes) ── */` comment and the following `function StreakBanner(...)` block through its closing `}`. (Pre-extraction this is around lines 1330–1420.)

**Step 2: Create `src/app/matches/components/StreakBanner.tsx` with this header, then paste the `StreakBanner` function body verbatim with `export` added:**

```tsx
"use client";

import { motion } from "framer-motion";

// ==== PASTE StreakBanner function body here, prefixed with `export` ====
// Original: function StreakBanner({ streakType, streakCount, isClubRecord }: {...}) { ... }
// After:    export function StreakBanner({ streakType, streakCount, isClubRecord }: {...}) { ... }
```

**Step 3: Remove the `/* ── Streak Banner (Stars & Stripes) ── */` comment and the `StreakBanner` function from `MatchesClient.tsx`.**

**Step 4: Add the import to `MatchesClient.tsx`** after the existing imports:

```tsx
import { StreakBanner } from "./components/StreakBanner";
```

**Step 5: Verify the build.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run build
```

Expected: `✓ Compiled successfully`.

**Step 6: Commit.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && git add src/app/matches/components/StreakBanner.tsx src/app/matches/MatchesClient.tsx && git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract StreakBanner from MatchesClient"
```

---

### Task 4: Extract `LatestMatchHero`

**Files:**
- Create: `src/app/matches/components/LatestMatchHero.tsx`
- Modify: `src/app/matches/MatchesClient.tsx` (remove the `LatestMatchHero` function + section comment, add import)

**Step 1: Read `MatchesClient.tsx`.** Locate the `/* ── Latest Match Hero ── */` comment and the `function LatestMatchHero(...)` block through its closing `}`. (Originally lines 79–350.)

**Step 2: Create `src/app/matches/components/LatestMatchHero.tsx` with this header, then paste the function body verbatim with `export` added:**

```tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match } from "@/types";
import { getNickname } from "@/lib/nicknames";
import { getResult } from "../utils";

// ==== PASTE LatestMatchHero function body here, prefixed with `export` ====
```

Note the relative import `../utils` — LatestMatchHero lives in `components/`, utils is at the parent `matches/` level.

**Step 3: Remove the `/* ── Latest Match Hero ── */` comment and the `LatestMatchHero` function from `MatchesClient.tsx`.**

**Step 4: Add the import to `MatchesClient.tsx`:**

```tsx
import { LatestMatchHero } from "./components/LatestMatchHero";
```

**Step 5: Verify the build.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run build
```

Expected: `✓ Compiled successfully`.

**Step 6: Commit.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && git add src/app/matches/components/LatestMatchHero.tsx src/app/matches/MatchesClient.tsx && git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract LatestMatchHero from MatchesClient"
```

---

### Task 5: Extract `ScoreCard` (+ `TeamRow` private helper)

**Files:**
- Create: `src/app/matches/components/ScoreCard.tsx`
- Modify: `src/app/matches/MatchesClient.tsx` (remove `TeamRow`, `ScoreCard`, and section comments; add import)

**Step 1: Read `MatchesClient.tsx`.** Locate:
- The `/* ── Team Row ... ── */` comment and `function TeamRow(...)` block
- The `/* ── Score Card ... ── */` comment and `function ScoreCard(...)` block

(Originally lines 352–569.)

**Step 2: Create `src/app/matches/components/ScoreCard.tsx` with this header and the two function bodies pasted verbatim. Only `ScoreCard` gets the `export` keyword:**

```tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Match } from "@/types";
import { getResult } from "../utils";

// ==== PASTE TeamRow function body here (NOT exported) ====
// Original: function TeamRow({...}: {...}) { ... }
// Keep as-is — private to this file.

// ==== PASTE ScoreCard function body here, prefixed with `export` ====
// Original: function ScoreCard({ match, index }: ...) { ... }
// After:    export function ScoreCard({ match, index }: ...) { ... }
```

**Step 3: Remove both comments and both functions from `MatchesClient.tsx`.** After Task 5, `MatchesClient.tsx` will not reference `TeamRow` at all (it was only used inside `ScoreCard`), and `ScoreCard` is only referenced via the new import (to be used by `WeekStatsPanel` in the next task — `MatchesClient.tsx` itself doesn't call `ScoreCard` directly).

**Step 4: Add the import to `MatchesClient.tsx`:**

```tsx
import { ScoreCard } from "./components/ScoreCard";
```

Note: it's possible `MatchesClient.tsx` doesn't directly use `ScoreCard` (since `WeekStatsPanel` is the consumer, and `WeekStatsPanel` is still inside `MatchesClient.tsx` at this point). In that case the import is still needed because `WeekStatsPanel`'s body references `ScoreCard`. When Task 6 extracts `WeekStatsPanel`, we'll move the import with it and drop it from `MatchesClient.tsx`.

**Step 5: Verify the build.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run build
```

Expected: `✓ Compiled successfully`.

**Step 6: Commit.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && git add src/app/matches/components/ScoreCard.tsx src/app/matches/MatchesClient.tsx && git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract ScoreCard and TeamRow from MatchesClient"
```

---

### Task 6: Extract `WeekStatsPanel`

**Files:**
- Create: `src/app/matches/components/WeekStatsPanel.tsx`
- Modify: `src/app/matches/MatchesClient.tsx` (remove `WeekStatsPanel` function + section comment; add import; adjust the `ScoreCard` import if no longer used directly)

**Step 1: Read `MatchesClient.tsx`.** Locate the `/* ── Week-specific Stats Panel ── */` comment and `function WeekStatsPanel(...)` block. (Originally lines 1214–1328.)

**Step 2: Create `src/app/matches/components/WeekStatsPanel.tsx` with this header and the function body pasted verbatim:**

```tsx
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Match } from "@/types";
import { getResult } from "../utils";
import { ScoreCard } from "./ScoreCard";

// ==== PASTE WeekStatsPanel function body here, prefixed with `export` ====
// Original: function WeekStatsPanel({ matches, weekLabel, onBack }: ...) { ... }
// After:    export function WeekStatsPanel({ matches, weekLabel, onBack }: ...) { ... }
```

**Step 3: Remove the `/* ── Week-specific Stats Panel ── */` comment and the `WeekStatsPanel` function from `MatchesClient.tsx`.**

**Step 4: Update imports in `MatchesClient.tsx`.**

Add:
```tsx
import { WeekStatsPanel } from "./components/WeekStatsPanel";
```

After this task, `MatchesClient.tsx` no longer references `ScoreCard` directly (it was used inside `WeekStatsPanel`, now moved). Remove the `import { ScoreCard } from "./components/ScoreCard";` line from `MatchesClient.tsx` (it was added in Task 5 only because `WeekStatsPanel` still lived in that file).

**Step 5: Verify the build.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run build
```

Expected: `✓ Compiled successfully`.

**Step 6: Commit.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && git add src/app/matches/components/WeekStatsPanel.tsx src/app/matches/MatchesClient.tsx && git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract WeekStatsPanel from MatchesClient"
```

---

### Task 7: Extract `TrendsPanel` (+ all 4 charts + helpers)

**Files:**
- Create: `src/app/matches/components/TrendsPanel.tsx`
- Modify: `src/app/matches/MatchesClient.tsx` (remove the entire Trends block + add import; trim now-unused React imports if applicable)

This is the largest extraction (~620 lines). It pulls out:
- `/* ── Trend Chart Components ── */` section comment
- `function ChartHeader(...)` (private)
- `const RESULTS_COLLAPSED_COUNT = 10;` (private)
- `const ResultsStrip = memo(...)` (private)
- `const GoalsTrendChart = memo(...)` (private)
- `const ShotDiffChart = memo(...)` (private)
- `const WinPctChart = memo(...)` (private)
- `function TrendsPanel(...)` (the ONLY export)

Also the `tooltipAlign` helper (from the very top of `MatchesClient.tsx`) moves to this file as a private helper — it's only used inside the chart components.

**Step 1: Read `MatchesClient.tsx`.** Identify:
- `tooltipAlign` function at the top (originally lines 11–17). This moves INTO the new file as a private helper.
- The entire Trend block: `/* ── Trend Chart Components ── */` comment through the closing `}` of `TrendsPanel` (originally lines 571–1212).

**Step 2: Create `src/app/matches/components/TrendsPanel.tsx` with this header:**

```tsx
"use client";

import { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import type { Match } from "@/types";
import { getResult } from "../utils";

// ==== PASTE tooltipAlign function here (NOT exported — private helper) ====
// Original at top of MatchesClient.tsx (lines 11–17 pre-refactor)

// ==== PASTE the entire Trend block here ====
// Includes:
//   /* ── Trend Chart Components ── */ comment
//   function ChartHeader (unexported)
//   const RESULTS_COLLAPSED_COUNT = 10; (unexported)
//   const ResultsStrip = memo(...) (unexported)
//   const GoalsTrendChart = memo(...) (unexported)
//   const ShotDiffChart = memo(...) (unexported)
//   const WinPctChart = memo(...) (unexported)
//   function TrendsPanel (add `export` prefix)
```

Only `TrendsPanel` gets the `export` keyword.

**Step 3: Remove from `MatchesClient.tsx`:**
- The `tooltipAlign` function at the top
- The entire Trend block (comment through `TrendsPanel` closing `}`)

**Step 4: Update imports in `MatchesClient.tsx`.**

Remove from the React import the hooks/names that are no longer used after this task. After Task 7, `MatchesClient.tsx` uses: `useState` (for `selectedWeek`), `useMemo` (several), but **not** `memo`. Update:

Before (possibly):
```tsx
import { useState, useMemo, memo } from "react";
```

After:
```tsx
import { useState, useMemo } from "react";
```

Also remove `motion` from the framer-motion import IF it's no longer used in `MatchesClient.tsx` (it likely IS still used for the season record bar + week selector animations — verify before removing).

Add:
```tsx
import { TrendsPanel } from "./components/TrendsPanel";
```

**Step 5: Verify the build.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run build
```

Expected: `✓ Compiled successfully` with no unused-import warnings.

**Step 6: Final cleanup — confirm `MatchesClient.tsx` only imports what it uses.** The remaining `MatchesClient.tsx` should use: `useState`, `useMemo`, `motion`, `Match`, `ClubRecord`, `getResult`, `StreakBanner`, `LatestMatchHero`, `WeekStatsPanel`, `TrendsPanel`. Everything else in the imports block should be dropped.

Expected final imports section of `MatchesClient.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Match, ClubRecord } from "@/types";
import { getResult } from "./utils";
import { StreakBanner } from "./components/StreakBanner";
import { LatestMatchHero } from "./components/LatestMatchHero";
import { WeekStatsPanel } from "./components/WeekStatsPanel";
import { TrendsPanel } from "./components/TrendsPanel";
```

**DO NOT** touch `WeekPeriod` interface or `getWeekPeriods` function — both stay in `MatchesClient.tsx` (only used by main). Leave them where they are.

Re-run build after any final cleanup: `npm run build` → `✓ Compiled successfully`.

**Step 7: Commit.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && git add src/app/matches/components/TrendsPanel.tsx src/app/matches/MatchesClient.tsx && git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract TrendsPanel and chart components from MatchesClient"
```

---

### Task 8: Final manual verification (human action)

**Files:** none modified

Same pattern as StatsClient QA.

**Step 1: Start the dev server.**

```bash
cd /home/rydertetreault/bardownski-website/.worktrees/matches-client-split && npm run dev
```

**Step 2: Open `http://localhost:3000/matches` and work through:**

- [ ] Page loads, no console errors
- [ ] Season record bar (W · L · OTL · GP) renders
- [ ] Streak banner appears if 3+ game streak active; Stars & Stripes sidebar, streak count, Club Record badge if applicable
- [ ] Week selector: recent weeks with game counts; clicking one switches to the WeekStatsPanel view
- [ ] WeekStatsPanel: back button, week summary cards (Record, GF, GA, Shot Diff), game cards grid
- [ ] Default view (no week selected): LatestMatchHero renders at top with score + three stars + CTA
- [ ] Analytics section with ResultsStrip (expand/collapse + hover tooltips), WinPctChart, ShotDiffChart, GoalsTrendChart — all hover tooltips work
- [ ] Forfeit and "finals" badges render on cards
- [ ] Numbers match live site at `https://bardownski.com/matches`

**Step 3: If any check fails, investigate and fix on the branch.** Most likely failure modes:
- Missing `"use client"` on a new file → runtime hook error
- AnimatePresence animation glitch → verify key props preserved
- Data mismatch → check import/export wiring

**Step 4: Stop the dev server** (Ctrl+C).

**No commit — verification only.**

---

### Task 9: Push branch and open PR

**Step 1: Push.**

```bash
git push -u origin feature/matches-client-split
```

**Step 2: Open PR.** Either via `gh pr create` (if authenticated) or via GitHub web UI at:

```
https://github.com/rydertetreault/bardownski-website/pull/new/feature/matches-client-split
```

PR body template:

```markdown
## Summary

- Extracts 5 sub-components + 1 shared helper from `src/app/matches/MatchesClient.tsx` (1692 → ~280 lines): `LatestMatchHero`, `ScoreCard` (+ `TeamRow`), `StreakBanner`, `WeekStatsPanel`, `TrendsPanel` (with 4 charts + helpers).
- Shared `getResult` helper extracted to `src/app/matches/utils.ts` so sub-components avoid duplicating a 7-line function 5 times.
- Pure mechanical move — no behavior changes. Each extraction is its own commit for clean bisect.
- Sibling refactor to the recent `StatsClient` split (same pattern, same safety rails).

## Design & plan

- Design: `docs/plans/2026-04-16-matches-client-split-design.md`
- Plan: `docs/plans/2026-04-16-matches-client-split-plan.md`

## Test plan

- [x] `npm run build` passes after every extraction commit (6/6).
- [x] `npm run dev` manual click-through on `/matches`: record bar, streak banner, week selector, WeekStatsPanel, LatestMatchHero, Analytics (ResultsStrip + 3 charts) — all render identically.
- [ ] Vercel preview deploy side-by-side with live site — final parity check before merge.
```

**Step 3: Clean up worktree after merge.**

```bash
cd /home/rydertetreault/bardownski-website
git worktree remove .worktrees/matches-client-split
git branch -d feature/matches-client-split
```

---

## Rollback notes

- Mid-extraction build fail: `git reset --hard HEAD~1` on the branch.
- Manual QA fails pre-PR: fix on branch or `git reset --hard` to last known-good.
- Post-merge regression: `git revert <specific-extraction-commit>` on master to undo only the broken piece.

Each commit keeps the app buildable — bisect always works.
