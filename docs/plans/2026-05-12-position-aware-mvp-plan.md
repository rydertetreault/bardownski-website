# Position-aware MVP/POTW scoring — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Defensemen are scored against a positional baseline so they're judged on the right yardstick; forwards' MVP-odds weights are unchanged and POTW gains symmetric defensive inputs.

**Architecture:** Two scoring sites change (`computeMvpOddsFromMembers` in `src/lib/chelstats.ts` and `computePlayerOfWeekFromMatches` in `src/app/api/cron/weekly-update/route.ts`), plus a small shared `getPositionBucket()` helper and three new fields plumbed through `MatchPlayerStat`. No new dependencies. No DB / Redis schema changes — POTW totals are computed each cron run and the only persisted shape is `WeeklyPlayer`, which already supports `position: "D" | "F"` as a string.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Vercel Cron, Upstash Redis. No test framework in repo — verification via `npm run build` and manual leaderboard inspection.

**Design reference:** `docs/plans/2026-05-12-position-aware-mvp-design.md`

**Verification strategy:** TypeScript catches the structural changes (new `MatchPlayerStat` fields, accumulator shape). `npm run build` is the type/lint gate. Spot-check by running `npm run dev` and inspecting (a) the MVP odds page — Rob's score / odds should rise relative to forwards at similar PPG; (b) the POTW page on next cron tick — defenseman entries now emit `position: "D"` rather than `"F"`.

**Isolation:** Work directly on `master`. The repo has no worktree convention in active use; the design doc commit landed on master and we continue that pattern. Identity already set globally (`Ryder Tetreault <rydertetreault@gmail.com>`).

---

### Task 1: Add `getPositionBucket()` helper

**Files:**
- Modify: `src/lib/chelstats.ts` (append below the existing helpers near line 309, before `transformGame()`)

**Step 1: Add the helper.**

Insert after the `passCompPct` helper (around `src/lib/chelstats.ts:309`):

```ts
/**
 * Normalize position strings from both data shapes into a coarse bucket.
 * - Season-level (ClubMember) uses single-letter codes like "D", "C", "LW".
 * - Per-match (RawMatchPlayer) uses long-form like "leftWing", "defenseMen",
 *   "leftDefense", "rightDefense", "center", "goalie".
 *
 * Default-safe: unknown/empty strings fall through to "forward", so a new
 * EA position value can never accidentally inherit the D bonus.
 */
export function getPositionBucket(
  position: string | undefined
): "forward" | "defense" | "goalie" {
  const p = (position ?? "").toLowerCase();
  if (p === "g" || p === "gk" || p.includes("goalie")) return "goalie";
  if (p === "d" || p.includes("defense")) return "defense";
  return "forward";
}
```

**Step 2: Verify it compiles.**

```bash
npx tsc --noEmit
```

