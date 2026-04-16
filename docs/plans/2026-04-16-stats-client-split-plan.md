# StatsClient Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `src/app/stats/StatsClient.tsx` (1060 lines) into focused sub-components under `src/app/stats/components/` without changing any user-facing behavior.

**Architecture:** Pure mechanical extraction. Each sub-component is already internally cohesive and takes props cleanly — we relocate code verbatim, add `"use client"` + imports to each new file, and replace the moved section in `StatsClient.tsx` with an import. Leaves extracted first (components with no dependencies on other local components), then composers, then the main wrapper becomes slim.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Framer Motion, Tailwind. React Compiler auto-memoization is enabled.

**Design reference:** `docs/plans/2026-04-16-stats-client-split-design.md`

**Verification strategy:** No test framework exists. We verify via `npm run build` after each extraction (catches missing imports, type mismatches, missing `"use client"` directives) and a final `npm run dev` manual click-through on the stats page.

**Isolation:** All work in a git worktree at `.worktrees/stats-client-split/` on branch `feature/stats-client-split`. Git identity via env vars (`GIT_AUTHOR_*` / `GIT_COMMITTER_*` set to `Ryder Tetreault <rydertetreault@gmail.com>`) or inline `git -c user.name=... -c user.email=...` per commit.

---

### Task 1: Set up the worktree and branch

**Files:** none created yet

**Step 1: Create the worktree and branch from master.**

From the main repo root (`/home/rydertetreault/bardownski-website`):

```bash
git worktree add -b feature/stats-client-split .worktrees/stats-client-split master
```

Expected: `Preparing worktree (new branch 'feature/stats-client-split')` and a new directory `.worktrees/stats-client-split/`.

**Step 2: Verify worktree is clean and on the right branch.**

```bash
cd .worktrees/stats-client-split && git status && git branch --show-current
```

Expected:
```
On branch feature/stats-client-split
nothing to commit, working tree clean
feature/stats-client-split
```

**Step 3: Create the target components directory.**

```bash
mkdir -p src/app/stats/components
```

Expected: no output, directory created.

**Step 4: Install deps (inherited from parent, but verify).**

```bash
ls node_modules/.bin/next 2>/dev/null || npm install
```

Expected: either the symlink exists (no install needed) or `npm install` completes. Worktrees typically share node_modules with the parent via a symlink, but this depends on setup.

**No commit for this task — infrastructure only.**

---

### Task 2: Extract `LeaderCard` (+ `TrendArrow`)

**Files:**
- Create: `src/app/stats/components/LeaderCard.tsx`
- Modify: `src/app/stats/StatsClient.tsx` (remove lines 543–633, add import)

**Step 1: Create `src/app/stats/components/LeaderCard.tsx` with the exact content below.**

```tsx
"use client";

import { motion } from "framer-motion";
import type { StatEntry } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

export function TrendArrow({ trend }: { trend?: "up" | "down" | null }) {
  if (!trend) return null;
  if (trend === "up") return <span className="text-green-500 ml-1">↑</span>;
  return <span className="text-red-light ml-1">↓</span>;
}

export function LeaderCard({
  title,
  entries,
  formatValue,
  secondaryLabel,
  secondaryIsPercent,
}: {
  title: string;
  entries: StatEntry[];
  formatValue?: (v: number) => string;
  secondaryLabel?: string;
  secondaryIsPercent?: boolean;
}) {
  const top5 = entries.slice(0, 5);
  if (top5.length === 0) return null;
  const fmt = formatValue || ((v: number) => v.toString());

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-navy border border-border rounded-xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="relative">
        <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
        <div className="px-4 py-2.5 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-xs">
            {title}
          </h3>
          {secondaryLabel && (
            <span className="text-[10px] text-muted uppercase tracking-widest">
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Top 5 entries */}
      <div className="px-4 py-1">
        {top5.map((entry, i) => (
          <div
            key={entry.name}
            className={`flex items-center py-2.5 ${i > 0 ? "border-t border-border/20" : ""}`}
          >
            {/* Rank */}
            <span
              className={`w-6 text-xs font-mono font-bold shrink-0 ${
                i === 0 ? "text-red" : "text-muted"
              }`}
            >
              {entry.rank}.
            </span>
            {/* Name */}
            <p
              className={`flex-1 min-w-0 max-w-[130px] text-sm font-semibold truncate ${
                i === 0 ? "text-red" : ""
              }`}
            >
              {getNickname(entry.name)}
              <TrendArrow trend={entry.trend} />
            </p>
            {/* Value */}
            <span
              className={`w-10 text-right font-bold text-sm font-mono shrink-0 ${
                i === 0 ? "text-red" : "text-foreground"
              }`}
            >
              {fmt(entry.value)}
            </span>
            {/* Secondary */}
            {secondaryLabel && (
              <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
                {entry.secondary !== undefined ? `${entry.secondary}${secondaryIsPercent ? "%" : ""}` : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
```

