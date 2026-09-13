import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateHockeyAwards, calculateSeasonMvp } from "../src/lib/hockey-awards";
import { computeMvpOddsFromMembers, type ChelstatsData, type ClubMatch, type ClubMember, type MatchPlayerStat } from "../src/lib/chelstats";
import { parseNhl27Snapshot } from "../src/lib/nhl27-api";

const MONDAY = "2026-09-14T00:00:00.000Z";
const SUNDAY = "2026-09-13T23:59:59.000Z";
const timestamp = (iso: string) => Date.parse(iso) / 1000;
type Player = MatchPlayerStat & { playerId?: string };
function player(name = "A", overrides: Partial<Player> = {}): Player {
  return { name, playerId: name, position: "center", isGoalie: false, isOurPlayer: true,
    goals: 1, assists: 1, hits: 2, shots: 4, plusMinus: 1, pim: 0, blockedShots: 1,
    takeaways: 2, giveaways: 1, powerPlayGoals: 0, shortHandedGoals: 0, gameWinningGoal: 0,
    saves: 0, shotsAgainst: 0, goalsAgainst: 0, savePct: 0, shutoutPeriods: 0, ...overrides };
}
function goalie(name = "G", overrides: Partial<Player> = {}): Player {
  return player(name, { position: "goalie", isGoalie: true, goals: 0, assists: 0,
    saves: 9, shotsAgainst: 10, goalsAgainst: 1, savePct: 0.9, ...overrides });
}
function game(id = "1", players = [player()], overrides: Partial<ClubMatch> = {}): ClubMatch {
  return { id, timestamp: timestamp("2026-09-10T12:00:00Z"), date: "ignored display date",
    opponent: "Other club", homeAway: "home", scoreUs: 3, scoreThem: 1, matchType: "regular",
    shotsUs: 12, shotsThem: 10, toaUs: "2:00", toaThem: "2:00", passCompUs: 70,
    passCompThem: 70, result: "win", players, threeStars: null, ...overrides };
}
function games(players = [player()], n = 3): ClubMatch[] {
  return Array.from({ length: n }, (_, i) => game(String(i + 1), players));
}
function member(username = "A", overrides: Partial<ClubMember> = {}): ClubMember {
  return { username, position: "C", gamesPlayed: 5, goals: 5, assists: 5, points: 10,
    ppg: 2, plusMinus: 5, hits: 10, shots: 20, shotPct: 25, pim: 0, gwg: 1,
    winPct: 60, takeaways: 10, giveaways: 5, interceptions: 1, blockedShots: 5,
    faceoffPct: 50, passCompPct: 70, goalieGP: 0, goalieWins: 0, goalieRecord: "0-0-0",
    goalieSaves: 0, goalieShots: 0, savePct: 0, gaa: 0, shutouts: 0, shutoutPeriods: 0,
    overallRating: 75, playstyle: "", ...overrides };
}
function data(matches: ClubMatch[], members: ClubMember[] = []): ChelstatsData {
  return { matches, members, clubStats: { record: "0-0-0", wins: 0, losses: 0, otl: 0,
    goals: 0, goalsAgainst: 0, goalsPerGame: 0, goalsAgainstPerGame: 0, totalGames: matches.length,
    seasons: 0, titlesWon: 0, currentDivision: 0, bestDivision: 0, starLevel: 0, overallRating: 0 } };
}
const completed = (matches: ClubMatch[]) => calculateHockeyAwards(data(matches), MONDAY).lastCompletedWeek;
const q = (n: number) => Math.round(n * 10) / 10;

 test("MVP exactly preserves legacy raw scoring, ordering, role minimum five and strongest unique role", () => {
  const members = [member("A"), member("B", { position: "D" }), member("Hybrid", {
    goalieGP: 5, goalieWins: 4, goalieSaves: 90, savePct: 90, gaa: 2, shutouts: 1, shutoutPeriods: 6,
  }), member("Short", { gamesPlayed: 4, goalieGP: 4 })];
  const expected = computeMvpOddsFromMembers(members);
  const actual = calculateSeasonMvp(members);
  const unique = expected.filter((e, i) => expected.findIndex(other => other.name === e.name) === i);
  assert.deepEqual(actual.map(e => [e.name, e.score, e.isGoalie]), unique.map(e => [e.name, e.score, e.isGoalie]));
  assert.equal(actual.length, 3);
  assert.deepEqual(calculateSeasonMvp([...members, members[0]]), actual);
  assert.ok(actual.every(e => e.games >= 5));
  assert.ok(actual.every(e => !Object.hasOwn(e, "probability") && !Object.hasOwn(e, "americanOdds")));
  const close = calculateSeasonMvp([member("Low"), member("High", { ppg: 2.00001 })]);
  assert.equal(q(close[0].score), q(close[1].score));
  assert.deepEqual(close.map(e => [e.name, e.rank]), [["High", 1], ["Low", 2]], "MVP ranks must NOT quantize");
  const tied = calculateSeasonMvp([member("A"), member("B"), member("C", { ppg: 1 })]);
  assert.deepEqual(tied.map(e => e.rank), [1, 1, 3]);
});

