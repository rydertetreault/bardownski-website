import assert from "node:assert/strict";
import { test } from "node:test";
import archive from "../src/lib/season-award-games.json";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import {
  buildChemistryDataset, buildChemistryGames, evaluateChemistrySelection,
  getAvailableSkaters, normalizeChemistryName, recommendChemistryLines,
  type ChemistryGame, type ChemistryLocalGame, type ChemistryMatchInput,
  type ChemistrySize, type ChemistrySort,
} from "../src/lib/line-chemistry";

function full(id: string, names: string[] = ["MATT", "DYLAN"], extra: Partial<ChemistryMatchInput> = {}): ChemistryMatchInput {
  return {
    id, timestamp: 10, date: "July 1, 2026", opponent: "Visitors", scoreUs: 3, scoreThem: 1,
    players: names.map(name => ({ name, position: "skater", isGoalie: false, isOurPlayer: true, goals: 0 })),
    ...extra,
  };
}
function local(id: string, names = ["MATT", "DYLAN"], extra: Partial<ChemistryLocalGame> = {}): ChemistryLocalGame {
  return { ...full(id, []), players: names.map(name => ({ name, goals: 0, assists: 0 })), ...extra };
}
function game(id: string, skaters: string[], goalsFor = 3, goalsAgainst = 1, timestamp = 10): ChemistryGame {
  return { id, date: "saved", timestamp, opponent: "Visitors", skaters, goalsFor, goalsAgainst };
}
const close = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-10, `${actual} != ${expected}`);
};

// This test also protects the actual frozen source from accidental rewriting.
test("local archive: 75 IDs, three inconsistent scores quarantined, sparse coverage stays sparse", () => {
  const before = JSON.stringify([archive, FROZEN_CHELSTATS]);
  const dataset = buildChemistryDataset([]);
  assert.equal(dataset.total, 75);
  assert.equal(dataset.excluded, 3);
  assert.equal(dataset.games.length, 72);
  for (const id of ["18580865000310", "19656748570100", "20432177240315"]) {
    assert.ok(!dataset.games.some(g => g.id === id));
    const source = archive.find(g => g.id === id)!;
    assert.ok(source.players.reduce((sum, p) => sum + p.goals, 0) > source.scoreUs);
  }
  assert.ok(dataset.games.every(g => g.source === "local" && g.coverage === "partial-scoresheet"));
  assert.equal(Math.max(...dataset.games.map(g => g.skaters.length)), 4);
  assert.deepEqual(recommendChemistryLines(dataset.games, 5, { minGames: 1 }), []);
  const available = getAvailableSkaters(dataset.games);
  assert.ok(!available.includes(normalizeChemistryName("ROB")));
  assert.ok(!available.includes(normalizeChemistryName("COLIN")));
  for (const g of dataset.games) {
    const saved = archive.find(a => a.id === g.id)!;
    assert.equal(g.goalsFor, saved.scoreUs);
    assert.equal(g.goalsAgainst, saved.scoreThem);
  }
  assert.deepEqual(buildChemistryGames([], []), []);
  assert.deepEqual(buildChemistryGames([], [...archive].reverse()), dataset.games);
  assert.deepEqual(JSON.parse(JSON.stringify(dataset)), dataset);
  assert.equal(JSON.stringify([archive, FROZEN_CHELSTATS]), before);
});