Expected: no errors. (If tsc isn't a direct script, `npm run build` works too but is slower.)

**Step 3: Quick smoke check from a one-off Node REPL.**

```bash
node -e "
const { getPositionBucket } = require('./src/lib/chelstats');
const cases = ['D','d','C','LW','leftWing','rightWing','center','defenseMen','leftDefense','rightDefense','goalie','G','GK','','unknown',undefined];
for (const c of cases) console.log(JSON.stringify(c), '→', getPositionBucket(c));
"
```

If `require()` fails because the file is ESM/TS, skip this step — the `npm run build` in later tasks will cover correctness. Don't waste time wrestling with the runtime; the function is small and obviously correct on inspection.

**Step 4: Commit.**

```bash
git add src/lib/chelstats.ts
git commit -m "$(cat <<'EOF'
Add getPositionBucket helper for forward/defense/goalie classification

Normalizes both season-level single-letter codes ("D", "LW") and per-match
long-form strings ("leftWing", "defenseMen") into a coarse bucket. Used by
upcoming position-aware MVP and POTW scoring. Default-safe: unknown strings
fall through to "forward" so a new EA position value can't accidentally
inherit the D bonus.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Plumb `blockedShots`, `takeaways`, `giveaways` into `MatchPlayerStat`

**Files:**
- Modify: `src/lib/chelstats.ts` — `MatchPlayerStat` interface (around line 221) and `transformGame()` (around line 322)

**Step 1: Add three fields to `MatchPlayerStat`.**

Find the interface at `src/lib/chelstats.ts:221`. Add three fields between `pim` and `powerPlayGoals`:

```ts
export interface MatchPlayerStat {
  name: string;
  position: string;
  goals: number;
  assists: number;
  hits: number;
  shots: number;
  plusMinus: number;
  pim: number;
  blockedShots: number;    // NEW
  takeaways: number;       // NEW
  giveaways: number;       // NEW
  powerPlayGoals: number;
  shortHandedGoals: number;
  gameWinningGoal: number;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  savePct: number;
  shutoutPeriods: number;
  isGoalie: boolean;
  isOurPlayer: boolean;
}
```

**Step 2: Populate them in `transformGame()`.**

In `src/lib/chelstats.ts` around line 323–345, inside the `rawPlayers` map, add three fields. The RawMatchPlayer fields are `skbs` (blocked shots), `sktakeaways`, and `skgiveaways` (already declared in the `RawMatchPlayer` interface at line 58).

Insert between `pim:` and `powerPlayGoals:`:

```ts
    return {
      name: resolveName(p.playername || "Unknown"),
      position: p.position || "skater",
      goals: num(p.skgoals),
      assists: num(p.skassists),
      hits: num(p.skhits),
      shots: num(p.skshots),
      plusMinus: parseInt(p.skplusmin || "0") || 0,
      pim: num(p.skpim),
      blockedShots: num(p.skbs),         // NEW
      takeaways: num(p.sktakeaways),     // NEW
      giveaways: num(p.skgiveaways),     // NEW
      powerPlayGoals: num(p.skppg),
      shortHandedGoals: num(p.skshg),
      gameWinningGoal: num(p.skgwg),
      saves: num(p.glsaves),
      shotsAgainst: num(p.glshots),
      goalsAgainst: num(p.glga),
      savePct: flt(p.glsavepct),
      shutoutPeriods: num(p.glsoperiods),
      isGoalie,
      isOurPlayer: true,
    };
```

**Step 3: Verify build still passes.**

```bash
npm run build
```

Expected: build succeeds. If any consumer of `MatchPlayerStat` destructures the type expecting an exact shape (object literals etc.), TypeScript will catch it. New fields are additive so this should be clean.

**Step 4: Commit.**

```bash
git add src/lib/chelstats.ts
git commit -m "$(cat <<'EOF'
Plumb blockedShots/takeaways/giveaways into MatchPlayerStat

Populated from EA raw fields (skbs, sktakeaways, skgiveaways) in
transformGame(). Needed by upcoming position-aware POTW scoring so the
weekly leaderboard can read the same defensive signals MVP odds already
uses at the season level.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Position-aware MVP odds (`computeMvpOddsFromMembers`)

**Files:**
- Modify: `src/lib/chelstats.ts:760-820` — split the skater branch and clamp before the pow step.

**Step 1: Replace the skater scoring block.**

Find this block at `src/lib/chelstats.ts:771-790`:

```ts
  for (const m of members) {
    // --- Skater score ---
    // Per-game rate stats measure quality. Log-dampened sqrt(GP) rewards
    // volume with diminishing returns so high-GP skaters don't run away
    // from goalies who naturally play fewer games.
    if (m.gamesPlayed >= MIN_GP && !SKATER_EXCLUDE.has(m.username)) {
      const gp = m.gamesPlayed;
      const perGame =
        m.ppg * 20 +                          // offensive production rate
        (m.goals / gp) * 15 +                 // goal-scoring rate
        Math.max(m.plusMinus, 0) / gp * 8 +   // two-way impact
        (m.gwg / gp) * 30 +                   // clutch factor
        m.shotPct * 0.3 +                     // shooting efficiency
        (m.hits / gp) * 0.5 +                 // physical presence
        (m.takeaways / gp) * 0.5 -            // defensive play
        (m.giveaways / gp) * 0.3;             // turnover penalty
      const gpScale = Math.sqrt(gp) * (1 / (1 + Math.log10(gp / 100)));
      const score = perGame * gpScale;
      entries.push({ member: m, score, isGoalie: false });
    }
```

Replace with:

```ts
  for (const m of members) {
    // --- Skater score ---
    // Forwards: per-game rate stats. Defensemen: same shape but rebased
    // against per-position baselines so a D at 0.5 PPG is judged against
    // ~0.35 (well above replacement) rather than against a forward's ~0.70.
    // Log-dampened sqrt(GP) rewards volume with diminishing returns so
    // high-GP skaters don't run away from goalies who play fewer games.
    if (m.gamesPlayed >= MIN_GP && !SKATER_EXCLUDE.has(m.username)) {
      const gp = m.gamesPlayed;
      const bucket = getPositionBucket(m.position);

      let perGame: number;
      if (bucket === "defense") {
        // D baselines: PPG ~0.35, G/GP ~0.10. Drops gwg and shotPct
        // (low/noisy for D) and adds blocked shots. +/- weighted ~2x
        // forward weight to reflect that defensive impact matters more.
        perGame =
          (m.ppg - 0.35) * 25 +
          ((m.goals / gp) - 0.10) * 18 +
          Math.max(m.plusMinus, 0) / gp * 18 +
          (m.hits / gp) * 1.2 +
          (m.blockedShots / gp) * 2.0 +
          (m.takeaways / gp) * 1.5 -
          (m.giveaways / gp) * 0.8;
      } else {
        // Forwards: existing formula, byte-for-byte.
        perGame =
          m.ppg * 20 +
          (m.goals / gp) * 15 +
          Math.max(m.plusMinus, 0) / gp * 8 +
          (m.gwg / gp) * 30 +
          m.shotPct * 0.3 +
          (m.hits / gp) * 0.5 +
          (m.takeaways / gp) * 0.5 -
          (m.giveaways / gp) * 0.3;
      }

      const gpScale = Math.sqrt(gp) * (1 / (1 + Math.log10(gp / 100)));
      const score = perGame * gpScale;
      entries.push({ member: m, score, isGoalie: false });
    }
```

**Step 2: Clamp negative scores before the pow step.**

Find at `src/lib/chelstats.ts:817-819`:

```ts
  const maxScore = entries[0].score;
  const SHARPNESS = 3;
  const weights = entries.map((e) => Math.pow(e.score / maxScore, SHARPNESS));
```

Replace with:

```ts
  // Clamp negative scores before the pow step. A D-man below baseline with
  // negative +/- can produce a negative perGame; pow(neg, 3) would corrupt
  // the odds distribution. Ordering above (entries.sort) is unaffected.
  const maxScore = Math.max(entries[0].score, 1e-9);
  const SHARPNESS = 3;
  const weights = entries.map((e) =>
    Math.pow(Math.max(e.score, 0) / maxScore, SHARPNESS)
  );
```

The `Math.max(entries[0].score, 1e-9)` denominator guard handles the (unlikely) case where every player scores ≤0.

**Step 3: Verify build.**

```bash
npm run build
```

Expected: build succeeds.

**Step 4: Eyeball MVP odds locally.**

```bash
npm run dev
```

Open `http://localhost:3000` and the page that hosts MVP odds (likely the home page — see `src/components/sections/MvpOddsSection.tsx`). Note Rob's score and odds. Compare to a forward at similar PPG (Jimmy / Wolfgang). Confirm: Rob has moved up relative to where he was before. If he hasn't moved meaningfully, the D-baselines may need tuning — flag in commit message but don't tune in this task.

Stop the dev server (Ctrl+C).

**Step 5: Commit.**

```bash
git add src/lib/chelstats.ts
git commit -m "$(cat <<'EOF'
Score defensemen against per-position baselines in MVP odds

Forwards keep their existing formula byte-for-byte. Defensemen are now
rebased: PPG vs ~0.35 baseline, G/GP vs ~0.10, with bigger weights on
+/-, blocked shots, and takeaways. GWG and shotPct dropped from the D
formula (low/noisy signals for the position).

Also clamps negative scores before the pow step so a sub-baseline D-man
with negative +/- can't corrupt the odds distribution.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Position-aware POTW (`computePlayerOfWeekFromMatches`)

**Files:**
- Modify: `src/app/api/cron/weekly-update/route.ts:50-192`

**Step 1: Add the bucket import.**

At the top of `src/app/api/cron/weekly-update/route.ts`, find the existing imports from `@/lib/chelstats` and add `getPositionBucket`:

```ts
import { getPositionBucket } from "@/lib/chelstats";
```

If chelstats is already imported (check the top of the file), add `getPositionBucket` to the existing import. If not, add a new import line near the other `@/lib/...` imports.

**Step 2: Expand the `skaterTotals` accumulator.**

Find at `src/app/api/cron/weekly-update/route.ts:64-67`:

```ts
  const skaterTotals: Record<string, {
    goals: number; assists: number; hits: number; shots: number;
    plusMinus: number; gwg: number; games: number;
  }> = {};
```

Replace with:

```ts
  const skaterTotals: Record<string, {
    goals: number; assists: number; hits: number; shots: number;
    plusMinus: number; gwg: number; games: number;
    blockedShots: number; takeaways: number; giveaways: number;
    bucket: "forward" | "defense";
  }> = {};
```

**Step 3: Populate the new fields during aggregation.**

Find at `src/app/api/cron/weekly-update/route.ts:105-116`:

```ts
      } else {
        if (!skaterTotals[p.name]) {
          skaterTotals[p.name] = { goals: 0, assists: 0, hits: 0, shots: 0, plusMinus: 0, gwg: 0, games: 0 };
        }
        skaterTotals[p.name].goals += p.goals;
        skaterTotals[p.name].assists += p.assists;
        skaterTotals[p.name].hits += p.hits;
        skaterTotals[p.name].shots += p.shots;
        skaterTotals[p.name].plusMinus += p.plusMinus;
        skaterTotals[p.name].gwg += p.gameWinningGoal;
        skaterTotals[p.name].games += 1;
      }