test("MVP malformed roles cannot poison valid candidates, missing unused rates do not crash", () => {
  assert.deepEqual(calculateSeasonMvp([]), []);
  assert.deepEqual(calculateSeasonMvp([member("NaN", { ppg: NaN }), member("Infinity", { gamesPlayed: Infinity })]), []);
  const hybrid = member("Hybrid", { ppg: NaN, goalieGP: 5, goalieWins: 3, goalieSaves: 50, savePct: 90, gaa: 1 });
  assert.equal(calculateSeasonMvp([hybrid])[0].isGoalie, true);
  const skater = member("Skater", { savePct: undefined as unknown as number, gaa: undefined as unknown as number });
  assert.equal(calculateSeasonMvp([skater])[0].isGoalie, false);
});

test("weekly exact forward, defense and goalie historical weights and aggregate goalie rates", () => {
  const rows = games([player("F"), player("D", { position: "leftDefense" }), goalie()]);
  const result = completed(rows);
  const byName = Object.fromEntries(result.standings.map(p => [p.name, p]));
  assert.equal(byName.F.score, q((2 * 8 + 3 + 25 * .15 + 2 * .3 + 2 * .3 - .2 + .4) * Math.sqrt(3)));
  assert.equal(byName.D.score, q((2 * 16 + 6 + 2 * .8 + 1.5 + 2 - .5) * Math.sqrt(3)));
  assert.equal(byName.G.score, q(((90 - 65) * 2 + (5 - 1) * 4 + 10 + 9 * 1.5) * Math.sqrt(3)));
  assert.equal(byName.G.games, 3); assert.equal(byName.G.gaa, 1); assert.equal(byName.G.savePct, 90);
  assert.equal(result.games, 3); assert.equal(result.coverage.acceptedAppearances, 9);
  const unequal = completed([game("1", [goalie("G", { saves: 1, shotsAgainst: 2, goalsAgainst: 1, savePct: .99 })]),
    game("2", [goalie("G", { saves: 18, shotsAgainst: 20, goalsAgainst: 2, savePct: .01 })])]).standings[0];
  assert.equal(unequal.savePct, 19 / 22 * 100); assert.equal(unequal.gaa, 1.5);
});