test("canonical names unify real names, gamertags, display names, whitespace and case", () => {
  for (const [tag, real, display] of [
    ["Mhut8", "MATT", "MATT HUT"], ["u4 Pablo", "DYLAN", "XAVIER LAFLAMME"],
    ["Rydayro", "RYDER", "JENE RENE TETREAU IV"], ["S1obbyRobby", "ROB", "SLOBBY ROBBY"],
    ["oP wet", "COLIN", "WOLFGANG MOZART"], ["u4 Hood", "KADEN", "GOTTA BE"],
    ["Julio 3026", "JIMMY", "JIMMY LEMONS"], ["oP Ding1633", "LOGAN", "TOP G"],
  ]) {
    for (const name of [tag, tag.toUpperCase(), tag.toLowerCase(), real.toLowerCase(), display]) {
      assert.equal(normalizeChemistryName(`  ${name} `), display);
    }
  }
  assert.equal(normalizeChemistryName(" newcomer "), "NEWCOMER");
  assert.equal(normalizeChemistryName("   "), "");
  const built = buildChemistryGames([full("a", ["MATT", "mhut8", " Matt Hut ", "DYLAN", ""])], []);
  assert.deepEqual(built[0].skaters, ["MATT HUT", "XAVIER LAFLAMME"]);
});

test("full rosters exclude opponents and goalies; local sheets never infer a goalie by identity", () => {
  const players = full("a").players!;
  const built = buildChemistryGames([full("a", [], { players: [
    ...players,
    { name: "Enemy", isGoalie: false, isOurPlayer: false, position: "C", goals: 999 },
    { name: "Goalie", isGoalie: true, isOurPlayer: true, position: "skater", goals: 999 },
    { name: "Position goalie", isGoalie: false, isOurPlayer: true, position: " G ", goals: 999 },
  ] })], [local("b", ["RYDER", "MATT"])]);
  assert.deepEqual(built.find(g => g.id === "a")!.skaters, ["MATT HUT", "XAVIER LAFLAMME"]);
  assert.ok(built.find(g => g.id === "b")!.skaters.includes(normalizeChemistryName("RYDER")));
  assert.deepEqual(buildChemistryGames([], [local("a", [], { players: [
    { name: "Enemy", isOurPlayer: false, goals: 100 },
    { name: "Goalie", position: "goaltender", goals: 100 }, { name: "MATT", goals: 1 },
  ] })])[0].skaters, ["MATT HUT"]);
});

test("invalid scores, private matches and all forfeit markers are excluded", () => {
  const invalid = [null, undefined, NaN, Infinity, -Infinity, -1];
  for (const score of invalid) {
    for (const field of ["scoreUs", "scoreThem"] as const) {
      assert.deepEqual(buildChemistryGames([full("a", undefined, { [field]: score })], []), []);
      assert.deepEqual(buildChemistryGames([], [local("a", undefined, { [field]: score })]), []);
    }
  }
  for (const extra of [{ forfeit: true }, { result: "forfeit" }, { matchType: "private" }, { id: "forfeit-1" }]) {
    const record = full("a", undefined, extra);
    assert.deepEqual(buildChemistryGames([record], [local(record.id)]), []);
    assert.deepEqual(buildChemistryGames([full(record.id)], [local(record.id, undefined, extra)]), []);
  }
  assert.deepEqual(buildChemistryGames([full(" "), full("bad-time", undefined, { timestamp: NaN })], []), []);
  assert.equal(buildChemistryGames([full("zero", undefined, { scoreUs: 0, scoreThem: 0, timestamp: 0 })], []).length, 1);
});

test("score consistency uses only our skaters, does not correct scores, deduplicates aliases", () => {
  const bad = full("bad", [], { scoreUs: 1, players: [
    { name: "MATT", goals: 2, position: "C", isOurPlayer: true, isGoalie: false },
  ] });
  assert.deepEqual(buildChemistryDataset([bad], []), { games: [], total: 1, excluded: 1 });
  assert.equal(bad.scoreUs, 1);
  const duplicate = full("ok", [], { scoreUs: 2, players: [
    { name: "MATT", goals: 2, position: "C", isOurPlayer: true, isGoalie: false },
    { name: "mhut8", goals: 2, position: "C", isOurPlayer: true, isGoalie: false },
  ] });
  assert.equal(buildChemistryGames([duplicate], []).length, 1);
  // A valid independent record can replace an inconsistent duplicate; never mix fields.
  const fallback = buildChemistryDataset([bad], [local("bad", ["KADEN", "LOGAN"], { scoreUs: 4 })]);
  assert.equal(fallback.excluded, 0);
  assert.equal(fallback.games[0].source, "local");
  assert.equal(fallback.games[0].goalsFor, 4);
  assert.deepEqual(fallback.games[0].skaters, ["GOTTA BE", "TOP G"]);
});

