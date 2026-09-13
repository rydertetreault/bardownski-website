import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildLinePlayers, lineDraftKey } from "../src/components/lines/line-datasets";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import type { ClubMember } from "../src/lib/chelstats";
import {
  buildChemistryDataset, evaluateChemistrySelection, normalizeChemistryName,
  type ChemistryGame, type ChemistryStats,
} from "../src/lib/line-chemistry";
import {
  getLineRating, getPlayerGrade, getPlayerPerformanceRating, getProjectedLineRating,
  LINE_RATING_DESCRIPTION, PLAYER_RATING_DESCRIPTION, PROJECTED_LINE_RATING_DESCRIPTION,
  type PlayerPerformanceStats, type ProjectedLineProfile,
} from "../src/lib/line-ratings";
import { NHL27_IDENTITY, parseNhl27Snapshot } from "../src/lib/nhl27-api";

const unrated = { percentage: null, grade: null };
const noPerformance = { rating: null, grade: null };
function stats(extra: Partial<ChemistryStats> = {}): ChemistryStats {
  return {
    games: 10, wins: 6, losses: 3, draws: 1, goalsFor: 30, goalsAgainst: 20,
    winPct: 60, gfPerGame: 3, gaPerGame: 2, gdPerGame: 1, wilsonLowerBound: 0.3,
    ...extra,
  };
}
function skater(extra: Partial<PlayerPerformanceStats> = {}): PlayerPerformanceStats {
  return { gamesPlayed: 10, goals: 10, assists: 10, points: 20, plusMinus: 0, ...extra };
}
function member(extra: Partial<ClubMember> = {}): ClubMember {
  return { ...FROZEN_CHELSTATS.members[0], ...extra };
}
function fixture() {
  return JSON.parse(readFileSync(new URL("./fixtures/nhl27-public.json", import.meta.url), "utf8"));
}
function game(extra: Partial<ChemistryGame> = {}): ChemistryGame {
  return {
    id: "test", date: "Saved", timestamp: 1, opponent: "Visitors", goalsFor: 3, goalsAgainst: 1,
    skaters: ["MATT HUT", "XAVIER LAFLAMME"], ...extra,
  };
}
function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
}

test("line index: exact local formula, draw half-credit, goal share and small-sample damping", () => {
  // Result share .65, goal share .60 => raw 62.5 => 50 + 12.5 * 10/15 => 58.
  assert.deepEqual(getLineRating(stats()), { percentage: 58, grade: "C" });
  const cleanWin = stats({ games: 1, wins: 1, losses: 0, draws: 0, goalsFor: 1, goalsAgainst: 0 });
  assert.deepEqual(getLineRating(cleanWin), { percentage: 58, grade: "C" });
  assert.deepEqual(getLineRating({ ...cleanWin, games: 20, wins: 20, goalsFor: 20 }), { percentage: 90, grade: "A" });
  assert.deepEqual(getLineRating(stats({ games: 1, wins: 0, losses: 1, draws: 0, goalsFor: 0, goalsAgainst: 1 })),
    { percentage: 42, grade: "D" });
  assert.deepEqual(getLineRating(stats({ games: 20, wins: 0, losses: 20, draws: 0, goalsFor: 0, goalsAgainst: 20 })),
    { percentage: 10, grade: "F" });
  const sameRecord = stats({ goalsFor: 40, goalsAgainst: 10 });
  assert.ok(getLineRating(sameRecord).percentage! > getLineRating(stats()).percentage!);
  // An equal record with equal club goals is neutral, not a failing win percentage.
  assert.deepEqual(getLineRating(stats({ wins: 5, losses: 5, draws: 0, goalsFor: 20, goalsAgainst: 20 })),
    { percentage: 50, grade: "C" });
});