**Step 2: Remove lines 543–633 from `src/app/stats/StatsClient.tsx`** (the `TrendArrow` function, the `/* ── Compact top-5 leader card ── */` comment, and the `LeaderCard` function — everything from line 543 through the closing `}` at line 633 inclusive).

**Step 3: Add the import to `src/app/stats/StatsClient.tsx`.** After the existing imports block (after line 13), add:

```tsx
import { LeaderCard, TrendArrow } from "./components/LeaderCard";
```

Note: `TrendArrow` is still referenced inside `SavesLeaderCard` (not yet extracted), so the import must include it.

**Step 4: Verify the build.**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. Any error here means an import is wrong — fix before committing.

**Step 5: Commit.**

```bash
git add src/app/stats/components/LeaderCard.tsx src/app/stats/StatsClient.tsx
git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract LeaderCard and TrendArrow from StatsClient"
```

---

### Task 3: Extract `SavesLeaderCard`

**Files:**
- Create: `src/app/stats/components/SavesLeaderCard.tsx`
- Modify: `src/app/stats/StatsClient.tsx` (remove the `SavesLeaderCard` function, add import, drop now-unused `TrendArrow` import if applicable)

**Step 1: Create `src/app/stats/components/SavesLeaderCard.tsx`.**

```tsx
"use client";

import { motion } from "framer-motion";
import type { SaveEntry } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";
import { TrendArrow } from "./LeaderCard";

export function SavesLeaderCard({ entries }: { entries: SaveEntry[] }) {
  const top5 = entries.slice(0, 5);
  if (top5.length === 0) return null;
  const hasGgp = top5.some((e) => e.ggp !== undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-navy border border-border rounded-xl overflow-hidden h-full"
    >
      <div className="relative">
        <div className="h-0.5 bg-gradient-to-r from-red via-red/50 to-transparent" />
        <div className="px-4 py-2.5 border-b border-border bg-navy-dark/80 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-xs">
            Saves
          </h3>
          <span className="text-[10px] text-muted uppercase tracking-widest">
            SV / SV%{hasGgp ? " / GGP" : ""}
          </span>
        </div>
      </div>

      <div className="px-4 py-1">
        {top5.map((entry, i) => (
          <div
            key={entry.name}
            className={`flex items-center py-2.5 ${i > 0 ? "border-t border-border/20" : ""}`}
          >
            <span
              className={`w-6 text-xs font-mono font-bold shrink-0 ${
                i === 0 ? "text-red" : "text-muted"
              }`}
            >
              {entry.rank}.
            </span>
            <p
              className={`flex-1 min-w-0 text-sm font-semibold truncate ${
                i === 0 ? "text-red" : ""
              }`}
            >
              {getNickname(entry.name)}
              <TrendArrow trend={entry.trend} />
            </p>
            <span
              className={`w-10 text-right font-bold text-sm font-mono shrink-0 ${
                i === 0 ? "text-red" : "text-foreground"
              }`}
            >
              {entry.value}
            </span>
            <span className="w-14 text-right text-muted text-xs font-mono shrink-0">
              {entry.secondary}%
            </span>
            {hasGgp && (
              <span className="w-10 text-right text-muted text-xs font-mono shrink-0">
                {entry.ggp}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
```

**Step 2: Remove the `SavesLeaderCard` function from `StatsClient.tsx`** — the `/* ── Saves leader card (custom columns) ── */` comment and the entire `function SavesLeaderCard(...) { ... }` block (was originally lines 635–702).

**Step 3: Update the import in `StatsClient.tsx`.** Since `TrendArrow` is no longer referenced in `StatsClient.tsx` after this task, narrow the existing import:

```tsx
import { LeaderCard } from "./components/LeaderCard";
import { SavesLeaderCard } from "./components/SavesLeaderCard";
```

