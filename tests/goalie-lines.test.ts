import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { ClubMatch, ClubMember, MatchPlayerStat } from "../src/lib/chelstats";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import {
  buildGoalieDataset, evaluateGoalieLine, GOALIE_METHOD_DESCRIPTION,
  type GoalieDataset, type GoalieGame, type GoalieLineEvaluation, type GoalieProfile,
} from "../src/lib/goalie-lines";
import { buildChemistryDataset, evaluateChemistrySelection, normalizeChemistryName } from "../src/lib/line-chemistry";
import { getLineRating } from "../src/lib/line-ratings";
import { parseNhl27Snapshot } from "../src/lib/nhl27-api";

const id = normalizeChemistryName;
const unrated = { percentage: null, grade: null };
function member(extra: Partial<ClubMember> = {}): ClubMember {
  return {
    username: "RYDER", position: "G", gamesPlayed: 0, goals: 0, assists: 0, points: 0, ppg: 0,
    plusMinus: 0, hits: 0, shots: 0, shotPct: 0, pim: 0, gwg: 0, winPct: 0, takeaways: 0,
    giveaways: 0, interceptions: 0, blockedShots: 0, faceoffPct: 0, passCompPct: 0,
    goalieGP: 10, goalieWins: 6, goalieRecord: "6-4-0", goalieSaves: 90, goalieShots: 100,
    savePct: 1, gaa: 1.7, shutouts: 2, shutoutPeriods: 6, overallRating: 97, playstyle: "",
    ...extra,
  };
}
function skater(name: string, extra: Partial<MatchPlayerStat> = {}): MatchPlayerStat {
  return {
    name, position: "C", goals: 0, assists: 0, hits: 0, shots: 0, plusMinus: 0, pim: 0,
    blockedShots: 0, takeaways: 0, giveaways: 0, powerPlayGoals: 0, shortHandedGoals: 0,
    gameWinningGoal: 0, saves: 0, shotsAgainst: 0, goalsAgainst: 0, savePct: 0,
    shutoutPeriods: 0, isGoalie: false, isOurPlayer: true, ...extra,
  };
}
function goalie(extra: Partial<MatchPlayerStat> = {}): MatchPlayerStat {
  return skater("RYDER", { position: "G", isGoalie: true, saves: 9, shotsAgainst: 10, goalsAgainst: 1, savePct: 0.2, ...extra });
}
function full(key = "one", extra: Partial<ClubMatch> = {}): ClubMatch {
  return {
    id: key, timestamp: 1, date: "September 1, 2026", opponent: "Visitors", homeAway: "home",
    scoreUs: 3, scoreThem: 1, matchType: "regular", shotsUs: 20, shotsThem: 10,
    toaUs: "1:00", toaThem: "1:00", passCompUs: 50, passCompThem: 50, result: "WIN",
    players: [skater("MATT"), skater("DYLAN"), goalie()], threeStars: null, ...extra,
  };
}
function fixture() {
  return parseNhl27Snapshot(JSON.parse(readFileSync(new URL("./fixtures/nhl27-public.json", import.meta.url), "utf8"))).data;
}
function close(actual: number | null, expected: number) {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-10, `${actual} != ${expected}`);
}
function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}
function evaluate(matches: ClubMatch[]): GoalieLineEvaluation {
  const result = evaluateGoalieLine(buildGoalieDataset([member()], matches), ["MATT", "DYLAN"], "RYDER");
  assert.ok(result);
  return result;
}

