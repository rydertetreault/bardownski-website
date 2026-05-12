# Position-aware MVP / POTW scoring — design

**Date:** 2026-05-12
**Author:** Ryder Tetreault
**Status:** Approved

## Problem

The MVP odds (season-long) and Player of the Week (POTW, rolling 7-day) leaderboards score every skater with the same offensive-rate formula. A defenseman matching a winger's point total scores roughly the same as the winger, despite playing a role with structurally fewer scoring opportunities. Rob (D) ends up under-rated next to Jimmy and Wolfgang (W) at equal point production.

## Goal

Defensemen are scored against a positional baseline so their contribution is judged on the right yardstick. Forwards are not boosted — their absolute scores are unchanged in MVP odds and only gain *additional input signals* (no weight changes to existing ones) in POTW for symmetry with the new D inputs.

## Non-goals

- Per-position weights for centers vs wings. Forward bucket is unified.
- Changing goalie scoring.
- Tuning forwards' MVP-odds weights or adding baselines to the forward formula.

## Architecture

Two scoring sites are modified, plus one shared helper:

| File | Function | Change |
|---|---|---|
| `src/lib/chelstats.ts` | `computeMvpOddsFromMembers()` | Split skater branch by bucket. Forwards unchanged. New D formula with baselines. |
| `src/app/api/cron/weekly-update/route.ts` | `computePlayerOfWeekFromMatches()` | Split skater branch by bucket. Forwards add new defensive inputs (no weight changes to existing). New D formula. Stop hardcoding `position: "F"`. |
| `src/lib/chelstats.ts` (`MatchPlayerStat`) + `transformGame()` | — | Plumb `blockedShots`, `takeaways`, `giveaways` from EA raw match data so POTW can use them. |
| `src/lib/chelstats.ts` (new helper) | `getPositionBucket()` | Normalize both season-level (`"D"`, `"LW"`) and per-match (`"defenseMen"`, `"leftDefense"`) shapes into `"forward" \| "defense" \| "goalie"`. |

## Position detection

```ts
export function getPositionBucket(
  position: string | undefined
): "forward" | "defense" | "goalie" {
  const p = (position ?? "").toLowerCase();
  if (p === "g" || p === "gk" || p.includes("goalie")) return "goalie";
  if (p === "d" || p.includes("defense")) return "defense";
  return "forward";
}
```

Default-safe: unknown new strings fall through to forward, so they do not accidentally inherit the D bonus.

## MVP odds — D-scoring formula

Forwards in `computeMvpOddsFromMembers()` keep their existing formula byte-for-byte. The defenseman branch:

```ts
if (bucket === "defense") {
  perGame =
    (m.ppg - 0.35) * 25 +                     // PPG vs D-baseline
    ((m.goals / gp) - 0.10) * 18 +            // G/GP vs D-baseline
    Math.max(m.plusMinus, 0) / gp * 18 +      // +/- weighted ~2x vs forwards
    (m.hits / gp) * 1.2 +                     // physicality
    (m.blockedShots / gp) * 2.0 +             // NEW: shot-blocking
    (m.takeaways / gp) * 1.5 -                // defensive playmaking
    (m.giveaways / gp) * 0.8;                 // turnover penalty
}
```

`gwg` and `shotPct` are intentionally omitted from the D formula: D-men rarely score game-winners by structure of play and their shot % is low and noisy. `+/-`, hits, blocked shots, and takeaways are the better signals.

The `gpScale = Math.sqrt(gp) * (1 / (1 + Math.log10(gp / 100)))` volume amplifier is unchanged and applies to both buckets — keeps a 30-GP D and a 30-GP F directly comparable.

### Score clamp

After the skater score is computed (either branch), clamp before the probability `Math.pow(score / maxScore, 3)` step:

```ts
const safeScore = Math.max(score, 0);
```

A D under baseline with negative +/- can produce a negative `perGame`. Without the clamp, `pow(neg, 3)` returns negative and corrupts the odds distribution. Forwards have the same theoretical risk; clamping covers both.

## POTW — formula

### Per-match data plumbing

Add three fields to `MatchPlayerStat` in `src/lib/chelstats.ts`:

```ts
blockedShots: number;
takeaways: number;
giveaways: number;
```

Populate in `transformGame()` from the EA raw per-match fields (`p.skbs`, `p.sktkw`, `p.skgve` — confirm exact field names against the EA payload during implementation).

### Skater totals accumulator

Add the new stats plus a bucket tag:

