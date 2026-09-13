import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateHockeyAwards, calculateWeeklyAwardHistory, type WeeklyAwardHistory } from "../src/lib/hockey-awards";
import type { ChelstatsData, ClubMatch, MatchPlayerStat } from "../src/lib/chelstats";

const MONDAY = "2026-09-14T00:00:00.000Z";
const WEEK_1 = "2026-08-24T00:00:00.000Z";
const WEEK_2 = "2026-08-31T00:00:00.000Z";
const WEEK_3 = "2026-09-07T00:00:00.000Z";
const timestamp = (iso: string) => Date.parse(iso) / 1000;
type Player = MatchPlayerStat & { playerId?: string };
function player(name = "A", overrides: Partial<Player> = {}): Player {
  return { name, playerId: name, position: "center", isGoalie: false, isOurPlayer: true,
    goals: 1, assists: 1, hits: 2, shots: 4, plusMinus: 1, pim: 0, blockedShots: 1,
    takeaways: 2, giveaways: 1, powerPlayGoals: 0, shortHandedGoals: 0, gameWinningGoal: 0,
    saves: 0, shotsAgainst: 0, goalsAgainst: 0, savePct: 0, shutoutPeriods: 0, ...overrides };
}
function game(id: string, when = WEEK_3, players = [player()], overrides: Partial<ClubMatch> = {}): ClubMatch {
  return { id, timestamp: timestamp(when), date: "ignored display date", opponent: "Other club",
    homeAway: "home", scoreUs: 3, scoreThem: 1, matchType: "regular", shotsUs: 12, shotsThem: 10,
    toaUs: "2:00", toaThem: "2:00", passCompUs: 70, passCompThem: 70, result: "win", players,
    threeStars: null, ...overrides };
}
function games(when = WEEK_3, players = [player()], n = 3): ClubMatch[] {
  return Array.from({ length: n }, (_, i) => game(`${when}-${i}`, when, players));
}
function data(matches: ClubMatch[]): ChelstatsData {
  return { matches, members: [], clubStats: { record: "0-0-0", wins: 0, losses: 0, otl: 0,
    goals: 0, goalsAgainst: 0, goalsPerGame: 0, goalsAgainstPerGame: 0, totalGames: matches.length,
    seasons: 0, titlesWon: 0, currentDivision: 0, bestDivision: 0, starLevel: 0, overallRating: 0 } };
}
const history = (matches: ClubMatch[], asOf = MONDAY) => calculateWeeklyAwardHistory(matches, asOf);

// Full equality includes coverage: history must pass unfiltered input to the existing calculation.
function assertWeeklyParity(matches: ClubMatch[], result: WeeklyAwardHistory): void {
  for (const week of result.weeks) {
    const expected = calculateHockeyAwards(data(matches), week.end).lastCompletedWeek;
    // Match validation marks future rows relative to asOf, so compare at the history's own asOf
    // for the last completed week; for older weeks compare the scoring/eligibility fields below.
    if (week.start === calculateHockeyAwards(data(matches), result.asOf).lastCompletedWeek.start) {
      assert.deepEqual(week, calculateHockeyAwards(data(matches), result.asOf).lastCompletedWeek);
    }
    assert.deepEqual(week.standings, expected.standings);
    assert.deepEqual(week.winners, expected.winners);
    assert.equal(week.games, expected.games);
    assert.equal(week.status, "complete");
    assert.equal(week.coverage.inputGames, matches.length);
    assert.equal(week.coverage.acceptedGames + week.coverage.skippedGames, matches.length);
  }
}

test("empty history normalizes asOf and does not change the required HockeyAwards shape", () => {
  const empty: WeeklyAwardHistory = history([], "2026-09-13T19:00:00-05:00");
  assert.deepEqual(empty, { asOf: MONDAY, weeks: [], rankings: [], awardedWeeks: 0, totalAwards: 0 });
  assert.deepEqual(Object.keys(calculateHockeyAwards(data([]), MONDAY)).sort(),
    ["asOf", "currentWeek", "lastCompletedWeek", "seasonMvp"]);
});