```

Replace with:

```ts
      } else {
        if (!skaterTotals[p.name]) {
          skaterTotals[p.name] = {
            goals: 0, assists: 0, hits: 0, shots: 0,
            plusMinus: 0, gwg: 0, games: 0,
            blockedShots: 0, takeaways: 0, giveaways: 0,
            // Bucket is sticky to first occurrence; a player's position
            // shouldn't realistically change mid-week and EA per-match
            // strings are consistent across games.
            bucket: getPositionBucket(p.position) === "defense" ? "defense" : "forward",
          };
        }
        skaterTotals[p.name].goals += p.goals;
        skaterTotals[p.name].assists += p.assists;
        skaterTotals[p.name].hits += p.hits;
        skaterTotals[p.name].shots += p.shots;
        skaterTotals[p.name].plusMinus += p.plusMinus;
        skaterTotals[p.name].gwg += p.gameWinningGoal;
        // Old cached match data without these fields → undefined → NaN via +=
        // Guard with `|| 0` since num() doesn't run on the typed values.
        skaterTotals[p.name].blockedShots += p.blockedShots ?? 0;
        skaterTotals[p.name].takeaways += p.takeaways ?? 0;
        skaterTotals[p.name].giveaways += p.giveaways ?? 0;
        skaterTotals[p.name].games += 1;
      }