test("public contract and pure adapter: normalized profile, exact whole game, no input mutation", () => {
  const members = [member({ username: " rydayro " })], matches = [full()];
  const before = JSON.stringify({ members, matches });
  freeze(members); freeze(matches);
  const dataset: GoalieDataset = buildGoalieDataset(members, matches);
  const expected: GoalieProfile = {
    id: id("RYDER"), name: id("RYDER"), games: 10, wins: 6, savePct: 90,
    gaa: 1.7, shutouts: 2, saves: 90, shotsAgainst: 100,
  };
  const expectedGame: GoalieGame = {
    ...buildChemistryDataset(matches, []).games[0], goalieId: id("RYDER"),
    saves: 9, shotsAgainst: 10, goalieGoalsAgainst: 1,
  };
  assert.deepEqual(dataset, { players: [expected], games: [expectedGame] });
  freeze(dataset);
  const result: GoalieLineEvaluation | null = evaluateGoalieLine(dataset, [" mhut8 ", "u4 pablo"], "rydayro");
  assert.ok(result);
  assert.deepEqual(result.matchingGames, [expectedGame]);
  assert.deepEqual(result.stats, {
    games: 1, wins: 1, losses: 0, draws: 0, savePct: 90, goalsAgainstPerGame: 1,
    saves: 9, shotsAgainst: 10, winPct: 100,
  });
  assert.deepEqual(result.rating, getLineRating(evaluateChemistrySelection(dataset.games, ["MATT", "DYLAN"]).stats));
  assert.equal(JSON.stringify({ members, matches }), before);
  assert.deepEqual(JSON.parse(JSON.stringify(dataset)), dataset);
});

test("real current fixture: goalie-only member is selectable, but its forfeit is not a shared sample", () => {
  const data = fixture();
  freeze(data);
  const current = buildGoalieDataset(data.members, data.matches);
  assert.equal(current.players.length, 1);
  const keeper = current.players[0];
  assert.equal(keeper.id, id("RYDER"));
  assert.equal(data.members.find(m => id(m.username) === keeper.id)!.gamesPlayed, 0);
  assert.equal(keeper.games, 1);
  assert.equal(keeper.wins, 1);
  assert.equal(keeper.saves, 13);
  assert.equal(keeper.shotsAgainst, 14);
  close(keeper.savePct, 100 * 13 / 14);
  assert.equal(keeper.gaa, 1.02);
  assert.deepEqual(current.games, []);
  const result = evaluateGoalieLine(current, ["MATT", "DYLAN"], "RYDER")!;
  assert.deepEqual(result.rating, unrated);
  assert.equal(result.stats.games, 0);
});

test("current/archive isolation: never use bundled partial games, season totals or names as shared evidence", () => {
  const archive = buildGoalieDataset(FROZEN_CHELSTATS.members, FROZEN_CHELSTATS.matches);
  assert.equal(archive.players.length, 5);
  assert.deepEqual(archive.games, []);
  assert.equal(archive.players.find(p => p.id === id("RYDER"))!.games, 209);
  assert.equal(archive.players.find(p => p.id === id("RYDER"))!.gaa, 4.78);
  for (const name of ["MATT", "KADEN"]) {
    const profile = archive.players.find(p => p.id === id(name))!;
    assert.ok(profile.shotsAgainst! > profile.saves!);
    assert.equal(profile.gaa, null, "impossible archived zero GAA must not appear league-best");
  }
  assert.deepEqual(buildGoalieDataset([], []), { players: [], games: [] });
  const current = fixture();
  const fresh = buildGoalieDataset(current.members, []);
  assert.equal(fresh.players.length, 1);
  assert.equal(fresh.players[0].games, 1);
  assert.equal(evaluateGoalieLine(fresh, ["MATT", "DYLAN"], "COLIN"), null);
  assert.deepEqual(evaluateGoalieLine(archive, ["MATT", "DYLAN"], "RYDER")!.rating, unrated);
  const sparse = full("partial", { players: [skater("MATT"), skater("DYLAN")] });
  assert.deepEqual(buildGoalieDataset([member()], [sparse]).games, [], "season goalie GP cannot assign the match goalie");
});

test("profiles require goalie GP or a verified observed goalie, not member position, OVR or positive saves alone", () => {
  const ineligible = [member({ goalieGP: 0 }), member({ username: "NO GP", goalieGP: NaN }), member({ username: "BAD GP", goalieGP: -1 })];
  assert.deepEqual(buildGoalieDataset(ineligible, []).players, []);
  const observed = buildGoalieDataset(ineligible, [full()]);
  assert.deepEqual(observed.players, [{ id: id("RYDER"), name: id("RYDER"), games: 1,
    wins: null, savePct: null, gaa: null, shutouts: null, saves: null, shotsAgainst: null }]);
  const guest = full("guest", { players: [skater("MATT"), skater("DYLAN"), goalie({ name: "New Goalie" })] });
  const guests = buildGoalieDataset([], [guest, { ...guest, id: "guest-2" }]);
  assert.equal(guests.players[0].id, "NEW GOALIE");
  assert.equal(guests.players[0].games, 2);
  assert.equal(guests.players[0].saves, null);
  assert.equal(evaluateGoalieLine(guests, ["MATT", "DYLAN"], "new goalie")!.stats.saves, 18);
});