test("no games is unrated; real goalless draws have evidence and stay neutral", () => {
  const empty = evaluateChemistrySelection([], ["MATT", "DYLAN"]).stats;
  assert.deepEqual(getLineRating(empty), unrated);
  const draw = evaluateChemistrySelection([game({ goalsFor: 0, goalsAgainst: 0 })], ["MATT", "DYLAN"]).stats;
  assert.deepEqual(getLineRating(draw), { percentage: 50, grade: "C" });
  assert.equal(draw.winPct, 0);
  for (const selected of [[], ["MATT"], ["MATT", "Unknown"], ["MATT", "DYLAN", "A", "B"]]) {
    assert.deepEqual(getLineRating(evaluateChemistrySelection([game()], selected).stats), unrated);
  }
});

test("line counts fail closed; cached rates and Wilson bound are not chemistry inputs", () => {
  for (const field of ["games", "wins", "losses", "draws", "goalsFor", "goalsAgainst"] as const) {
    for (const bad of [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, "10"]) {
      assert.deepEqual(getLineRating(stats({ [field]: bad } as Partial<ChemistryStats>)), unrated, `${field}: ${bad}`);
    }
  }
  for (const extra of [
    { games: 0 }, { wins: 7 }, { goalsFor: 0 }, { goalsAgainst: 0 },
    { goalsFor: Number.MAX_SAFE_INTEGER, goalsAgainst: 1 },
    { games: 2, wins: 1, losses: 0, draws: 1, goalsFor: 1, goalsAgainst: 4 },
    { games: 2, wins: 0, losses: 1, draws: 1, goalsFor: 4, goalsAgainst: 1 },
    { games: 1, wins: 0, losses: 0, draws: 1, goalsFor: 3, goalsAgainst: 2 },
  ]) assert.deepEqual(getLineRating(stats(extra)), unrated);
  assert.deepEqual(getLineRating(stats({
    winPct: NaN, gfPerGame: Infinity, gaPerGame: null, gdPerGame: -999, wilsonLowerBound: 1,
  })), getLineRating(stats()));
});

test("line grading uses rounded displayed score; valid outcomes are bounded and deterministic", () => {
  // Shutout wins give 64, 69, 79, 81 at n=2,3,7,8 respectively.
  for (const [games, percentage, grade] of [[2, 64, "C"], [3, 69, "B"], [7, 79, "B"], [8, 81, "A"]] as const) {
    assert.deepEqual(getLineRating(stats({ games, wins: games, losses: 0, draws: 0, goalsFor: games, goalsAgainst: 0 })),
      { percentage, grade });
  }
  for (let n = 1; n <= 100; n++) {
    const wins = Math.floor(n / 3), losses = Math.floor(n / 2), draws = n - wins - losses;
    const input = Object.freeze(stats({ games: n, wins, losses, draws, goalsFor: wins * 3, goalsAgainst: losses * 2 }));
    const before = JSON.stringify(input);
    const result = getLineRating(input);
    assert.ok(Number.isInteger(result.percentage) && result.percentage! >= 0 && result.percentage! <= 100);
    assert.deepEqual(getLineRating(input), result);
    assert.equal(JSON.stringify(input), before);
  }
});

test("upstream OVR local letter bands; zero sentinel is never a failing grade", () => {
  for (const [rating, grade] of [
    [0.1, "F"], [59.99, "F"], [60, "D"], [69.99, "D"], [70, "C"],
    [79.99, "C"], [80, "B"], [89.99, "B"], [90, "A"], [100, "A"],
  ] as const) assert.equal(getPlayerGrade(rating), grade);
  for (const invalid of [null, 0, -0, -1, 100.1, NaN, Infinity, -Infinity, undefined, "90", false]) {
    assert.equal(getPlayerGrade(invalid as number | null), null);
  }
});