```

Note on the `bucket` ternary: `getPositionBucket` can return `"goalie"`, but goalies take the `isGoalie` branch above and never reach this code path. The ternary collapses any unexpected `"goalie"` to `"forward"` defensively.

**Step 4: Replace the skater scoring block.**

Find at `src/app/api/cron/weekly-update/route.ts:127-151`:

```ts
  for (const [name, stats] of Object.entries(skaterTotals)) {
    const gp = stats.games;
    if (gp === 0) continue;
    const points = stats.goals + stats.assists;
    const shotPct = stats.shots > 0 ? (stats.goals / stats.shots) * 100 : 0;
    const perGame =
      (points / gp) * 8 +                     // offensive production rate
      Math.max(stats.plusMinus, 0) / gp * 3 + // two-way impact
      (stats.gwg / gp) * 15 +                 // clutch factor
      shotPct * 0.15 +                         // shooting efficiency
      (stats.hits / gp) * 0.3;                // physical presence
    const score = perGame * (earnsAmplifier(gp) ? Math.sqrt(gp) : 1);
    allPlayers.push({
      name,
      position: "F",
      isGoalie: false,
      deltaGoals: stats.goals,
      deltaAssists: stats.assists,
      deltaPoints: points,
      deltaHits: stats.hits,
      deltaSaves: 0,
      deltaShutouts: 0,
      weeklyScore: Math.round(score * 10) / 10,
    });
  }