test("empty and partial selections, unsupported sizes, duplicate aliases and same-human roles are invalid", () => {
  const dataset = buildGoalieDataset([member()], [full()]);
  for (const selected of [[], ["MATT"], ["MATT", ""], ["MATT", "  "], ["MATT", "DYLAN", "", "ROB", "JIMMY"],
    ["MATT", "DYLAN", "ROB", "JIMMY"], ["MATT", "Mhut8"], ["MATT", "DYLAN", "mhut8"],
    ["MATT", "DYLAN", "RYDER"], ["MATT", "DYLAN", "ROB", "JIMMY", " rydayro "],
    ["MATT", "DYLAN", "ROB", "JIMMY", "COLIN", "KADEN"]]) {
    assert.equal(evaluateGoalieLine(dataset, selected, "RYDER"), null, JSON.stringify(selected));
  }
  assert.equal(evaluateGoalieLine(dataset, ["MATT", "DYLAN"], ""), null);
  assert.equal(evaluateGoalieLine(dataset, ["MATT", "DYLAN"], "unknown"), null);
  const noSample = evaluateGoalieLine(dataset, ["MATT", "Not observed"], "RYDER")!;
  assert.deepEqual(noSample.stats, { games: 0, wins: 0, losses: 0, draws: 0, savePct: null,
    goalsAgainstPerGame: null, saves: null, shotsAgainst: null, winPct: null });
  assert.deepEqual(noSample.matchingGames, []);
  assert.deepEqual(noSample.rating, unrated);
});

test("exact 2/3/5 distinct skaters AND selected goalie coappear; different games cannot complete a lineup", () => {
  const names = ["MATT", "DYLAN", "ROB", "JIMMY", "COLIN"];
  const matches = [
    full("pair"), full("trio", { players: [...names.slice(0, 3).map(n => skater(n)), goalie()] }),
    full("five", { players: [...names.map(n => skater(n)), goalie()] }),
    full("other-goalie", { players: [...names.map(n => skater(n)), goalie({ name: "KADEN" })] }),
    full("disjoint", { players: [skater("LOGAN"), skater("JIMMY"), goalie()] }),
  ];
  const dataset = buildGoalieDataset([member()], matches);
  for (const [size, expected] of [[2, 3], [3, 2], [5, 1]]) {
    const chosen = names.slice(0, size);
    const result = evaluateGoalieLine(dataset, chosen, "RYDER")!;
    assert.equal(result.stats.games, expected);
    assert.deepEqual(evaluateGoalieLine(dataset, [...chosen].reverse(), "JENE RENE TETREAU IV"), result);
  }
  assert.equal(evaluateGoalieLine(dataset, ["MATT", "LOGAN"], "RYDER")!.stats.games, 0);
  assert.equal(evaluateGoalieLine(dataset, names, "KADEN")!.stats.games, 1);
});

test("weighted save percentage uses totals; club outcomes and newest-first order delegate to shared chemistry", () => {
  const matches = [
    full("win", { timestamp: 10, result: "LOSS" }),
    full("loss", { timestamp: 30, scoreUs: 0, scoreThem: 5, result: "WIN",
      players: [skater("MATT"), skater("DYLAN"), goalie({ saves: 1, shotsAgainst: 2, goalsAgainst: 1 })] }),
    full("draw", { timestamp: 20, scoreUs: 1, scoreThem: 1, result: "WIN", matchType: "finals" }),
  ];
  const result = evaluate(matches);
  assert.deepEqual(result.matchingGames.map(g => g.id), ["loss", "draw", "win"]);
  assert.equal(result.stats.games, 3);
  assert.equal(result.stats.wins, 1);
  assert.equal(result.stats.losses, 1);
  assert.equal(result.stats.draws, 1);
  close(result.stats.winPct, 100 / 3);
  assert.equal(result.stats.saves, 19);
  assert.equal(result.stats.shotsAgainst, 22);
  close(result.stats.savePct, 100 * 19 / 22);
  assert.notEqual(result.stats.savePct, (90 + 50 + 90) / 3);
  assert.equal(result.stats.goalsAgainstPerGame, 1, "goalie GA is not club GA/GP (7/3) or source season GAA (1.7)");
  assert.deepEqual(result.rating, getLineRating(evaluateChemistrySelection(buildChemistryDataset(matches, []).games, ["MATT", "DYLAN"]).stats));
  assert.deepEqual(evaluate([...matches].reverse()), result);
});