test("local player performance formula is calculated from season skater totals, not rounded PPG", () => {
  // PPG 2 -> production .5; +/- per game 0 -> balance .5; raw 50 -> Lab C.
  assert.deepEqual(getPlayerPerformanceRating(skater()), { rating: 50, grade: "C" });
  // PPG 4 -> production 2/3; +/- per game 2 -> balance 1; raw 80; n=10 -> 70.
  assert.deepEqual(getPlayerPerformanceRating(skater({ goals: 20, assists: 20, points: 40, plusMinus: 20 })),
    { rating: 70, grade: "B" });
  assert.deepEqual(getPlayerPerformanceRating(skater({ goals: 20, assists: 20, points: 40, plusMinus: 200 })),
    { rating: 70, grade: "B" }, "positive plus-minus contribution is capped");
  const bad = skater({ goals: 0, assists: 0, points: 0, plusMinus: -20 });
  assert.deepEqual(getPlayerPerformanceRating(bad), { rating: 17, grade: "F" }, "recorded poor performance is not missing data");
  assert.deepEqual(getPlayerPerformanceRating({ ...bad, plusMinus: -200 }), getPlayerPerformanceRating(bad));
  const input = member({ ...skater(), ppg: 999, winPct: NaN, blockedShots: NaN, playstyle: "Made-up style" });
  freeze(input);
  const before = JSON.stringify(input);
  assert.deepEqual(getPlayerPerformanceRating(input), { rating: 50, grade: "C" });
  assert.equal(JSON.stringify(input), before);
  const tiny = getPlayerPerformanceRating(skater({ gamesPlayed: 1, goals: 2, assists: 2, points: 4, plusMinus: 2 }));
  assert.deepEqual(tiny, { rating: 55, grade: "C" });
});

test("performance: zero skater GP, malformed values and inconsistent point totals are unrated", () => {
  assert.deepEqual(getPlayerPerformanceRating(skater({ gamesPlayed: 0 })), noPerformance);
  assert.deepEqual(getPlayerPerformanceRating(skater({ points: 21 })), noPerformance);
  for (const field of ["gamesPlayed", "goals", "assists", "points", "plusMinus"] as const) {
    for (const bad of [NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, null, undefined, "10"]) {
      assert.deepEqual(getPlayerPerformanceRating(skater({ [field]: bad } as Partial<PlayerPerformanceStats>)), noPerformance);
    }
    if (field !== "plusMinus") assert.deepEqual(getPlayerPerformanceRating(skater({ [field]: -1 })), noPerformance);
  }
  const many = Number.MAX_SAFE_INTEGER;
  const result = getPlayerPerformanceRating(skater({ gamesPlayed: many, goals: many, assists: 0, points: many, plusMinus: -many }));
  assert.ok(Number.isInteger(result.rating) && result.rating! >= 0 && result.rating! <= 100);
});

test("real current fixture OVR/playstyle survive transform; dataset keeps upstream OVR distinct from Lab fallback", () => {
  const raw = fixture();
  const data = parseNhl27Snapshot(raw).data;
  const before = JSON.stringify(data);
  freeze(data);
  const games = buildChemistryDataset(data.matches, []).games;
  const players = buildLinePlayers(data.members, games, "current");
  for (const source of raw.memberData.filter((m: Record<string, string>) => Number(m["Games Played"]) > 0)) {
    const id = normalizeChemistryName(source.Username);
    const player = players.find(p => p.id === id)!;
    assert.equal(player.overallRating, source.overallRating["Overall Rating"]);
    assert.equal(player.grade, getPlayerGrade(player.overallRating));
    assert.equal(player.gradeSource, "overall-rating");
    assert.equal(player.performanceRating, null);
    assert.equal(data.members.find(m => m.username === source.Username)!.playstyle, source.overallRating.playstyle);
  }
  assert.equal(players.length, 3);
  assert.equal(JSON.stringify(data), before);

  // Actual parser behavior for an absent rating object: OVR=0, playstyle="".
  for (const source of raw.memberData) delete source.overallRating;
  const withoutRatings = parseNhl27Snapshot(raw).data;
  assert.ok(withoutRatings.members.every(m => m.overallRating === 0 && m.playstyle === ""));
  const fallback = buildLinePlayers(withoutRatings.members, games, "current");
  for (const player of fallback) {
    const source = withoutRatings.members.find(m => normalizeChemistryName(m.username) === player.id)!;
    assert.equal(player.overallRating, null);
    assert.equal(player.gradeSource, "lab-performance");
    assert.deepEqual({ rating: player.performanceRating, grade: player.grade }, getPlayerPerformanceRating(source));
    assert.notEqual(player.grade, null);
  }
});

