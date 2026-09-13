# NHL27 public API fixture

`nhl27-public.json` is an unmodified public GET response from:

`https://chelstats.app/api/clubs/stats?teamname=Bardownski&console=common-gen5&teamId=29202&strict=true`

Captured during adapter implementation; source `clubRanking.entry.updatedAt`:
`2026-09-13T06:09:44.994Z`. No authentication or private configuration used.
Tests do not make network requests and mutate independent fixture clones.

Verified schema/semantics:

- `teamData`: club ID `29202`, name `Bardownski`, platform `common-gen5`.
- `clubRanking.entry.gameTitle`: `NHL27`.
- `team_stats`: record `6-4-0`, 10 games, 35 goals, 24 against.
- `memberData`: four-element array; numeric fields mix strings and numbers.
- Rydayro: position `G`, zero skater games, one goalie game. Julio 3026: `LW`.
- `recentGames`: five `RegularSeason` games; empty `ClubFinals`/`PrivateGames` arrays.
- Member `Save %` is in percentage points (`92.000`); match `glsavepct` is
  fractional (`0.93`). These are source values, not to be recomputed or conflated.
- Match result `16385` (`0x4001`) accompanies `winnerByDnf=1`; non-DNF wins
  have result `1`. Detect bit `0x4000`, not `result >= 16384`. Check either club
  so a loss to a DNF winner is also marked. Scores remain the own-club `score`
  and `opponentScore`, including the fixture's 7–1 DNF win.
- Match IDs and player object keys are source identifiers, retained as strings.
- Goalie rating may have an empty playstyle; `team_stats.bestDivision` is absent
  but recoverable from `teamData.bestDivision`.

Optional-field policy is documented beside the parser: missing ratings and
ancillary member stats get neutral old-type-compatible defaults, recoverable
rates use validated totals, and missing history groups/players remain empty.
Core club record and member totals are never silently defaulted to zero.