test("shared rating is only club outcomes, not a fabricated save-stat or goalie influence adjustment", () => {
  const strong = evaluate([full()]);
  const different = full("one", { players: [skater("MATT"), skater("DYLAN"), goalie({ saves: 1, shotsAgainst: 2 })] });
  const weak = evaluate([different]);
  assert.notEqual(strong.stats.savePct, weak.stats.savePct);
  assert.deepEqual(strong.rating, weak.rating);
  const unknown = evaluate([full("one", { players: [skater("MATT"), skater("DYLAN"), goalie({ saves: NaN, shotsAgainst: NaN, goalsAgainst: NaN })] })]);
  assert.deepEqual(unknown.rating, strong.rating);
});

test("one verified OUR goalie only; opponents, unknown roles and skater/goalie alias overlap never qualify", () => {
  const base = [skater("MATT"), skater("DYLAN")];
  for (const invalid of [
    [...base], [...base, goalie({ isOurPlayer: false })], [...base, skater("RYDER", { saves: 9, shotsAgainst: 10 })],
    [...base, goalie(), goalie({ name: "COLIN" })], [...base, goalie({ name: "  " })],
    [...base, goalie(), skater("rydayro")], [...base, goalie({ name: "mhut8" })],
  ]) assert.deepEqual(buildGoalieDataset([], [full("bad", { players: invalid })]), { players: [], games: [] });
  const valid = buildGoalieDataset([], [full("ours", { players: [...base, goalie(), goalie({ name: "Enemy", isOurPlayer: false })] })]);
  assert.equal(valid.games[0].goalieId, id("RYDER"));
  for (const position of [" G ", "gk", "goalie", "goaltender", "goalkeeper"]) {
    assert.equal(buildGoalieDataset([], [full("position", { players: [...base, goalie({ position, isGoalie: false })] })]).games.length, 1);
  }
  assert.equal(buildGoalieDataset([], [full("flag", { players: [...base, goalie({ position: "SKTR" })] })]).games.length, 1);
  const repeated = buildGoalieDataset([], [full("aliases", { players: [...base, goalie(), goalie({ name: "rydayro" })] })]);
  assert.equal(repeated.games.length, 1);
  assert.equal(repeated.games[0].saves, 9, "one human's duplicated alias rows are never summed");
});

test("all chemistry exclusions apply: private/forfeit veto, invalid scores, impossible scoring and outcome conflicts", () => {
  for (const extra of [{ forfeit: true }, { result: "FORFEIT WIN" }, { id: "forfeit-one" }, { matchType: "private" as const }]) {
    assert.deepEqual(buildGoalieDataset([], [full("bad", extra)]).games, []);
  }
  for (const bad of [NaN, Infinity, -1, 1.5, null, undefined, "3"]) {
    for (const field of ["scoreUs", "scoreThem"] as const) {
      assert.deepEqual(buildGoalieDataset([], [full("bad", { [field]: bad } as Partial<ClubMatch>)]).games, []);
    }
  }
  const impossible = full("bad", { players: [skater("MATT", { goals: 4 }), skater("DYLAN"), goalie()] });
  assert.deepEqual(buildGoalieDataset([], [impossible]).games, []);
  for (const conflict of [full("one", { forfeit: true }), full("one", { matchType: "private" }), full("one", { scoreUs: 4 })]) {
    assert.deepEqual(buildGoalieDataset([], [full(), conflict]).games, []);
    assert.deepEqual(buildGoalieDataset([], [conflict, full()]).games, []);
  }
  assert.deepEqual(buildGoalieDataset([], [full("type", { matchType: "unknown" as ClubMatch["matchType"] })]).games, []);
});