(Drop `TrendArrow` from the import line — it's only used inside the extracted component files now. TypeScript unused-import warnings will flag it otherwise.)

**Step 4: Verify the build.**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

**Step 5: Commit.**

```bash
git add src/app/stats/components/SavesLeaderCard.tsx src/app/stats/StatsClient.tsx
git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract SavesLeaderCard from StatsClient"
```

---

### Task 4: Extract `PlayerDropdown` (+ `StatCell` + `SkaterStatGrid` + `GoalieStatGrid`)

**Files:**
- Create: `src/app/stats/components/PlayerDropdown.tsx`
- Modify: `src/app/stats/StatsClient.tsx` (remove the dropdown block + three grid helpers, add import)

**Step 1: Create `src/app/stats/components/PlayerDropdown.tsx`.**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EnrichedPlayer } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

export function PlayerDropdown({ player }: { player: EnrichedPlayer }) {
  const [open, setOpen] = useState(false);
  const isGoalie = /\b(goalie|gk|g)\b/i.test(player.position);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-navy border border-border rounded-xl overflow-hidden"
    >
      {/* Clickable header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-navy-light/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-red font-black text-sm">
            {getNickname(player.name)}
          </span>
          <span className="text-muted text-xs uppercase tracking-wider">
            {player.position}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stat preview when closed */}
          {!open && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted font-mono">
              {isGoalie ? (
                <>
                  {player.savePercentage !== undefined && (
                    <span>{player.savePercentage.toFixed(1)}% SV</span>
                  )}
                  {player.saves !== undefined && <span>{player.saves} SVS</span>}
                  {player.shutouts !== undefined && <span>{player.shutouts} SO</span>}
                </>
              ) : (
                <>
                  {player.points !== undefined && <span>{player.points} PTS</span>}
                  {player.goals !== undefined && <span>{player.goals} G</span>}
                  {player.assists !== undefined && <span>{player.assists} A</span>}
                </>
              )}
            </div>
          )}
          {/* Chevron */}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted text-lg"
          >
            ▾
          </motion.span>
        </div>
      </button>

      {/* Expanded stats */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border/30">
              {isGoalie ? (
                <GoalieStatGrid player={player} />
              ) : (
                <SkaterStatGrid player={player} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCell({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg font-black font-mono text-foreground">
        {value !== undefined && value !== null ? value : "—"}
      </p>
    </div>
  );
}

function SkaterStatGrid({ player }: { player: EnrichedPlayer }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-2">
      <div className="flex gap-6 min-w-max">
        <StatCell label="GP" value={player.gamesPlayed} />
        <StatCell label="G" value={player.goals} />
        <StatCell label="A" value={player.assists} />
        <StatCell label="PTS" value={player.points} />
        <StatCell
          label="+/-"
          value={
            player.plusMinus !== undefined
              ? player.plusMinus > 0
                ? `+${player.plusMinus}`
                : player.plusMinus.toString()
              : undefined
          }
        />
        <StatCell label="HIT" value={player.hits} />
        <StatCell label="PIM" value={player.pim} />
        {player.shots !== undefined && <StatCell label="SOG" value={player.shots} />}
        {player.shotPercentage !== undefined && (
          <StatCell label="SH%" value={`${player.shotPercentage}%`} />
        )}
        {player.gwg !== undefined && <StatCell label="GWG" value={player.gwg} />}
        {player.takeaways !== undefined && <StatCell label="TK" value={player.takeaways} />}
        {player.giveaways !== undefined && <StatCell label="GV" value={player.giveaways} />}
        {player.blockedShots !== undefined && <StatCell label="BS" value={player.blockedShots} />}
        {player.interceptions !== undefined && <StatCell label="INT" value={player.interceptions} />}
        {player.passPercentage !== undefined && (
          <StatCell label="PASS%" value={`${player.passPercentage}%`} />
        )}
        {player.faceoffPct !== undefined && player.faceoffPct > 0 && (
          <StatCell label="FO%" value={`${player.faceoffPct}%`} />
        )}
      </div>
    </div>
  );
}

function GoalieStatGrid({ player }: { player: EnrichedPlayer }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-2">
      <div className="flex gap-6 min-w-max">
        <StatCell label="GGP" value={player.goalieGamesPlayed} />
        <StatCell label="SVS" value={player.saves} />
        <StatCell
          label="SV%"
          value={
            player.savePercentage !== undefined
              ? `${player.savePercentage.toFixed(1)}%`
              : undefined
          }
        />
        <StatCell label="GAA" value={player.gaa !== undefined ? player.gaa.toFixed(2) : undefined} />
        <StatCell label="SO" value={player.shutouts} />
        <StatCell label="SOP" value={player.shutoutPeriods} />
        {/* Also show skater stats if they have any */}
        {player.points !== undefined && player.points > 0 && (
          <>
            <StatCell label="G" value={player.goals} />
            <StatCell label="A" value={player.assists} />
            <StatCell label="PTS" value={player.points} />
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Remove the `PlayerDropdown`, `StatCell`, `SkaterStatGrid`, and `GoalieStatGrid` functions from `StatsClient.tsx`** — the `/* ── Player dropdown row ── */` comment and everything through the end of `GoalieStatGrid`'s closing `}` (originally lines 704–867).

**Step 3: Add import to `StatsClient.tsx`.**

```tsx
import { PlayerDropdown } from "./components/PlayerDropdown";
```

**Step 4: Verify the build.**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

**Step 5: Commit.**

```bash
git add src/app/stats/components/PlayerDropdown.tsx src/app/stats/StatsClient.tsx
git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract PlayerDropdown and stat grids from StatsClient"
```

---

### Task 5: Extract `HeadToHeadCard` (+ `GenericRadarChart` + radar math + H2H types)

**Files:**
- Create: `src/app/stats/components/HeadToHeadCard.tsx`
- Modify: `src/app/stats/StatsClient.tsx` (remove lines 15–541 — types, constants, radar helpers, `GenericRadarChart`, `HeadToHeadCard`)

This is the biggest extraction (~440 lines moved). The content to move from `StatsClient.tsx` is everything from the `/* ══════... Head-to-Head ... ══════ */` banner comment (around line 15) down through the closing `}` of the `HeadToHeadCard` function (around line 541) inclusive.

**Step 1: Open `src/app/stats/StatsClient.tsx` and copy lines 15–541 verbatim.** These include:
- The banner comment
- `PlayerProfile`, `GoalieProfile` interfaces
- `CompareMode` type
- `SKATER_STATS`, `GOALIE_STATS`, `RADAR_STATS` constants
- `CX`, `CY`, `R`, `RINGS` constants
- `polarX`, `polarY`, `axisAngle` functions
- `buildProfilesFromStats`, `buildGoalieProfilesFromStats` functions
- `GenericRadarChart` component
- `HeadToHeadCard` component

**Step 2: Create `src/app/stats/components/HeadToHeadCard.tsx`** with this skeleton, then paste the copied block between the marker comments. Replace existing imports at the top of the pasted block (there shouldn't be any — they were at the top of `StatsClient.tsx`).

```tsx
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ParsedStats } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

/* ══════════════════════════════════════════════════════════════════════════
   Head-to-Head — Radar Chart Popup
   ══════════════════════════════════════════════════════════════════════════ */

// ==== PASTE COPIED BLOCK HERE ====
// (Everything from StatsClient.tsx lines 19–541 — types, constants, helpers,
//  GenericRadarChart, HeadToHeadCard)
// ==== END PASTE ====
```

**Step 3: Add `export` to the main component only.** In the pasted block, change:

```tsx
function HeadToHeadCard({ stats }: { stats: ParsedStats }) {
```

to:

```tsx
export function HeadToHeadCard({ stats }: { stats: ParsedStats }) {
```

All other symbols (`GenericRadarChart`, `polarX`, etc.) remain unexported — they're private to this file.

**Step 4: Remove lines 15–541 from `StatsClient.tsx`.** The file's top should now be just the imports (lines 1–13) followed by `TrendArrow`/`LeaderCard`/etc. — except those were already removed in Tasks 2–4. So after this removal, `StatsClient.tsx` jumps from the imports directly to `StatsDisplay`.

**Step 5: Remove now-unused imports from `StatsClient.tsx`.** Delete `useMemo` from the React import if it's no longer referenced. Keep `useState`. Check for any `SaveEntry`, `StatEntry`, `EnrichedPlayer`, `getEnrichedPlayers` imports that are still needed by `StatsDisplay` (they are — leave them).

Update the component imports list:

```tsx
import { LeaderCard } from "./components/LeaderCard";
import { SavesLeaderCard } from "./components/SavesLeaderCard";
import { PlayerDropdown } from "./components/PlayerDropdown";
import { HeadToHeadCard } from "./components/HeadToHeadCard";
```

**Step 6: Verify the build.**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. If a reference like `CompareMode` or `SKATER_STATS` shows as "not defined," it means something in the remaining `StatsClient.tsx` still references the moved symbols — confirm everything that referenced them is in `HeadToHeadCard.tsx`.

**Step 7: Commit.**

```bash
git add src/app/stats/components/HeadToHeadCard.tsx src/app/stats/StatsClient.tsx
git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract HeadToHeadCard and radar chart from StatsClient"
```

---

### Task 6: Extract `StatsDisplay`

**Files:**
- Create: `src/app/stats/components/StatsDisplay.tsx`
- Modify: `src/app/stats/StatsClient.tsx` (remove the `StatsDisplay` function)

**Step 1: Create `src/app/stats/components/StatsDisplay.tsx`.**

```tsx
"use client";

import { motion } from "framer-motion";
import type { ParsedStats } from "@/lib/discord";
import { getEnrichedPlayers } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";
import { LeaderCard } from "./LeaderCard";
import { SavesLeaderCard } from "./SavesLeaderCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { PlayerDropdown } from "./PlayerDropdown";

export function StatsDisplay({ stats }: { stats: ParsedStats }) {
  const enrichedPlayers = getEnrichedPlayers(stats);

  return (
    <>
      {/* Stats Leaders */}
      <div className="mb-12">
        <div className="mb-6">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-1 h-6 bg-red rounded-sm" />
            <h2 className="text-2xl font-black uppercase tracking-wider">
              Stats Leaders
            </h2>
          </div>
          <p className="text-xs text-muted uppercase tracking-widest ml-4">
            Top performers this season
          </p>
        </div>

        {/* Top row — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <LeaderCard
            title="Points"
            entries={stats.points}
            secondaryLabel="GP"
          />
          <LeaderCard title="Goals" entries={stats.goals} secondaryLabel="SH%" secondaryIsPercent />
          <LeaderCard title="Assists" entries={stats.assists} secondaryLabel="PASS%" secondaryIsPercent />
          <LeaderCard
            title="Plus/Minus"
            entries={stats.plusMinus}
            formatValue={(v) => (v > 0 ? `+${v}` : v.toString())}
          />
        </div>
        {/* Bottom row — centered, equal height */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch gap-4">
          <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
            <LeaderCard title="Hits" entries={stats.hits} secondaryLabel="PIM" />
          </div>
          <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
            <SavesLeaderCard entries={stats.saves} />
          </div>
          {stats.shutouts.length > 0 && (
            <div className="sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
              <LeaderCard
                title="Shutouts"
                entries={stats.shutouts}
                secondaryLabel={
                  stats.shutouts.some((e) => e.secondary !== undefined)
                    ? "SOP"
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Player Stats */}
      <div>
        <div className="mb-6">
          <div className="flex flex-col gap-px mb-4">
            <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
            <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-1 h-6 bg-red rounded-sm" />
            <h2 className="text-2xl font-black uppercase tracking-wider">
              Player Stats
            </h2>
          </div>
          <p className="text-xs text-muted uppercase tracking-widest ml-4">
            Full season breakdown
          </p>
        </div>

        <HeadToHeadCard stats={stats} />

        <div className="space-y-3 mt-6">
          {enrichedPlayers.map((player) => (
            <PlayerDropdown key={player.name} player={player} />
          ))}
        </div>
      </div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <div className="flex flex-col gap-px mb-4">
              <div className="h-px bg-gradient-to-r from-red/50 via-red/20 to-transparent" />
              <div className="h-px bg-gradient-to-r from-[#5b9bd5]/30 via-[#5b9bd5]/10 to-transparent" />
            </div>
            <div className="flex items-center gap-3">
              <span className="block w-1 h-6 bg-red rounded-sm" />
              <h2 className="text-2xl font-black uppercase tracking-wider">
                Milestones
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.milestones.map((milestone, i) => (
              <motion.div
                key={milestone.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-navy border border-border rounded-xl p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red/50 to-transparent" />
                <h3 className="font-bold text-red mb-2">
                  {getNickname(milestone.name)}
                </h3>
                <ul className="space-y-1">
                  {milestone.achievements.map((a) => (
                    <li key={a} className="text-sm text-muted">
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Remove the `StatsDisplay` function from `StatsClient.tsx`** — the `/* ── Stats Leaders + Player Stats ── */` comment and the entire `function StatsDisplay(...) { ... }` block.

**Step 3: Remove component imports that are no longer used by `StatsClient.tsx` directly.** After this task, `StatsClient.tsx` only references `StatsDisplay`, not `LeaderCard`, `SavesLeaderCard`, `HeadToHeadCard`, or `PlayerDropdown`. Clean the imports down to:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SeasonData } from "@/lib/discord";
import { StatsDisplay } from "./components/StatsDisplay";
```

Drop imports for `ParsedStats`, `StatEntry`, `SaveEntry`, `EnrichedPlayer`, `getEnrichedPlayers`, and `getNickname` — they're no longer used in this file.

**Step 4: Verify the build.**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. `StatsClient.tsx` should now be ~60 lines.

**Step 5: Commit.**

```bash
git add src/app/stats/components/StatsDisplay.tsx src/app/stats/StatsClient.tsx
git -c user.name="Ryder Tetreault" -c user.email="rydertetreault@gmail.com" commit -m "Extract StatsDisplay from StatsClient"
```

---

### Task 7: Final manual verification

**Files:** none modified

**Step 1: Start the dev server.**

```bash
npm run dev
```

Expected: server ready at `http://localhost:3000`.

**Step 2: Open `http://localhost:3000/stats` in a browser. Work through this checklist:**

- [ ] Stats page loads without console errors.
- [ ] Season tabs render (if multiple seasons exist); clicking a different season animates the content swap and updates displayed data.
- [ ] "Stats Leaders" section shows 4 cards in the top row (Points, Goals, Assists, Plus/Minus) and up to 3 in the bottom row (Hits, Saves, Shutouts if present).
- [ ] Leader card top player is styled red; trend arrows render where applicable.
- [ ] "Head-to-Head" card appears above the player list. Two player dropdowns show side-by-side with a radar chart behind. Changing either dropdown updates the radar.
- [ ] Switching H2H between Skater and Goalie mode (if both have ≥2 players) swaps the stat axes and player list.
- [ ] Player dropdowns: each player row shows gamertag + position, with preview stats on the right when collapsed. Clicking the row animates open, revealing the full stat grid (skater or goalie variant).
- [ ] Expanded grid is horizontally scrollable on narrow viewports.
- [ ] Milestones section renders at the bottom if the season has any.
- [ ] Numbers on the page match the current production live site (open `https://bardownski.com/stats` side-by-side to compare a few key values).

**Step 3: If any check fails, investigate.** The most likely failure modes:
- Missing `"use client"` → error at runtime about hooks in a server component.
- `AnimatePresence` animation glitches → key prop may have been lost.
- Data mismatch → likely an import/export typo; double-check the extracted component has the right props.

Fix on the branch before proceeding.

**Step 4: Stop the dev server** (Ctrl+C).

**No commit for this task — verification only.**

---

### Task 8: Push branch and open PR

**Files:** none modified

**Step 1: Push the branch.**

```bash
git push -u origin feature/stats-client-split
```

Expected: branch published to origin.

**Step 2: Open a PR with `gh`.**

```bash
gh pr create --title "Split StatsClient into focused sub-components" --body "$(cat <<'EOF'
## Summary

- Extracts 5 sub-components from `src/app/stats/StatsClient.tsx` (1060 → ~60 lines) into `src/app/stats/components/`: `LeaderCard`, `SavesLeaderCard`, `PlayerDropdown`, `HeadToHeadCard`, `StatsDisplay`.
- Pure mechanical move — no behavior changes, no cleanup, no prop renaming.
- Each extraction is its own commit so `git bisect` works if a regression is found.

## Design & plan

- Design: `docs/plans/2026-04-16-stats-client-split-design.md`
- Plan: `docs/plans/2026-04-16-stats-client-split-plan.md`

## Test plan

- [x] `npm run build` passes after every extraction commit.
- [x] `npm run dev` manual click-through on `/stats`: seasons swap, leader cards render, head-to-head works, player dropdowns expand.
- [x] Side-by-side comparison with live site confirms no numeric or visual drift.
EOF
)"
```

Expected: PR URL printed. Do not merge yet — review the diff yourself (file-by-file extraction should be self-evident).

**Step 3: Clean up the worktree after the PR merges.**

```bash
cd /home/rydertetreault/bardownski-website
git worktree remove .worktrees/stats-client-split
git branch -d feature/stats-client-split  # only after remote branch is deleted
```

---

## Rollback notes

If a regression is discovered at any stage:

- **Mid-extraction, build fails:** `git reset --hard HEAD~1` on the branch. Re-plan the failed step before retrying.
- **Manual QA fails pre-PR:** Fix on the branch or `git reset --hard <commit-before-extraction>` to the last known-good commit.
- **Post-merge regression on master:** `git revert <merge-commit>` on master, or — because each extraction is its own commit — `git revert <specific-extraction-commit>` to undo only the broken one.

Each extraction commit keeps the app in a buildable, running state, so bisect is always viable.