test("repeated winners accumulate across observed weeks only, latest first with Monday lastWin", () => {
  const matches = [...games(WEEK_1), ...games(WEEK_3), ...games("2026-07-20T00:00:00Z", [player("B")])];
  const result = history(matches);
  assert.deepEqual(result.weeks.map(w => w.start), [WEEK_3, WEEK_1, "2026-07-20T00:00:00.000Z"]);
  assert.deepEqual(result.rankings, [
    { playerId: "A", name: "A", wins: 2, rank: 1, lastWin: WEEK_3 },
    { playerId: "B", name: "B", wins: 1, rank: 2, lastWin: "2026-07-20T00:00:00.000Z" },
  ]);
  assert.equal(result.awardedWeeks, 3);
  assert.equal(result.totalAwards, 3);
  assertWeeklyParity(matches, result);
});

test("each exact weekly tie wins; cumulative ties use competition ranks 1,1,3", () => {
  const matches = [...games(WEEK_1, [player("C")]), ...games(WEEK_2, [player("B"), player("A")]),
    ...games(WEEK_3, [player("B"), player("A")])];
  const result = history(matches);
  assert.deepEqual(result.weeks.map(w => w.winners.map(p => [p.playerId, p.rank])),
    [[["A", 1], ["B", 1]], [["A", 1], ["B", 1]], [["C", 1]]]);
  assert.deepEqual(result.rankings, [
    { playerId: "A", name: "A", wins: 2, rank: 1, lastWin: WEEK_3 },
    { playerId: "B", name: "B", wins: 2, rank: 1, lastWin: WEEK_3 },
    { playerId: "C", name: "C", wins: 1, rank: 3, lastWin: WEEK_1 },
  ]);
  assert.equal(result.awardedWeeks, 3);
  assert.equal(result.totalAwards, 5);
  assert.equal(result.totalAwards, result.rankings.reduce((sum, p) => sum + p.wins, 0));
  assertWeeklyParity(matches, result);
});

test("under-three and split-role leaders stay visible without wins; empty/rejected weeks are omitted", () => {
  const split = [...games(WEEK_3, [player()], 2), game("defense", WEEK_3, [player("A", { position: "D" })])];
  const matches = [...games(WEEK_1, [player()], 1), ...games(WEEK_2, [player()], 2), ...split,
    ...games("2026-08-17T00:00:00Z", []),
    ...games("2026-08-10T00:00:00Z", [player("Invalid", { goals: NaN })])];
  const result = history(matches);
  assert.deepEqual(result.weeks.map(w => [w.start, w.games]), [[WEEK_3, 3], [WEEK_2, 2], [WEEK_1, 1]]);
  assert.ok(result.weeks.every(w => w.leaders.length === 1 && !w.leaders[0].eligible && w.winners.length === 0));
  assert.deepEqual(result.rankings, []);
  assert.equal(result.awardedWeeks, 0);
  assert.equal(result.totalAwards, 0);
  assertWeeklyParity(matches, result);
});

test("only eligible winners count even when a provisional spike tops the standings", () => {
  const matches = [...games(), game("spike", WEEK_3, [player("Spike", { goals: 1000, shots: 1000 })])];
  const result = history(matches);
  assert.equal(result.weeks[0].standings[0].playerId, "Spike");
  assert.equal(result.weeks[0].standings[0].eligible, false);
  assert.deepEqual(result.rankings.map(p => p.playerId), ["A"]);
  assert.equal(result.totalAwards, 1);
  assertWeeklyParity(matches, result);
});