test("actual source position spellings, rather than first position or SKTR guesses", () => {
  const roles = ["leftDefense", "rightDefense", "defenseMen", "defenseman", "left defence", "LD", "RD", "D"];
  for (const role of roles) assert.equal(completed(games([player("D", { position: role })])).standings[0].position, "D", role);
  for (const role of ["center", "leftWing", "rightWing", "LW", "RW", "forward"]) {
    assert.equal(completed(games([player("F", { position: role })])).standings[0].position, "F", role);
  }
  assert.equal(completed(games([player("Unknown", { position: "SKTR" })])).standings.length, 0);
  const switched = [...games([player("Hybrid", { position: "rightDefense" })]),
    game("4", [player("Hybrid", { goals: 99, shots: 99 })]), game("5", [goalie("Hybrid", { saves: 90, shotsAgainst: 90, goalsAgainst: 0 })])];
  const best = completed(switched).standings;
  assert.equal(best.length, 1); assert.equal(best[0].position, "D"); assert.equal(best[0].games, 3);
  assert.equal(best[0].points, 6); assert.equal(best[0].eligible, true);
  const split = completed([game("1", [player("Hybrid")]), game("2", [player("Hybrid")]),
    game("3", [player("Hybrid", { position: "D" })])]);
  assert.equal(split.standings.length, 1); assert.equal(split.standings[0].eligible, false);
  assert.deepEqual(split.winners, [], "three combined appearances cannot qualify either role");
});

test("Monday deadline, current provisional leaders, completed only winners and no future/private/archive games", () => {
  const rows = [...games(), game("start", [player()], { timestamp: timestamp("2026-09-07T00:00:00Z") }),
    game("deadline", [player()], { timestamp: timestamp(MONDAY) }),
    game("last-second", [player()], { timestamp: timestamp(SUNDAY) }),
    game("future", [player()], { timestamp: timestamp("2026-09-15T00:00:00Z") }),
    game("old", [player()], { timestamp: timestamp("2026-07-20T00:00:00Z") }),
    game("preweek", [player()], { timestamp: timestamp("2026-09-06T23:59:59Z") }),
    game("private", [player()], { matchType: "private" })];
  const before = calculateHockeyAwards(data(rows), SUNDAY);
  assert.equal(before.currentWeek.games, 5); assert.deepEqual(before.currentWeek.winners, []);
  assert.equal(before.currentWeek.status, "in-progress"); assert.equal(before.currentWeek.leaders[0].eligible, true);
  const after = calculateHockeyAwards(data(rows), MONDAY);
  assert.equal(after.currentWeek.games, 1); assert.equal(after.currentWeek.leaders[0].eligible, false);
  assert.equal(after.lastCompletedWeek.games, 5); assert.equal(after.lastCompletedWeek.winners.length, 1);
  assert.equal(after.lastCompletedWeek.status, "complete"); assert.equal(after.currentWeek.start, MONDAY);
  assert.equal(after.lastCompletedWeek.start, "2026-09-07T00:00:00.000Z");
  assert.equal(after.lastCompletedWeek.end, MONDAY);
  assert.equal(after.lastCompletedWeek.coverage.acceptedGames + after.lastCompletedWeek.coverage.skippedGames, rows.length);
});

test("new year, timezone conversion and repeated-read rollover never reuse an older completed award", () => {
  const rows = games().map(m => ({ ...m, timestamp: timestamp("2026-12-31T23:00:00Z") }));
  const before = calculateHockeyAwards(data(rows), "2027-01-03T23:59:59Z");
  assert.equal(before.currentWeek.start, "2026-12-28T00:00:00.000Z");
  const after = calculateHockeyAwards(data(rows), "2027-01-03T19:00:00-05:00");
  assert.equal(after.currentWeek.start, "2027-01-04T00:00:00.000Z");
  assert.equal(after.lastCompletedWeek.winners.length, 1); assert.equal(after.currentWeek.games, 0);
  const next = calculateHockeyAwards(data(rows), "2027-01-11T00:00:00Z");
  assert.equal(next.lastCompletedWeek.games, 0); assert.deepEqual(next.lastCompletedWeek.winners, []);
  assert.equal(next.lastCompletedWeek.start, "2027-01-04T00:00:00.000Z");
  assert.throws(() => calculateHockeyAwards(data([]), "not-a-date"), RangeError);
  assert.throws(() => calculateHockeyAwards(data([]), "2027-01-04T00:00:00"), RangeError);
});