test("dedup prefers valid full records then completeness, with stable whole-record ties", () => {
  const records = [full("same", ["A"], { scoreUs: 4 }), full("same", ["B", "C"], { scoreUs: 4 }),
    full("same", ["D", "E"], { scoreUs: 4 }), full("same", ["X", "Y", "Z"], { scoreUs: null })];
  const locals = [local("same", ["A", "B", "C", "D"]), local("only", ["A", "B"])];
  const before = JSON.stringify([records, locals]);
  const expected = buildChemistryGames(records, locals);
  assert.deepEqual(buildChemistryGames([...records].reverse(), [...locals].reverse()), expected);
  assert.deepEqual(buildChemistryGames([...records, ...records], [...locals, ...locals]), expected);
  const winner = expected.find(g => g.id === "same")!;
  assert.equal(winner.source, "full");
  assert.equal(winner.skaters.length, 2);
  assert.equal(winner.goalsFor, 4);
  assert.deepEqual(winner.skaters, ["B", "C"]);
  assert.equal(evaluateChemistrySelection(expected, ["A", "C"]).stats.games, 0);
  assert.equal(JSON.stringify([records, locals]), before);
  const missing = buildChemistryGames([full("missing", [], { players: null })], []);
  assert.deepEqual(missing[0].skaters, []);
});

test("selection computes W/L/draw and team score rates, sanitizes aliases, counts each game once", () => {
  const games = [game("w", ["MATT", "DYLAN", "KADEN"], 5, 1, 3),
    game("l", ["MATT", "DYLAN"], 1, 4, 2), game("d", ["MATT", "DYLAN"], 2, 2, 1),
    game("other", ["MATT", "LOGAN"], 99, 0)];
  const result = evaluateChemistrySelection([...games, games[0]], [" mhut8 ", "MATT", "u4 Pablo", ""]);
  assert.deepEqual(result.players, ["MATT HUT", "XAVIER LAFLAMME"]);
  assert.deepEqual(result.matchingGames.map(g => g.id), ["w", "l", "d"]);
  assert.deepEqual([result.stats.games, result.stats.wins, result.stats.losses, result.stats.draws,
    result.stats.goalsFor, result.stats.goalsAgainst], [3, 1, 1, 1, 8, 7]);
  close(result.stats.winPct, 100 / 3);
  close(result.stats.gfPerGame, 8 / 3);
  close(result.stats.gaPerGame, 7 / 3);
  close(result.stats.gdPerGame, 1 / 3);
  close(result.stats.wilsonLowerBound, 0.061490315276160515);
  assert.equal(evaluateChemistrySelection(games, ["MATT", "DYLAN", "KADEN"]).stats.games, 1);
});

test("empty, unknown and unsupported selections have null rates; real draws and losses have zero win rate", () => {
  const games = [game("a", ["A", "B"], 0, 0)];
  for (const selected of [[], ["A"], ["A", "A"], ["A", "unknown"], ["A", "B", "C", "D"]]) {
    const result = evaluateChemistrySelection(games, selected);
    assert.deepEqual(result.stats, { games: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0,
      winPct: null, gfPerGame: null, gaPerGame: null, gdPerGame: null, wilsonLowerBound: null });
    assert.deepEqual(result.matchingGames, []);
  }
  const draw = evaluateChemistrySelection(games, ["A", "B"]).stats;
  assert.equal(draw.draws, 1);
  assert.equal(draw.winPct, 0);
  assert.equal(draw.gfPerGame, 0);
  close(draw.wilsonLowerBound, 0);
  const loss = evaluateChemistrySelection([game("l", ["A", "B"], 0, 1)], ["A", "B"]).stats;
  assert.equal(loss.losses, 1);
  close(loss.wilsonLowerBound, 0);
});