test("duplicate records preserve the exact chemistry-selected full roster, never union skaters or borrow another goalie", () => {
  const smaller = full("duplicate");
  const larger = full("duplicate", { players: [skater("MATT"), skater("DYLAN"), skater("ROB"), goalie({ name: "COLIN", saves: 19, shotsAgainst: 20 })] });
  const dataset = buildGoalieDataset([member()], [smaller, larger]);
  assert.equal(dataset.games.length, 1);
  assert.equal(dataset.games[0].goalieId, id("COLIN"));
  assert.equal(dataset.games[0].saves, 19);
  assert.equal(evaluateGoalieLine(dataset, ["MATT", "DYLAN"], "RYDER")!.stats.games, 0);
  assert.deepEqual(buildGoalieDataset([member()], [larger, smaller, larger]), dataset);
  const missingGoalie = { ...larger, players: larger.players.filter(p => !p.isGoalie) };
  assert.deepEqual(buildGoalieDataset([], [smaller, missingGoalie]).games, [], "discarded smaller record cannot supply a goalie");
  const invalidGoalie = { ...larger, players: [...larger.players, goalie({ name: "JIMMY" })] };
  assert.deepEqual(buildGoalieDataset([], [smaller, invalidGoalie]).games, []);
  const disjoint = full("duplicate", { players: [skater("LOGAN"), skater("JIMMY"), goalie({ name: "KADEN" })] });
  const selected = buildChemistryDataset([smaller, disjoint], []).games[0];
  const matching = [smaller, disjoint].find(m => JSON.stringify(buildChemistryDataset([m], []).games[0]) === JSON.stringify(selected))!;
  const built = buildGoalieDataset([], [smaller, disjoint]);
  assert.equal(built.games[0].goalieId, id(matching.players.find(p => p.isGoalie)!.name));
  assert.equal(evaluateGoalieLine(built, ["MATT", "LOGAN"], built.games[0].goalieId)!.stats.games, 0);
  const betterMetadata = full("duplicate", { date: "", opponent: "", players: smaller.players });
  assert.equal(buildGoalieDataset([], [betterMetadata, disjoint]).games[0].goalieId, id("KADEN"));
});

test("indistinguishable selected records with conflicting goalie identities or roles are quarantined, not order-picked", () => {
  const original = full();
  for (const alternate of [
    full("one", { players: [skater("MATT"), skater("DYLAN"), goalie({ name: "COLIN" })] }),
    full("one", { players: [skater("MATT"), skater("DYLAN")] }),
    full("one", { players: [skater("MATT"), skater("DYLAN"), goalie(), goalie({ name: "COLIN" })] }),
  ]) {
    assert.deepEqual(buildGoalieDataset([], [original, alternate]).games, []);
    assert.deepEqual(buildGoalieDataset([], [alternate, original]).games, []);
  }
  const statsConflict = full("one", { players: [skater("MATT"), skater("DYLAN"), goalie({ saves: 19, shotsAgainst: 20 })] });
  const conflict = buildGoalieDataset([], [original, statsConflict]);
  assert.equal(conflict.games.length, 1);
  assert.equal(conflict.games[0].saves, null);
  assert.equal(conflict.games[0].shotsAgainst, null);
  assert.equal(conflict.games[0].goalieGoalsAgainst, 1);
  assert.deepEqual(buildGoalieDataset([], [statsConflict, original]), conflict);
  const badScoreRoster = full("one", { players: [skater("MATT", { goals: 99 }), skater("DYLAN"), goalie({ name: "COLIN" })] });
  assert.equal(buildGoalieDataset([], [original, badScoreRoster]).games[0].goalieId, id("RYDER"), "an invalid candidate is not the selected record");
});