test("dataset has no fabricated grades for zero GP, unknown skaters or unavailable archive OVR", () => {
  const observed = game({ skaters: ["MATT HUT", "NEW SKATER"] });
  const goalie = member({ username: "Mhut8", gamesPlayed: 0, goalieGP: 5, overallRating: 97 });
  const players = buildLinePlayers([goalie], [observed], "current");
  assert.equal(players.length, 2, "observed skaters remain selectable even if totals lag");
  for (const player of players) {
    assert.equal(player.overallRating, null);
    assert.equal(player.grade, null);
    assert.equal(player.gradeSource, null);
    assert.equal(player.performanceRating, null);
  }
  assert.deepEqual(buildLinePlayers([goalie], [], "current"), []);
  assert.deepEqual(buildLinePlayers([], [], "current"), []);
  const missingOvr = member({ overallRating: 0 });
  assert.equal(buildLinePlayers([missingOvr], [], "archive")[0].grade, null);
  for (const invalid of [NaN, Infinity, -1, 101]) {
    const p = buildLinePlayers([member({ overallRating: invalid })], [], "current")[0];
    assert.equal(p.overallRating, null);
    assert.equal(p.gradeSource, "lab-performance");
  }
});

test("current/archive ratings are isolated even for identical player names; archive is not mutated", () => {
  const before = JSON.stringify(FROZEN_CHELSTATS);
  const archive = buildLinePlayers(FROZEN_CHELSTATS.members, [], "archive");
  for (const source of FROZEN_CHELSTATS.members) {
    const player = archive.find(p => p.id === normalizeChemistryName(source.username))!;
    assert.equal(player.overallRating, source.overallRating);
    assert.equal(player.performanceRating, null);
  }
  const currentMember = member({ ...skater(), overallRating: 0, playstyle: "" });
  const current = buildLinePlayers([currentMember], [], "current");
  assert.equal(current[0].overallRating, null);
  assert.equal(current[0].performanceRating, 50);
  assert.equal(current[0].gradeSource, "lab-performance");
  assert.equal(current[0].grade, "C");
  assert.equal(archive.find(p => p.id === current[0].id)!.overallRating, 92);
  assert.equal(JSON.stringify(FROZEN_CHELSTATS), before);
  const identity = { id: NHL27_IDENTITY.storageKey, season: NHL27_IDENTITY.season };
  assert.notEqual(lineDraftKey(identity), lineDraftKey({ ...identity, season: "2025–2026" }));
  assert.notEqual(lineDraftKey(identity), lineDraftKey({ ...identity, id: "archive" }));
  assert.deepEqual(JSON.parse(JSON.stringify(current)), current, "nullable fields are serializable");
});