test("recommendations enumerate exactly 2/3/5, enforce thresholds and restrict available pool", () => {
  const games = Array.from({ length: 3 }, (_, i) => game(String(i), ["A", "B", "C", "D", "E"]));
  for (const [size, count] of [[2, 10], [3, 10], [5, 1]] as const) {
    const lines = recommendChemistryLines(games, size);
    assert.equal(lines.length, count);
    assert.ok(lines.every(line => line.players.length === size && line.stats.games === 3));
  }
  assert.deepEqual(recommendChemistryLines(games, 4 as ChemistrySize), []);
  assert.deepEqual(recommendChemistryLines(games.slice(1), 2), []);
  assert.deepEqual(recommendChemistryLines(games, 2, { minGames: 3.1 }), []);
  assert.equal(recommendChemistryLines(games, 2, { minGames: NaN }).length, 10);
  assert.equal(recommendChemistryLines(games.slice(1), 2, { minGames: 2 }).length, 10);
  assert.deepEqual(recommendChemistryLines(games, 2, { availablePlayers: [] }), []);
  assert.deepEqual(recommendChemistryLines(games, 3, { availablePlayers: ["A", "B", "Unknown"] }), []);
  assert.deepEqual(recommendChemistryLines(games, 2, { availablePlayers: [" b ", "A", "a", "Unknown"] })
    .map(line => line.players), [["A", "B"]]);
  assert.deepEqual(recommendChemistryLines([game("a", ["A", "B"]), game("b", ["C", "D"])], 3, { minGames: 0 }), []);
  assert.deepEqual(recommendChemistryLines([], 2, { minGames: 0 }), []);
});

test("all ranking modes and sample/lexical ties are deterministic", () => {
  const games = [game("a", ["A", "B"], 1, 0),
    ...Array.from({ length: 10 }, (_, i) => game(`c${i}`, ["C", "D"], i < 8 ? 2 : 0, 1)),
    game("e", ["E", "F"], 10, 20), game("g", ["G", "H"], 5, 0)];
  for (const [sort, expected] of [["reliable", ["C", "D"]], ["win-rate", ["A", "B"]],
    ["goal-difference", ["G", "H"]], ["attack", ["E", "F"]]] as const) {
    const ranked = recommendChemistryLines(games, 2, { minGames: 1, sort });
    assert.deepEqual(ranked[0].players, expected);
    assert.deepEqual(recommendChemistryLines([...games].reverse(), 2, { minGames: 1, sort }), ranked);
  }
  const tied = [game("a", ["A", "B"]), game("b", ["C", "D"]), game("c", ["C", "D"])];
  for (const sort of ["win-rate", "goal-difference", "attack"] as ChemistrySort[]) {
    assert.deepEqual(recommendChemistryLines(tied, 2, { minGames: 1, sort })[0].players, ["C", "D"]);
  }
  for (const sort of ["reliable", "win-rate", "goal-difference", "attack"] as ChemistrySort[]) {
    assert.deepEqual(recommendChemistryLines(tied.slice(0, 2).reverse(), 2, { minGames: 1, sort })[0].players, ["A", "B"]);
  }
});


test("contradictory same-authority scores are quarantined, not chosen lexically", () => {
  const conflicts = [full("conflict", undefined, {scoreUs:3,scoreThem:1}), full("conflict", undefined, {scoreUs:1,scoreThem:3})];
  for (const records of [conflicts, [...conflicts].reverse()]) {
    const result = buildChemistryDataset(records, [local("conflict")]);
    assert.deepEqual(result, {games:[],total:1,excluded:1});
  }
  // A richer authoritative source can still override a different local score.
  const result = buildChemistryDataset([full("valid")], [local("valid", undefined, {scoreUs:1,scoreThem:3})]);
  assert.equal(result.games[0].goalsFor,3);
  assert.equal(result.games[0].source,"full");
});