test("current/future weeks never win; UTC Monday is inclusive and following Monday exclusive", () => {
  const matches = [game("start", WEEK_3), game("middle", "2026-09-10T12:00:00Z"),
    game("sunday", "2026-09-13T23:59:59Z"), ...games(MONDAY), ...games("2026-09-21T00:00:00Z")];
  assert.deepEqual(history(matches, "2026-09-13T23:59:59.999Z").weeks, []);
  const result = history(matches);
  assert.equal(result.weeks.length, 1);
  assert.equal(result.weeks[0].start, WEEK_3);
  assert.equal(result.weeks[0].end, MONDAY);
  assert.equal(result.weeks[0].games, 3);
  assert.equal(result.awardedWeeks, 1);
  assert.deepEqual(history(matches, "2026-09-13T19:00:00-05:00"), result);
  assert.deepEqual(history(matches, "2026-09-16T00:00:00Z").rankings, result.rankings);
  const next = history(matches, "2026-09-21T00:00:00Z");
  assert.deepEqual(next.weeks.map(w => w.start), [MONDAY, WEEK_3]);
  assert.equal(next.rankings[0].wins, 2);
  assert.equal(next.rankings[0].lastWin, MONDAY);
  assertWeeklyParity(matches, result);
});

test("UTC week boundaries work across a year rollover and explicit timezone conversion", () => {
  const matches = games("2026-12-31T23:00:00Z");
  assert.deepEqual(history(matches, "2027-01-03T23:59:59Z").weeks, []);
  const result = history(matches, "2027-01-03T19:00:00-05:00");
  assert.equal(result.asOf, "2027-01-04T00:00:00.000Z");
  assert.equal(result.rankings[0].lastWin, "2026-12-28T00:00:00.000Z");
  assert.equal(result.weeks[0].end, result.asOf);
});

test("invalid asOf throws the same RangeError as calculateHockeyAwards, even for empty input", () => {
  for (const asOf of ["", "not-a-date", "2026-09-14", "2026-09-14T00:00:00", "2026-09-14T00:00:00+25:00",
    "+999999-01-01T00:00:00Z"]) {
    let expected: unknown;
    try { calculateHockeyAwards(data([]), asOf); } catch (error) { expected = error; }
    assert.ok(expected instanceof RangeError);
    assert.throws(() => history([], asOf), { name: expected.name, message: expected.message });
  }
});

test("duplicate games and appearances cannot inflate eligibility or weekly/cumulative wins", () => {
  const matches = games(WEEK_3, [player(), player()]);
  const input = [...matches, structuredClone(matches[0])];
  const result = history(input);
  assert.equal(result.weeks[0].games, 3);
  assert.equal(result.weeks[0].winners[0].games, 3);
  assert.equal(result.weeks[0].coverage.reasons["duplicate-game"], 1);
  assert.equal(result.weeks[0].coverage.reasons["duplicate-player"], 3);
  assert.equal(result.totalAwards, 1);
  const short = history([matches[0], matches[1], structuredClone(matches[0])]);
  assert.equal(short.weeks[0].games, 2);
  assert.deepEqual(short.rankings, []);
  assertWeeklyParity(input, result);
});

test("conflicting match IDs fail closed across completed, current, future and invalid timestamps", () => {
  const matches = games();
  const conflicts: Partial<ClubMatch>[] = [
    { scoreUs: 99 }, { timestamp: timestamp(WEEK_1) }, { timestamp: timestamp(MONDAY) },
    { timestamp: timestamp("2026-09-21T00:00:00Z") }, { timestamp: NaN },
    { timestamp: Number.MAX_SAFE_INTEGER }, { timestamp: -1 },
    { timestamp: timestamp(WEEK_1), matchType: "private" },
    { timestamp: timestamp(WEEK_1), scoreUs: NaN },
    { timestamp: timestamp(WEEK_1), players: null as unknown as Player[] },
  ];
  for (const conflict of conflicts) {
    const input = [...matches, { ...matches[0], ...conflict }];
    const result = history(input);
    assert.deepEqual(result.weeks.map(w => [w.start, w.games]), [[WEEK_3, 2]]);
    assert.equal(result.weeks[0].coverage.reasons["conflicting-game"], 2);
    assert.deepEqual(result.rankings, []);
    assert.equal(result.awardedWeeks, 0);
    assert.equal(result.totalAwards, 0);
    assert.deepEqual(history([...input].reverse()), result);
    assertWeeklyParity(input, result);
  }
});