test("public methodology explicitly distinguishes local formulas, OVR, sample and season limitations", () => {
  assert.match(LINE_RATING_DESCRIPTION, /not Chelstats' formula or a win probability/);
  assert.match(LINE_RATING_DESCRIPTION, /wins \+ 0\.5 × draws/);
  assert.match(LINE_RATING_DESCRIPTION, /games \/ \(games \+ 5\)/);
  assert.match(LINE_RATING_DESCRIPTION, /selected season/);
  assert.match(PLAYER_RATING_DESCRIPTION, /missing\/zero-filled OVR is unrated, not F/);
  assert.match(PLAYER_RATING_DESCRIPTION, /PPG \/ \(PPG \+ 2\)/);
  assert.match(PLAYER_RATING_DESCRIPTION, /not league-calibrated/);
  assert.match(PLAYER_RATING_DESCRIPTION, /Zero skater GP/);
});


function profile(name: string, extra: Partial<ProjectedLineProfile> = {}): ProjectedLineProfile {
  return { name, seasonStats: { gamesPlayed: 10, goals: 10, assists: 10, points: 20 },
    overallRating: 70, performanceRating: null, ...extra };
}

test("projected fit: exact local mean + modest goal/assist complementarity, not observed chemistry", () => {
  const scorer = profile("SCORER", { seasonStats: { gamesPlayed: 10, goals: 20, assists: 0, points: 20 } });
  const passer = profile("PASSER", { seasonStats: { gamesPlayed: 10, goals: 0, assists: 20, points: 20 } });
  // Mean 70 + 10 * |1 - 0| * (10/15)^2 = 74.444... => 74.
  assert.deepEqual(getProjectedLineRating([scorer, passer]), { percentage: 74, grade: "B" });
  assert.deepEqual(getProjectedLineRating([scorer, { ...scorer, name: "OTHER SCORER" }]), { percentage: 70, grade: "B" });
  const scoreless = profile("NO POINTS", { seasonStats: { gamesPlayed: 10, goals: 0, assists: 0, points: 0 } });
  assert.deepEqual(getProjectedLineRating([scorer, scoreless]), { percentage: 70, grade: "B" }, "zero points do not invent a playmaker role");
  assert.deepEqual(getLineRating(evaluateChemistrySelection([], [scorer.name, passer.name]).stats), unrated);
  assert.deepEqual(getProjectedLineRating([profile("A"), profile("B"), profile("C")]), { percentage: 70, grade: "B" });
});

test("projected fit: 2/3/5 only; duplicate normalized names or aliases are rejected, not deduplicated", () => {
  for (let size = 0; size <= 7; size++) {
    const result = getProjectedLineRating(Array.from({ length: size }, (_, i) => profile(`PLAYER ${i}`)));
    assert.deepEqual(result, [2, 3, 5].includes(size) ? { percentage: 70, grade: "B" } : unrated);
  }
  for (const names of [["A", " a "], ["Mhut8", "MATT HUT"], ["A", "B", "a"], ["", "B"], ["  ", "B"]]) {
    assert.deepEqual(getProjectedLineRating(names.map(name => profile(name))), unrated);
  }
});

test("projected fit: every player must have valid season stats, even with supplied OVR or Lab score", () => {
  const valid = profile("A");
  for (const seasonStats of [null, undefined, { gamesPlayed: 0, goals: 0, assists: 0, points: 0 },
    { gamesPlayed: 10, goals: 10, assists: 10, points: 21 }]) {
    const bad = profile("B", { seasonStats, overallRating: 99, performanceRating: 90 } as Partial<ProjectedLineProfile>);
    assert.deepEqual(getProjectedLineRating([valid, bad]), unrated);
    assert.deepEqual(getProjectedLineRating([valid, profile("C"), bad]), unrated, "must not average the valid pair");
  }
  for (const field of ["gamesPlayed", "goals", "assists", "points"] as const) {
    for (const bad of [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, "10"]) {
      const invalid = profile("B", { seasonStats: { ...valid.seasonStats!, [field]: bad } } as Partial<ProjectedLineProfile>);
      assert.deepEqual(getProjectedLineRating([valid, invalid]), unrated, `${field}: ${bad}`);
    }
  }
  const unknown = buildLinePlayers([], [game({ skaters: ["UNKNOWN"] })], "current")[0];
  assert.equal(unknown.seasonStats, null);
  assert.deepEqual(getProjectedLineRating([valid, unknown]), unrated);
});

test("projected fit: OVR then local rating then validated offense; grades/optional defensive stats are not inputs", () => {
  const a = profile("A", { performanceRating: 99 });
  const b = profile("B", { performanceRating: 99 });
  assert.deepEqual(getProjectedLineRating([a, b]), { percentage: 70, grade: "B" }, "valid source OVR preferred");
  assert.deepEqual(getProjectedLineRating([{ ...a, overallRating: null }, { ...b, overallRating: 0 }]),
    { percentage: 99, grade: "A" });
  assert.deepEqual(getProjectedLineRating([profile("A", { overallRating: null, performanceRating: 0 }),
    profile("B", { overallRating: null, performanceRating: 0 })]), { percentage: 0, grade: "F" }, "local zero is real, not upstream sentinel");
  for (const bad of [null, undefined, -1, 101, NaN, Infinity, "A", "90"]) {
    const profiles = ["A", "B"].map(name => ({ ...profile(name), overallRating: bad, performanceRating: bad,
      grade: "A", blockedShots: 1000, winPct: 100, ppg: 1000, playstyle: "Elite Sniper" }));
    assert.deepEqual(getProjectedLineRating(profiles as ProjectedLineProfile[]), { percentage: 50, grade: "C" });
  }
  const offenseOnly = ["A", "B"].map(name => profile(name, { overallRating: null,
    seasonStats: { gamesPlayed: 10, goals: 20, assists: 20, points: 40 } }));
  // 100 * 4/(4+2) => raw 66.667; damped 50 + 16.667 * 10/15 => 61.
  assert.deepEqual(getProjectedLineRating(offenseOnly), { percentage: 61, grade: "C" });
});

test("projected fit: bounded, deterministic, order-independent and non-mutating", () => {
  for (let n = 0; n <= 100; n++) {
    const profiles = Array.from({ length: 5 }, (_, i) => profile(`P${i}`, {
      seasonStats: { gamesPlayed: n + 1, goals: i * n, assists: n, points: (i + 1) * n },
      overallRating: n, performanceRating: null,
    }));
    freeze(profiles);
    const before = JSON.stringify(profiles);
    const result = getProjectedLineRating(profiles);
    assert.ok(Number.isInteger(result.percentage) && result.percentage! >= 0 && result.percentage! <= 100);
    assert.deepEqual(getProjectedLineRating(profiles), result);
    assert.deepEqual(getProjectedLineRating([...profiles].reverse()), result);
    assert.equal(JSON.stringify(profiles), before);
  }
  const max = Number.MAX_SAFE_INTEGER;
  const extremes = [profile("A", { overallRating: 100, seasonStats: { gamesPlayed: max, goals: max, assists: 0, points: max } }),
    profile("B", { overallRating: 100, seasonStats: { gamesPlayed: max, goals: 0, assists: max, points: max } })];
  assert.deepEqual(getProjectedLineRating(extremes), { percentage: 100, grade: "A" });
});

test("dataset: actual current/archive core totals enable projections without shared full-trio history", () => {
  const data = parseNhl27Snapshot(fixture()).data;
  const games = buildChemistryDataset(data.matches, []).games;
  const players = buildLinePlayers(data.members, games, "current");
  assert.equal(players.length, 3);
  for (const player of players) {
    const source = data.members.find(m => normalizeChemistryName(m.username) === player.id)!;
    const { gamesPlayed, goals, assists, points } = source;
    assert.deepEqual(player.seasonStats, { gamesPlayed, goals, assists, points });
  }
  assert.deepEqual(getProjectedLineRating(players), { percentage: 74, grade: "B" });
  const shared = evaluateChemistrySelection(games, players.map(p => p.id)).stats;
  assert.equal(shared.games, 0, "actual fixture has no shared full trio");
  assert.deepEqual(getLineRating(shared), unrated);
  const archive = buildLinePlayers(FROZEN_CHELSTATS.members, [], "archive");
  assert.notEqual(getProjectedLineRating(archive.slice(0, 5)).percentage, null);
  const missingRatings = buildLinePlayers(FROZEN_CHELSTATS.members.map(m => ({ ...m, overallRating: 0 })), [], "archive");
  assert.ok(missingRatings.every(p => p.grade === null && p.performanceRating === null), "existing archive grade contract unchanged");
  assert.notEqual(getProjectedLineRating(missingRatings.slice(0, 5)).percentage, null, "valid archive offense can support line fit");
  for (const invalid of [{ gamesPlayed: 0 }, { goals: NaN }, { points: 999999 }]) {
    const p = buildLinePlayers([member(invalid)], [], "archive")[0];
    assert.equal(p.seasonStats, null);
    assert.deepEqual(getProjectedLineRating([players[0], { ...p, name: "INVALID" }]), unrated);
  }
  assert.match(PROJECTED_LINE_RATING_DESCRIPTION, /not Chelstats' score, observed chemistry or a win probability/);
  assert.match(PROJECTED_LINE_RATING_DESCRIPTION, /No shared games are required/);
  assert.match(PROJECTED_LINE_RATING_DESCRIPTION, /no subset averaging/);
});
