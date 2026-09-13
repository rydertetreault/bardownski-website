import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { evaluateGoaliePair, evaluateGoalieLine, type GoalieDataset, type GoalieGame, type GoalieProfile } from "../src/lib/goalie-lines";
import { evaluateChemistrySelection, evaluateSkaterAppearances, normalizeChemistryName } from "../src/lib/line-chemistry";

const id = normalizeChemistryName;
const keeper: GoalieProfile = { id: id("RYDER"), name: id("RYDER"), games: 10, wins: 5, savePct: 80, gaa: 2, shutouts: 0, saves: 80, shotsAgainst: 100 };
function game(key: string, skaters: string[], wins = true, saves = 9, shots = 10): GoalieGame {
  return { id: key, date: "2026-09-01", timestamp: Number(key) || 1, opponent: "Visitors", goalsFor: wins ? 5 : 1, goalsAgainst: wins ? 1 : 5,
    skaters: skaters.map(id), goalieId: keeper.id, saves, shotsAgainst: shots, goalieGoalsAgainst: shots - saves, source: "full", coverage: "recorded-roster" };
}
const dataset: GoalieDataset = { players: [keeper], games: [
  game("1", ["MATT"], true), game("2", ["MATT"], true), game("3", ["MATT"], true),
  game("4", ["JIMMY"], false, 5, 10), game("5", ["JIMMY"], false, 5, 10), game("6", ["JIMMY"], false, 5, 10),
] };

test("one goalie has different compatibility with Matt vs Jimmy based on each pair's games", () => {
  const matt = evaluateGoaliePair(dataset, "MATT", "RYDER")!;
  const jimmy = evaluateGoaliePair(dataset, "JIMMY", "RYDER")!;
  assert.equal(matt.skaterId, id("MATT"));
  assert.equal(matt.stats.games, 3);
  assert.equal(jimmy.stats.games, 3);
  assert.equal(matt.rating.percentage, 66);
  assert.equal(jimmy.rating.percentage, 34);
  assert.ok(matt.rating.percentage! > jimmy.rating.percentage!);
  assert.equal(matt.stats.savePct, 90);
  assert.equal(jimmy.stats.savePct, 50);
  // This is NOT the whole line's (nonexistent) shared sample.
  assert.equal(evaluateGoalieLine(dataset, ["MATT", "JIMMY", "DYLAN"], "RYDER")!.stats.games, 0);
});

test("single-skater adapter does not weaken full-line contracts", () => {
  assert.equal(evaluateChemistrySelection(dataset.games, ["MATT"]).stats.games, 0);
  assert.equal(evaluateGoalieLine(dataset, ["MATT"], "RYDER"), null);
  assert.equal(evaluateSkaterAppearances(dataset.games, "MATT").stats.games, 3);
  assert.equal(evaluateSkaterAppearances(dataset.games, "").stats.games, 0);
  assert.equal(evaluateGoaliePair(dataset, "RYDER", "RYDER"), null);
  assert.equal(evaluateGoaliePair(dataset, "", "RYDER"), null);
  assert.equal(evaluateGoaliePair(dataset, "MATT", "unknown goalie"), null);
  const unseen = evaluateGoaliePair(dataset, "DYLAN", "RYDER")!;
  assert.equal(unseen.stats.games, 0);
  assert.deepEqual(unseen.rating, { percentage: null, grade: null });
  assert.equal(unseen.stats.savePct, null);
});

test("pair naming, weighted rates, goalie filtering and season isolation remain exact", () => {
  const games = [game("1", ["MATT", "JIMMY"], true, 9, 10), game("2", ["MATT"], true, 19, 20),
    { ...game("3", ["MATT"], false), goalieId: id("COLIN") }];
  const current = { ...dataset, games };
  const matt = evaluateGoaliePair(current, " mhut8 ", "rydayro")!;
  assert.equal(matt.stats.games, 2);
  assert.equal(matt.stats.savePct, 100 * 28 / 30);
  assert.equal(matt.stats.goalsAgainstPerGame, 1);
  const jimmy = evaluateGoaliePair(current, "Julio 3026", "Rydayro")!;
  assert.equal(jimmy.stats.games, 1);
  assert.equal(evaluateGoaliePair({ ...dataset, games: [] }, "MATT", "RYDER")!.rating.percentage, null);
  assert.equal(evaluateGoaliePair({ players: [], games }, "MATT", "RYDER"), null);
});

test("pair samples may overlap but cannot borrow disjoint/contradictory goalie records", () => {
  const same = game("1", ["MATT", "JIMMY"]);
  const overlapping = { ...dataset, games: [same, { ...same }] };
  assert.equal(evaluateGoaliePair(overlapping, "MATT", "RYDER")!.stats.games, 1);
  assert.equal(evaluateGoaliePair(overlapping, "JIMMY", "RYDER")!.stats.games, 1);
  const conflicting = { ...dataset, games: [same, { ...same, goalsFor: 0 }] };
  assert.equal(evaluateGoaliePair(conflicting, "MATT", "RYDER")!.stats.games, 0);
  const discarded = { ...dataset, games: [same, { ...same, skaters: [id("MATT")], goalieId: id("COLIN") }] };
  assert.equal(evaluateGoaliePair(discarded, "MATT", "RYDER")!.stats.games, 1);
  assert.equal(evaluateGoaliePair({ ...discarded, games: [...discarded.games].reverse() }, "MATT", "RYDER")!.stats.games, 1);
  const missing = { ...dataset, games: [{ ...same, saves: null }] };
  assert.equal(evaluateGoaliePair(missing, "MATT", "RYDER")!.stats.savePct, null);
  assert.equal(evaluateGoaliePair(missing, "MATT", "RYDER")!.stats.goalsAgainstPerGame, 1);
});

test("pair evaluation doesn't depend on season OVR or goalie totals and never mutates", () => {
  const before = JSON.stringify(dataset);
  const changed = { ...dataset, players: [{ ...keeper, savePct: 1, wins: 0, gaa: 30 }] };
  assert.deepEqual(evaluateGoaliePair(changed, "MATT", "RYDER")!.rating, evaluateGoaliePair(dataset, "MATT", "RYDER")!.rating);
  assert.equal(JSON.stringify(dataset), before);
});

test("pair compatibility is surfaced in the builder before overall goalie totals", () => {
  const planner = readFileSync("src/components/lines/LinePlanner.tsx", "utf8");
  assert.match(planner, /<GoalieCompatibility compact/);
  assert.ok(planner.indexOf("<GoalieCompatibility") < planner.indexOf("<LineIdeas"));
  assert.ok(planner.indexOf("<GoalieCompatibility") < planner.indexOf("<GoalieImpact"));
});


test("goalie compatibility defaults to Your line and retains the full-roster option", () => {
  const component = readFileSync("src/components/lines/GoalieCompatibility.tsx", "utf8");
  assert.match(component, /scope: "line"/);
  assert.match(component, /updateView\(\{ scope: "all" \}\)/);
  assert.match(component, /scope === "all" \|\| inLine\.has\(player\.id\)/);
});