test("three role games required, eligible leader preferred to one-game spike, weekly quantized ties share competition ranks", () => {
  for (const n of [1, 2]) {
    const week = completed(games([player()], n));
    assert.equal(week.standings[0].eligible, false); assert.deepEqual(week.winners, []);
    assert.equal(week.leaders.length, 1);
  }
  const rows = games([player("A"), player("B", { shots: 401, goals: 100, assists: 0 }), player("C", { goals: 0, assists: 0 })]);
  // A second pair with slightly different raw shooting rates round to the same tenth.
  const tiedRows = games([player("A", { shots: 1000, goals: 100, assists: 0 }), player("B", { shots: 1001, goals: 100, assists: 0 }), player("C", { goals: 0, assists: 0 })]);
  const tied = completed(tiedRows);
  assert.deepEqual(tied.standings.map(p => p.rank), [1, 1, 3]); assert.equal(tied.winners.length, 2);
  const spike = completed([...rows, game("spike", [player("Spike", { goals: 1000, shots: 1000 })])]);
  assert.equal(spike.standings[0].name, "Spike"); assert.equal(spike.standings[0].eligible, false);
  assert.ok(spike.leaders.every(p => p.eligible)); assert.ok(spike.winners.every(p => p.eligible));
});

test("stable game/player IDs deduplicate, contradictory records fail closed and order does not matter", () => {
  const rows = games();
  const duplicate = { ...rows[0], players: rows[0].players.map(p => ({ ...p })) };
  const week = completed([...rows, duplicate]);
  assert.equal(week.games, 3); assert.equal(week.standings[0].games, 3); assert.equal(week.coverage.reasons["duplicate-game"], 1);
  const contradiction = { ...rows[0], scoreUs: 99 };
  const conflicted = completed([...rows, contradiction]);
  assert.equal(conflicted.games, 2); assert.equal(conflicted.coverage.reasons["conflicting-game"], 2);
  assert.deepEqual(conflicted.winners, []);
  assert.deepEqual(completed([...rows, contradiction].reverse()), conflicted);
  const repeatedPlayers = completed(games([player(), player()]));
  assert.equal(repeatedPlayers.standings[0].games, 3); assert.equal(repeatedPlayers.coverage.skippedAppearances, 3);
  const badPlayers = completed(games([player(), player("A", { goals: 2 }), player("Good")]));
  assert.deepEqual(badPlayers.standings.map(p => p.name), ["Good"]); assert.equal(badPlayers.coverage.reasons["conflicting-player"], 6);
  const renamed = completed([game("1", [player("Old", { playerId: "123" })]),
    game("2", [player("New", { playerId: "123" })]), game("3", [player("New", { playerId: "123" })])]);
  assert.equal(renamed.standings.length, 1); assert.equal(renamed.standings[0].games, 3);
  const nameOnly = completed([game("1", [player("Alice", { playerId: undefined })]),
    game("2", [player(" ALICE ", { playerId: "42" })]), game("3", [player("Alice", { playerId: "42" })])]);
  assert.equal(nameOnly.standings[0].playerId, "42"); assert.equal(nameOnly.standings[0].games, 3);
  const sameName = completed(games([player("Same", { playerId: "1" }), player("Same", { playerId: "2" })]));
  assert.equal(sameName.standings.length, 2);
});