```

Replace with:

```ts
  // Skater scoring: forwards keep their existing weights and gain three
  // new additive defensive inputs (so POTW reads the same signals MVP odds
  // already does). Defensemen use a separate formula rebased to D-baselines
  // — the gap between Rob and the wings shouldn't read as Rob being worse;
  // it should read as Rob being good at a position with fewer scoring
  // opportunities.
  for (const [name, stats] of Object.entries(skaterTotals)) {
    const gp = stats.games;
    if (gp === 0) continue;
    const points = stats.goals + stats.assists;

    let perGame: number;
    if (stats.bucket === "defense") {
      perGame =
        ((points / gp) - 0.35) * 10 +
        Math.max(stats.plusMinus, 0) / gp * 6 +
        (stats.hits / gp) * 0.8 +
        (stats.blockedShots / gp) * 1.5 +
        (stats.takeaways / gp) * 1.0 -
        (stats.giveaways / gp) * 0.5;
    } else {
      const shotPct = stats.shots > 0 ? (stats.goals / stats.shots) * 100 : 0;
      perGame =
        (points / gp) * 8 +
        Math.max(stats.plusMinus, 0) / gp * 3 +
        (stats.gwg / gp) * 15 +
        shotPct * 0.15 +
        (stats.hits / gp) * 0.3 +
        (stats.takeaways / gp) * 0.3 -
        (stats.giveaways / gp) * 0.2 +
        (stats.blockedShots / gp) * 0.4;
    }

    const score = perGame * (earnsAmplifier(gp) ? Math.sqrt(gp) : 1);
    allPlayers.push({
      name,
      position: stats.bucket === "defense" ? "D" : "F",
      isGoalie: false,
      deltaGoals: stats.goals,
      deltaAssists: stats.assists,
      deltaPoints: points,
      deltaHits: stats.hits,
      deltaSaves: 0,
      deltaShutouts: 0,
      weeklyScore: Math.round(score * 10) / 10,
    });
  }
```

**Step 5: Verify build.**

```bash
npm run build
```

Expected: build succeeds. Type errors here usually point to a missed accumulator field — re-check Step 2's full object literal.

**Step 6: Trigger a POTW recompute locally (optional but useful).**

If a manual recompute script exists for POTW, run it. From the earlier exploration, `scripts/dump-potw.mjs` exists. Read what it does:

```bash
head -40 scripts/dump-potw.mjs
```

If it computes POTW from current Redis state, it won't reflect formula changes (those need a fresh cron run with new code). The actual production verification path is: deploy → next cron tick recomputes → check `/api/cron/weekly-update` output or the home page POTW section.

For now, settle for: build passes, types check, and the production cron will pick up the new formula on next run.

**Step 7: Commit.**

```bash
git add src/app/api/cron/weekly-update/route.ts
git commit -m "$(cat <<'EOF'
Score defensemen against D-baselines in Player of the Week

POTW skater branch now splits by position bucket. Forwards keep their
existing weights and gain three new additive defensive inputs (takeaways,
giveaways, blocked shots) so the POTW formula reads the same signals MVP
odds already uses at the season level. Defensemen use a separate formula
rebased to a 0.35 PPG baseline with bigger weights on +/-, hits, and
blocked shots.

WeeklyPlayer entries now emit position "D" for defensemen instead of the
previously hardcoded "F".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Final build + leaderboard sanity check

**Files:** none modified.

**Step 1: Clean build from scratch.**

```bash
rm -rf .next && npm run build
```

Expected: build succeeds with no type errors.

**Step 2: Lint.**

```bash
npm run lint
```

Expected: no new violations on the files we touched (`src/lib/chelstats.ts`, `src/app/api/cron/weekly-update/route.ts`). Pre-existing violations in untouched files are fine to ignore.

**Step 3: Dev server eyeball.**

```bash
npm run dev
```

Open the home page and the MVP odds section. Confirm Rob (SLOBBY ROBBY) now sits closer to forwards at his PPG range than he did before — for example, if he was 5th–6th, he might now be 3rd–4th.

If POTW happens to be live this week, glance at it too. If POTW is computed off old cached match data without `blockedShots`/`takeaways`/`giveaways`, those terms will sum to 0 (the `?? 0` guard); the formula still runs cleanly, just under-counts those signals until matches roll over within the 3-week retention window.

Stop the dev server.

**Step 4: No commit needed** — verification only.

---

### Task 6: Tuning pass (only if needed)

**Skip this task unless** the leaderboard eyeball in Task 5 shows Rob obviously over- or under-corrected.

The two levers, in order of preference:

1. **D PPG baseline (`0.35`)** in both formulas. Lower it (e.g., 0.30) to boost D-men further; raise it (e.g., 0.40) if they overshot forwards.
2. **PPG weight (`25` in MVP odds, `10` in POTW)** for D. Reduces or amplifies the impact of the rebased PPG term without shifting the baseline.

Tune in one file, build, eyeball, repeat. Don't touch forward weights — those are explicitly out of scope.

Commit any tuning as a separate small commit:

```bash
git commit -m "Tune D-baseline to 0.30 — Rob still scoring below forwards at equivalent production"
```

---

## Out of scope

- Centers vs wings differentiation.
- Forward-side baselines.
- Special-teams credit (PPG/SHG production).
- Per-position blocked-shots / takeaways baselines.
- Tests beyond what `npm run build` already enforces. A future `getPositionBucket()` unit test is the natural starting point if a test framework is added.