test("invalid goalie count fields stay null; inconsistent saves/shots/GA relations are never repaired or zero-filled", () => {
  const invalid = [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, "9", false];
  for (const field of ["saves", "shotsAgainst", "goalsAgainst"] as const) {
    for (const bad of invalid) {
      const data = buildGoalieDataset([], [full("invalid", { players: [skater("MATT"), skater("DYLAN"), goalie({ [field]: bad } as Partial<MatchPlayerStat>)] })]);
      const game = data.games[0];
      assert.ok(game, "bad stats do not invalidate verified coappearance/outcome");
      assert.equal(game[field === "goalsAgainst" ? "goalieGoalsAgainst" : field], null, `${field}=${bad}`);
      const result = evaluateGoalieLine(data, ["MATT", "DYLAN"], "RYDER")!;
      assert.notEqual(result.rating.percentage, null);
      if (field !== "goalsAgainst") assert.equal(result.stats.savePct, null);
      else assert.equal(result.stats.goalsAgainstPerGame, null);
    }
  }
  for (const extra of [
    { saves: 11 }, { saves: 8 }, { goalsAgainst: 11 }, { goalsAgainst: 0 },
    { saves: 8, goalsAgainst: 2 }, // Internally consistent but goalie GA exceeds club GA.
  ]) {
    const result = evaluate([full("bad-relation", { players: [skater("MATT"), skater("DYLAN"), goalie(extra)] })]);
    assert.equal(result.stats.saves, null);
    assert.equal(result.stats.shotsAgainst, null);
    assert.equal(result.stats.savePct, null);
    assert.equal(result.stats.goalsAgainstPerGame, null);
    assert.equal(result.stats.games, 1);
  }
});

test("unknown aggregates are per-field and sample-complete; no subset sums or mean rates", () => {
  const missingSaves = full("missing", { players: [skater("MATT"), skater("DYLAN"), goalie({ saves: NaN })] });
  const result = evaluate([full(), missingSaves]);
  assert.equal(result.stats.games, 2);
  assert.equal(result.stats.saves, null);
  assert.equal(result.stats.shotsAgainst, 20);
  assert.equal(result.stats.savePct, null);
  assert.equal(result.stats.goalsAgainstPerGame, 1);
  const missingGA = full("missing", { players: [skater("MATT"), skater("DYLAN"), goalie({ goalsAgainst: NaN })] });
  const ga = evaluate([full(), missingGA]);
  assert.equal(ga.stats.saves, 18);
  assert.equal(ga.stats.shotsAgainst, 20);
  assert.equal(ga.stats.savePct, 90);
  assert.equal(ga.stats.goalsAgainstPerGame, null, "do not derive missing GA from club score or shots minus saves");
  const zero = evaluate([full("zero", { scoreUs: 0, scoreThem: 0, players: [skater("MATT"), skater("DYLAN"), goalie({ saves: 0, shotsAgainst: 0, goalsAgainst: 0 })] })]);
  assert.equal(zero.stats.saves, 0);
  assert.equal(zero.stats.shotsAgainst, 0);
  assert.equal(zero.stats.savePct, null);
  assert.equal(zero.stats.goalsAgainstPerGame, 0);
  assert.deepEqual(zero.rating, { percentage: 50, grade: "C" });
  assert.equal(zero.stats.draws, 1);
});

test("profile sanitization keeps valid source GAA, rejects impossible zero and malformed/contradictory season counts", () => {
  for (const field of ["goalieWins", "shutouts", "goalieSaves", "goalieShots", "gaa"] as const) {
    for (const bad of [-1, NaN, Infinity, null, undefined, "2"]) {
      const p = buildGoalieDataset([member({ [field]: bad } as Partial<ClubMember>)], []).players[0];
      const key = ({ goalieWins: "wins", shutouts: "shutouts", goalieSaves: "saves", goalieShots: "shotsAgainst", gaa: "gaa" } as const)[field];
      assert.equal(p[key], null, `${field}=${bad}`);
    }
  }
  const tooMany = buildGoalieDataset([member({ goalieWins: 11, shutouts: 11, goalieSaves: 101 })], []).players[0];
  assert.equal(tooMany.wins, null);
  assert.equal(tooMany.shutouts, null);
  assert.equal(tooMany.saves, null);
  assert.equal(tooMany.shotsAgainst, null);
  assert.equal(tooMany.savePct, null);
  assert.equal(tooMany.gaa, 1.7, "valid source GAA remains independent; no division by GP substitutes for ice time");
  assert.equal(buildGoalieDataset([member({ gaa: 0 })], []).players[0].gaa, null);
  const shutout = buildGoalieDataset([member({ gaa: 0, goalieSaves: 100 })], []).players[0];
  assert.equal(shutout.gaa, 0);
  assert.equal(shutout.savePct, 100);
  const noShots = buildGoalieDataset([member({ goalieSaves: 0, goalieShots: 0, gaa: 0 })], []).players[0];
  assert.equal(noShots.savePct, null);
  assert.equal(noShots.saves, 0);
  assert.equal(noShots.gaa, 0);
  const rounded = buildGoalieDataset([member({ goalieSaves: 13, goalieShots: 14, savePct: 92 })], []).players[0];
  close(rounded.savePct, 100 * 13 / 14);
});