test("conflicting players are rejected without dropping other valid players or repairing stats", () => {
  const matches = games(WEEK_3, [player("Bad"), player("Bad", { goals: 2 }), player("Good"),
    player("Missing", { assists: undefined as unknown as number }), player("Opponent", { isOurPlayer: false })]);
  const result = history(matches);
  assert.deepEqual(result.rankings.map(p => p.playerId), ["Good"]);
  assert.equal(result.weeks[0].coverage.reasons["conflicting-player"], 6);
  assert.equal(result.weeks[0].coverage.reasons["invalid-player"], 3);
  assert.equal(result.weeks[0].coverage.acceptedAppearances, 3);
  assertWeeklyParity(matches, result);
});

test("finite candidates skip poisoned dates and rejected-only weeks without filling calendar gaps", () => {
  const rejected = [
    game("private", WEEK_1, [player()], { matchType: "private" }),
    game("synthetic-1", WEEK_1), game("forfeit:1", WEEK_1),
    { ...game("flagged", WEEK_1), synthetic: true },
    game("unknown-type", WEEK_1, [player()], { matchType: "unknown" as ClubMatch["matchType"] }),
    game("bad-score", WEEK_1, [player()], { scoreUs: -1 }),
    game("no-players", WEEK_1, [], { players: null as unknown as Player[] }),
    game("bad-player", WEEK_1, [player("Bad", { goals: Infinity })]),
    game("opponent", WEEK_1, [player("Other", { isOurPlayer: false })]),
    game("", WEEK_1), null as unknown as ClubMatch,
    ...[NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE, -1,
      timestamp(WEEK_1) + 0.5, 8.64e12, 8.64e12 + 1].map((time, i) =>
      game(`poison-${i}`, WEEK_1, [player()], { timestamp: time })),
    ...games("2026-09-21T00:00:00Z"),
  ];
  assert.deepEqual(history(rejected).weeks, []);
  const matches = [...rejected, ...games(), game("epoch", WEEK_1, [player()], { timestamp: 0 })];
  const result = history(matches);
  assert.deepEqual(result.weeks.map(w => w.start), [WEEK_3, "1969-12-29T00:00:00.000Z"]);
  assert.equal(result.weeks[1].games, 1);
  assert.equal(result.totalAwards, 1);
  assert.equal(result.weeks[0].coverage.reasons.private, 1);
  assert.equal(result.weeks[0].coverage.reasons.synthetic, 3);
  assert.ok((result.weeks[0].coverage.reasons["invalid-game"] ?? 0) >= 10);
  assertWeeklyParity(matches, result);
  assert.deepEqual(history(matches, "+275760-09-13T00:00:00.000Z").weeks.map(w => w.start),
    ["2026-09-21T00:00:00.000Z", WEEK_3, "1969-12-29T00:00:00.000Z"]);
});

test("a player eligible in two roles still receives only one win per completed week", () => {
  const goalie = player("A", { position: "goalie", isGoalie: true, saves: 9, shotsAgainst: 10, goalsAgainst: 1 });
  const matches = [...games(), ...games("2026-09-08T12:00:00Z", [goalie])];
  const result = history(matches);
  assert.equal(result.weeks[0].games, 6);
  assert.equal(result.weeks[0].winners.length, 1);
  assert.equal(result.rankings[0].wins, 1);
  assert.equal(result.totalAwards, 1);
  assertWeeklyParity(matches, result);
});