```ts
const skaterTotals: Record<string, {
  goals: number; assists: number; hits: number; shots: number;
  plusMinus: number; gwg: number; games: number;
  blockedShots: number; takeaways: number; giveaways: number;  // NEW
  bucket: "forward" | "defense";                                // NEW
}> = {};
```

Set `bucket` from `getPositionBucket(p.position)` on first encounter of each player.

### Forward formula (POTW)

Existing weights untouched; three new additive terms:

```ts
if (bucket === "forward") {
  const points = stats.goals + stats.assists;
  const shotPct = stats.shots > 0 ? (stats.goals / stats.shots) * 100 : 0;
  perGame =
    (points / gp) * 8 +                         // unchanged
    Math.max(stats.plusMinus, 0) / gp * 3 +     // unchanged
    (stats.gwg / gp) * 15 +                     // unchanged
    shotPct * 0.15 +                            // unchanged
    (stats.hits / gp) * 0.3 +                   // unchanged
    (stats.takeaways / gp) * 0.3 -              // NEW (mirrors MVP-odds proportion)
    (stats.giveaways / gp) * 0.2 +              // NEW (mirrors MVP-odds proportion)
    (stats.blockedShots / gp) * 0.4;            // NEW (small — forwards block less)
}
```

### Defense formula (POTW)

```ts
if (bucket === "defense") {
  const points = stats.goals + stats.assists;
  perGame =
    ((points / gp) - 0.35) * 10 +               // PPG vs D-baseline
    Math.max(stats.plusMinus, 0) / gp * 6 +     // +/- (2x forward weight)
    (stats.hits / gp) * 0.8 +
    (stats.blockedShots / gp) * 1.5 +           // higher than F's 0.4
    (stats.takeaways / gp) * 1.0 -              // higher than F's 0.3
    (stats.giveaways / gp) * 0.5;
}
```

### Emitted entry

Replace the hardcoded `position: "F"` with `bucket === "defense" ? "D" : "F"`.

## Calibration constants

| Constant | Value | Source |
|---|---|---|
| D PPG baseline | 0.35 | EA NHL replacement-level D, calibrated below team's offensively-tilted style |
| D G/GP baseline | 0.10 | Same |
| F PPG baseline | (not applied) | Forwards keep raw-rate formula |
| MVP odds sharpness power | 3 | Unchanged |
| POTW `POTW_MIN_GP` | 7 | Unchanged |

Baselines are tunable post-launch — they are the obvious lever if Rob ends up either over- or under-rated after first ship.

## Edge cases

- **Unknown / missing position string** → bucket falls through to `"forward"`. Safe.
- **D score negative** → clamped before pow. Ordering still correct.
- **Old cached match data without `blockedShots`/`takeaways`/`giveaways`** → undefined → `0` via existing `num()` helper. POTW under-counts these stats for old games. Self-heals as the 3-week match retention rolls over.
- **Goalie path** → untouched. All changes are inside the skater branch.
- **Players in `SKATER_EXCLUDE`** → still excluded. Bucket logic runs only inside the `MIN_GP` + non-excluded check.

## Rollout

1. Add `getPositionBucket()` helper in `src/lib/chelstats.ts`.
2. Add `blockedShots`, `takeaways`, `giveaways` to `MatchPlayerStat`; populate in `transformGame()`.
3. Update `computeMvpOddsFromMembers()` skater branch (split by bucket; add D formula; add `Math.max(score, 0)` clamp).
4. Update `computePlayerOfWeekFromMatches()` (add new fields + bucket to `skaterTotals`; split skater branch; replace hardcoded `position: "F"`).
5. `npm run build` / typecheck.
6. Manual sanity check: render MVP odds page and POTW page locally; confirm Rob's MVP score has moved up relative to similarly-pointed forwards.

## Testing

No new automated tests. Both functions are pure transforms with no existing test coverage; the change is best validated by eyeballing the leaderboards. If a unit test is wanted later, the natural target is `getPositionBucket()` covering `"D"`, `"defenseMen"`, `"leftDefense"`, `"rightDefense"`, `"leftWing"`, `"center"`, `"goalie"`, `"G"`, `""`, `undefined`.

## Out of scope / future tunings

- Centers vs wings differentiation (faceoff %, two-way play).
- Position-aware baselines for *forwards* (would shift their absolute scores).
- Special-teams credit (PPG/SHG production).
- Per-position blocked-shots / takeaways baselines (currently used as raw rates with weight differences only).