test("real DNF counts reported stats, synthetic forfeits do not, and shutouts require actual shots", () => {
  const full = completed(games([goalie("G", { saves: 10, shotsAgainst: 10, goalsAgainst: 0, shutoutPeriods: 3 })]));
  const dnfRows = games([goalie("G", { saves: 10, shotsAgainst: 10, goalsAgainst: 0, shutoutPeriods: 2 })]).map(m => ({ ...m, forfeit: true }));
  const dnf = completed(dnfRows);
  assert.equal(dnf.games, 3); assert.equal(dnf.standings[0].shutouts, 3); assert.ok(dnf.standings[0].score < full.standings[0].score);
  const noPeriods = completed(games([goalie("G", { saves: 10, shotsAgainst: 10, goalsAgainst: 0, shutoutPeriods: undefined as unknown as number })]).map(m => ({ ...m, forfeit: true })));
  assert.ok(noPeriods.standings[0].score < dnf.standings[0].score);
  const noShots = completed(games([goalie("G", { saves: 0, shotsAgainst: 0, goalsAgainst: 0, shutoutPeriods: 3 })]));
  assert.equal(noShots.standings[0].shutouts, 0); assert.equal(noShots.standings[0].savePct, 0); assert.equal(noShots.standings[0].score, 0);
  const synthetic = completed([...dnfRows, game("forfeit-win-900"), game("synthetic-1")]);
  assert.equal(synthetic.games, 3); assert.equal(synthetic.coverage.reasons.synthetic, 2);
});

test("invalid/nonfinite/missing stats, opponents, invalid dates and unknown roles cannot create awards", () => {
  const bad = [player("NaN", { goals: NaN }), player("Missing", { assists: undefined as unknown as number }),
    player("Infinite", { blockedShots: Infinity }), player("Negative", { hits: -1 }),
    player("Unknown", { position: "???" }), goalie("Impossible", { saves: 11 }),
    goalie("MissingGoalie", { saves: undefined as unknown as number }), player("Opponent", { isOurPlayer: false })];
  const week = completed(games(bad));
  assert.equal(week.games, 0); assert.equal(week.standings.length, 0); assert.equal(week.coverage.skippedAppearances, 21);
  assert.ok(week.coverage.samples.length <= 10); assert.equal(week.coverage.reasons["no-valid-appearances"], 3);
  assert.equal(completed([game("bad-time", [player()], { timestamp: NaN })]).games, 0);
  const optional = completed(games([player("Older", { blockedShots: undefined as unknown as number, takeaways: undefined as unknown as number, giveaways: undefined as unknown as number })]));
  assert.equal(optional.games, 3); assert.ok(Number.isFinite(optional.standings[0].score));
  function assertFinite(value: unknown): void {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
    else if (value && typeof value === "object") Object.values(value).forEach(assertFinite);
  }
  assertFinite(week); assertFinite(optional);
});

test("actual NHL27 public tracker fixture computes live MVP/weekly stats and remains pure", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/nhl27-public.json", import.meta.url), "utf8"));
  const source = parseNhl27Snapshot(fixture, "2026-09-13T07:00:00Z").data;
  const before = JSON.stringify(source);
  function freeze(value: unknown): void {
    if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); }
  }
  freeze(source);
  const awards = calculateHockeyAwards(source, SUNDAY);
  assert.equal(JSON.stringify(source), before);
  assert.ok(awards.seasonMvp.length > 0); assert.ok(awards.currentWeek.standings.length > 0);
  assert.equal(awards.currentWeek.games, source.matches.filter(m => m.matchType !== "private").length);
  assert.deepEqual(calculateHockeyAwards(source, SUNDAY), awards);
  const reversed = { ...source, matches: [...source.matches].reverse().map(m => ({ ...m, players: [...m.players].reverse() })), members: [...source.members].reverse() };
  assert.deepEqual(calculateHockeyAwards(reversed, SUNDAY), awards);
  assert.deepEqual(calculateHockeyAwards(data([]), MONDAY).seasonMvp, []);
  assert.deepEqual(calculateHockeyAwards(data([]), MONDAY).lastCompletedWeek.winners, []);
  assert.doesNotMatch(readFileSync(new URL("../src/lib/hockey-awards.ts", import.meta.url), "utf8"), /chelstats-frozen|FROZEN_CHELSTATS|process\.env|fetch\(|Date\.now|new Date\(\)/);
});