test("same-name source IDs stay separate and stable name/id ordering breaks cumulative ties", () => {
  const matches = [...games(WEEK_1, [player("Same", { playerId: "2" })]),
    ...games(WEEK_2, [player("Same", { playerId: "1" })]),
    ...games(WEEK_3, [player("Same", { playerId: "2" }), player("Same", { playerId: "1" }),
      player("Alpha", { playerId: "3" })])];
  const result = history(matches);
  assert.deepEqual(result.rankings, [
    { playerId: "1", name: "Same", wins: 2, rank: 1, lastWin: WEEK_3 },
    { playerId: "2", name: "Same", wins: 2, rank: 1, lastWin: WEEK_3 },
    { playerId: "3", name: "Alpha", wins: 1, rank: 3, lastWin: WEEK_3 },
  ]);
  assert.equal(result.totalAwards, 5);
  const tied = history(games(WEEK_3, [player("Same", { playerId: "2" }), player("Same", { playerId: "1" }),
    player("Alpha", { playerId: "3" })]));
  assert.deepEqual(tied.rankings.map(p => [p.playerId, p.rank]), [["3", 1], ["1", 1], ["2", 1]]);
});

test("ID-less winners retain normalized name keys across weeks; no cross-week alias inference", () => {
  const matches = [...games(WEEK_1, [player("  Alice  ", { playerId: undefined })]),
    ...games(WEEK_2, [player("ALICE", { playerId: undefined })]),
    ...games(WEEK_3, [player("Alice", { playerId: "42" })])];
  assert.deepEqual(history(matches).rankings, [
    { playerId: "name:alice", name: "ALICE", wins: 2, rank: 1, lastWin: WEEK_2 },
    { playerId: "42", name: "Alice", wins: 1, rank: 2, lastWin: WEEK_3 },
  ]);
  const aliases = [game("1", WEEK_3, [player("Alice", { playerId: undefined })]),
    game("2", WEEK_3, [player("Alice", { playerId: "42" })]),
    game("3", WEEK_3, [player("Alice", { playerId: "42" })])];
  assert.deepEqual(history(aliases).rankings, [
    { playerId: "42", name: "Alice", wins: 1, rank: 1, lastWin: WEEK_3 },
  ], "the existing within-week unambiguous alias behavior is preserved");
  const ambiguous = [...games(WEEK_1, [player("Same", { playerId: "1" })]),
    ...games(WEEK_2, [player("Same", { playerId: "2" })]),
    ...games(WEEK_3, [player("Same", { playerId: undefined }), player("Same", { playerId: "1" }),
      player("Same", { playerId: "2" })])];
  assert.deepEqual(history(ambiguous).rankings.map(p => [p.playerId, p.wins, p.rank]),
    [["1", 2, 1], ["2", 2, 1], ["name:same", 1, 3]]);
});

test("renamed IDs aggregate deterministically without mutating deeply frozen inputs", () => {
  const matches = [...games(WEEK_1, [player("Zulu", { playerId: "42" }), player("B")]),
    ...games(WEEK_2, [player("Alpha", { playerId: "42" }), player("B")]),
    ...games(WEEK_3, [player("Newest", { playerId: "42" }), player("B")])];
  matches.push(structuredClone(matches[0]), game("private", WEEK_1, [], { matchType: "private" }));
  const before = structuredClone(matches);
  function freeze(value: unknown): void {
    if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); }
  }
  freeze(matches);
  const result = history(matches);
  assert.deepEqual(result.rankings, [
    { playerId: "42", name: "Alpha", wins: 3, rank: 1, lastWin: WEEK_3 },
    { playerId: "B", name: "B", wins: 3, rank: 1, lastWin: WEEK_3 },
  ]);
  assert.deepEqual(matches, before);
  assert.deepEqual(history(matches), result);
  for (let i = 0; i < matches.length; i++) {
    const permuted = [...matches.slice(i), ...matches.slice(0, i)].reverse()
      .map(m => ({ ...m, players: [...m.players].reverse() }));
    assert.deepEqual(history(permuted), result);
  }
  assertWeeklyParity(matches, result);
});

test("history has no clock, network, storage or legacy archive fallback", () => {
  const source = readFileSync(new URL("../src/lib/hockey-awards.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /chelstats-frozen|FROZEN_CHELSTATS|process\.env|fetch\(|Date\.now|new Date\(\)|redis|localStorage/);
});
