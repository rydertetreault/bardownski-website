import assert from "node:assert/strict";
import test from "node:test";
import { addClubWeeks, clubWeekStart, formatClubWeekRange } from "../src/lib/club-time";
import { calculateHockeyAwards } from "../src/lib/hockey-awards";
import { getWeekPeriods } from "../src/app/matches/utils";
import type { ChelstatsData, ClubMatch, ClubMember, MatchPlayerStat } from "../src/lib/chelstats";
import type { Match } from "../src/types";

const iso = (ms: number) => new Date(ms).toISOString();
const at = (value: string) => Date.parse(value);

test("weeks start Monday 00:00 Central Time, not UTC", () => {
  // Sunday Oct 25 2026, 10:12 PM EDT / 9:12 PM CDT is still the week of Oct 19 in Central.
  assert.equal(iso(clubWeekStart(at("2026-10-25T22:12:00-04:00"))), "2026-10-19T05:00:00.000Z");
  assert.equal(iso(clubWeekStart(at("2026-10-25T23:59:59-05:00"))), "2026-10-19T05:00:00.000Z");
  assert.equal(iso(clubWeekStart(at("2026-10-26T00:00:00-05:00"))), "2026-10-26T05:00:00.000Z");
  assert.equal(formatClubWeekRange(clubWeekStart(at("2026-10-25T21:00:00-05:00")),
    addClubWeeks(clubWeekStart(at("2026-10-25T21:00:00-05:00")), 1)), "Oct 19 – Oct 25");
});

test("daylight-saving weeks stay aligned to Central midnight (169h in November, 167h in March)", () => {
  const fall = clubWeekStart(at("2026-10-28T12:00:00Z"));
  assert.equal(iso(fall), "2026-10-26T05:00:00.000Z");
  assert.equal(iso(addClubWeeks(fall, 1)), "2026-11-02T06:00:00.000Z");
  assert.equal((addClubWeeks(fall, 1) - fall) / 3_600_000, 169);
  const spring = clubWeekStart(at("2027-03-10T12:00:00Z"));
  assert.equal(iso(spring), "2027-03-08T06:00:00.000Z");
  assert.equal(iso(addClubWeeks(spring, 1)), "2027-03-15T05:00:00.000Z");
  assert.equal((addClubWeeks(spring, 1) - spring) / 3_600_000, 167);
  assert.equal(iso(addClubWeeks(addClubWeeks(spring, 1), -1)), iso(spring));
});

test("results never depend on the server's own time zone", () => {
  // The host zone is whatever the test runner uses; Central answers are fixed regardless.
  assert.equal(iso(clubWeekStart(at("2027-01-01T05:00:00Z"))), "2026-12-28T06:00:00.000Z");
  assert.ok(Number.isNaN(clubWeekStart(NaN)));
  assert.ok(Number.isNaN(addClubWeeks(8.64e15, 1)));
});

type Player = MatchPlayerStat & { playerId?: string };
const skater = (): Player => ({ name: "A", playerId: "A", position: "center", isGoalie: false, isOurPlayer: true,
  goals: 1, assists: 1, hits: 2, shots: 4, plusMinus: 1, pim: 0, blockedShots: 1, takeaways: 2, giveaways: 1,
  powerPlayGoals: 0, shortHandedGoals: 0, gameWinningGoal: 0, saves: 0, shotsAgainst: 0, goalsAgainst: 0,
  savePct: 0, shutoutPeriods: 0 });
const game = (id: string, when: string): ClubMatch => ({ id, timestamp: at(when) / 1000, date: "", opponent: "Other",
  homeAway: "home", scoreUs: 3, scoreThem: 1, matchType: "regular", shotsUs: 12, shotsThem: 10, toaUs: "2:00",
  toaThem: "2:00", passCompUs: 70, passCompThem: 70, result: "win", players: [skater()], threeStars: null });
const data = (matches: ClubMatch[]): ChelstatsData => ({ matches, members: [{ username: "A" } as ClubMember],
  clubStats: { record: "0-0-0", wins: 0, losses: 0, otl: 0, goals: 0, goalsAgainst: 0, goalsPerGame: 0,
    goalsAgainstPerGame: 0, totalGames: matches.length, seasons: 0, titlesWon: 0, currentDivision: 0,
    bestDivision: 0, starLevel: 0, overallRating: 0 } });

test("Sunday-night Central games count toward that week, and the award waits for midnight CT", () => {
  // Three games Sunday evening Central; the last is at 11:30 PM CDT (04:30 UTC Monday).
  const rows = [game("1", "2026-10-25T19:00:00-05:00"), game("2", "2026-10-25T21:00:00-05:00"),
    game("3", "2026-10-25T23:30:00-05:00")];
  const sundayNight = calculateHockeyAwards(data(rows), "2026-10-25T23:45:00-05:00");
  assert.equal(sundayNight.currentWeek.start, "2026-10-19T05:00:00.000Z");
  assert.equal(sundayNight.currentWeek.status, "in-progress");
  assert.equal(sundayNight.currentWeek.games, 3);
  assert.deepEqual(sundayNight.currentWeek.winners, []);
  const monday = calculateHockeyAwards(data(rows), "2026-10-26T00:00:00-05:00");
  assert.equal(monday.lastCompletedWeek.start, "2026-10-19T05:00:00.000Z");
  assert.equal(monday.lastCompletedWeek.end, "2026-10-26T05:00:00.000Z");
  assert.equal(monday.lastCompletedWeek.status, "complete");
  assert.equal(monday.lastCompletedWeek.winners[0]?.playerId, "A");
  assert.equal(monday.currentWeek.start, "2026-10-26T05:00:00.000Z");
  assert.equal(monday.currentWeek.games, 0);
});

test("matches page groups Mon–Sun Central weeks, including the 169-hour DST week", () => {
  const periods = getWeekPeriods([
    { timestamp: at("2026-10-25T23:30:00-05:00") / 1000 },
    { timestamp: at("2026-11-01T23:30:00-06:00") / 1000 },
  ] as Match[]);
  assert.deepEqual(periods.map(p => p.dateRange), ["Oct 26, 2026 – Nov 1, 2026", "Oct 19, 2026 – Oct 25, 2026"]);
  assert.equal(periods[0].endTs, at("2026-11-02T00:00:00-06:00") / 1000 - 1);
});