test("duplicate members and game IDs never double-count; conflicting member totals do not borrow or order-pick", () => {
  const original = member(), alias = member({ username: "rydayro" });
  const once = buildGoalieDataset([original], [full()]);
  assert.deepEqual(buildGoalieDataset([alias, original], [full(), full()]), once);
  const changed = member({ username: "rydayro", goalieSaves: 91 });
  const conflict = buildGoalieDataset([original, changed], [full()]);
  assert.equal(conflict.players.length, 1);
  assert.equal(conflict.players[0].saves, null);
  assert.equal(conflict.players[0].games, 1, "only unambiguous observed GP remains when season records disagree");
  assert.deepEqual(buildGoalieDataset([changed, original], [full()]), conflict);
  const duplicateDataset = { ...once, games: [...once.games, ...once.games] };
  assert.deepEqual(evaluateGoalieLine(duplicateDataset, ["MATT", "DYLAN"], "RYDER"), evaluateGoalieLine(once, ["MATT", "DYLAN"], "RYDER"));
  const goalieConflict = { ...once, games: [...once.games, { ...once.games[0], goalieId: id("COLIN") }] };
  assert.equal(evaluateGoalieLine(goalieConflict, ["MATT", "DYLAN"], "RYDER")!.stats.games, 0);
  const scoreConflict = { ...once, games: [...once.games, { ...once.games[0], goalsFor: 7 }] };
  assert.equal(evaluateGoalieLine(scoreConflict, ["MATT", "DYLAN"], "RYDER")!.stats.games, 0);
  const local: GoalieDataset = { ...once, games: once.games.map(g => ({ ...g, source: "local", coverage: "partial-scoresheet" })) };
  assert.equal(evaluateGoalieLine(local, ["MATT", "DYLAN"], "RYDER")!.stats.games, 0);
});

test("manual dataset duplicates attach stats only from the canonical whole roster, never the last same-ID row", () => {
  const dataset = buildGoalieDataset([member()], [full()]);
  const smaller = dataset.games[0];
  const larger: GoalieGame = { ...smaller, skaters: [...smaller.skaters, id("ROB")], saves: 19, shotsAgainst: 20 };
  for (const games of [[larger, smaller], [smaller, larger]]) {
    const result = evaluateGoalieLine({ ...dataset, games }, ["MATT", "DYLAN"], "RYDER")!;
    assert.equal(result.stats.games, 1);
    assert.equal(result.stats.saves, 19);
    assert.equal(result.stats.shotsAgainst, 20);
    assert.equal(result.stats.savePct, 95);
    assert.deepEqual(result.matchingGames[0].skaters, [...larger.skaters].sort());
    const otherGoalie = games.map(game => game === larger ? { ...game, goalieId: id("COLIN") } : game);
    assert.equal(evaluateGoalieLine({ ...dataset, games: otherGoalie }, ["MATT", "DYLAN"], "RYDER")!.stats.games, 0,
      "filtering goalie must not revive a discarded smaller roster");
  }
});

test("method description explicitly discloses sample, source, rating, weighting and GAA limitations", () => {
  for (const term of ["selected-season", "full", "partial archive", "forfeit", "distinct", "same selected whole record", "getLineRating", "goalie influence", "projection", "total saves", "unknown", "ice time", "not gaa"]) {
    assert.ok(GOALIE_METHOD_DESCRIPTION.toLowerCase().includes(term.toLowerCase()), term);
  }
  const source = readFileSync(new URL("../src/lib/goalie-lines.ts", import.meta.url), "utf8");
  assert.ok(source.includes("buildChemistryDataset(matches, [])"));
  assert.ok(!source.includes("chelstats-frozen"));
  assert.ok(!source.includes("season-award-games"));
  assert.ok(!source.includes("getProjectedLineRating"));
});
