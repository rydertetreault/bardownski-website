import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { evaluateBuilderLine, recommendBuilderLines } from "../src/components/lines/line-builder";
import type { LinePlayer } from "../src/components/lines/line-datasets";
import type { ChemistryGame } from "../src/lib/line-chemistry";

const players: LinePlayer[] = ["ONE", "TWO", "THREE", "FOUR", "FIVE"].map((id, i) => ({
  id, name: id, position: "SKTR", overallRating: 80 + i, grade: "B", gradeSource: "overall-rating",
  performanceRating: null, seasonStats: { gamesPlayed: 10, goals: 10 + i, assists: 10 - i, points: 20 },
}));
const game: ChemistryGame = {
  id: "one-game", date: "2026-09-13", timestamp: 1, opponent: "Visitors",
  goalsFor: 3, goalsAgainst: 1, skaters: ["ONE", "TWO", "THREE"],
};

test("complete new line gets labeled fit without invented history; shared outcomes take precedence", () => {
  const fit = evaluateBuilderLine([], ["ONE", "TWO", "THREE"], players);
  assert.equal(fit.ratingSource, "projected");
  assert.ok(fit.rating.percentage !== null);
  assert.equal(fit.stats.games, 0);
  assert.equal(fit.stats.winPct, null);
  assert.deepEqual(fit.matchingGames, []);
  const observed = evaluateBuilderLine([game], ["ONE", "TWO", "THREE"], players);
  assert.equal(observed.ratingSource, "shared");
  assert.equal(observed.rating.percentage, 56);
  assert.equal(observed.stats.games, 1);
  assert.deepEqual(observed.rating, evaluateBuilderLine([game], ["THREE", "ONE", "TWO"], players).rating);
});

test("partial, duplicate, unknown and invalid-profile selections cannot get a projected line score", () => {
  for (const ids of [[], ["ONE"], ["ONE", "ONE"], ["ONE", "TWO", "THREE", "FOUR"], ["ONE", "UNKNOWN"]]) {
    assert.equal(evaluateBuilderLine([], ids, players).rating.percentage, null);
  }
  const noStats = players.map(player => player.id === "TWO" ? { ...player, seasonStats: null } : player);
  assert.equal(evaluateBuilderLine([], ["ONE", "TWO"], noStats).ratingSource, null);
  // Valid shared games don't require an individual season profile to exist.
  assert.equal(evaluateBuilderLine([game], ["ONE", "TWO"], noStats).ratingSource, "shared");
});

test("recommendations include new fits only for Any; shared minima remain actual games", () => {
  const opts = { available: players.map(player => player.id), minGames: 0, sort: "chemistry" as const };
  assert.equal(recommendBuilderLines([], players, 2, opts).length, 10);
  assert.equal(recommendBuilderLines([], players, 3, opts).length, 10);
  assert.equal(recommendBuilderLines([], players, 5, opts).length, 1);
  assert.deepEqual(recommendBuilderLines([], players, 3, { ...opts, available: [] }), []);
  assert.deepEqual(recommendBuilderLines([], players, 3, { ...opts, available: ["ONE", "TWO"] }), []);
  assert.deepEqual(recommendBuilderLines([], players, 3, { ...opts, minGames: 1 }), []);
  const shared = recommendBuilderLines([game], players, 3, { ...opts, minGames: 1 });
  assert.equal(shared.length, 1);
  assert.equal(shared[0].ratingSource, "shared");
  assert.equal(shared[0].stats.games, 1);
  assert.deepEqual(recommendBuilderLines([game], players, 3, { ...opts, minGames: 3 }), []);
});

test("sorting remains deterministic and observed stats modes do not invent projected outcomes", () => {
  const before = JSON.stringify({ players, game });
  for (const sort of ["chemistry", "reliable", "win-rate", "goal-difference", "attack"] as const) {
    const opts = { available: players.map(player => player.id), minGames: 0, sort };
    const lines = recommendBuilderLines([game], players, 3, opts);
    assert.deepEqual(lines, recommendBuilderLines([game], [...players].reverse(), 3, opts));
    if (sort !== "chemistry") assert.equal(lines[0].ratingSource, "shared");
    assert.ok(lines.filter(line => line.ratingSource === "projected").every(line => line.stats.games === 0 && line.stats.winPct === null));
  }
  assert.equal(JSON.stringify({ players, game }), before);
});

test("public Lab is image-led, builder-first and free of feed diagnostics/native selects", () => {
  const page = readFileSync("src/app/lab/page.tsx", "utf8");
  assert.match(page, /<LabTools current=\{currentLines\}/);
  assert.match(page, /initialTool=\{tool === "comparison" \? "comparison" : "lines"\}/);
  assert.match(page, /<Image src="\/images\/homepage\/bench-wide\.webp"/);
  assert.match(page, /fill priority sizes="100vw"/);
  assert.doesNotMatch(page, /TrackingNotice|Feed checked|Last stored sync|freshness|player-lab-context/);
  for (const path of ["src/components/lines/LinePlanner.tsx", "src/components/lines/LineSeasonSelector.tsx", "src/app/lab/components/HeadToHeadCard.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /<select\b|<option\b|Feed checked|stored sync|tracking is connected/);
  }
  const planner = readFileSync("src/components/lines/LinePlanner.tsx", "utf8");
  assert.match(planner, /PROJECTED FIT/);
  assert.match(planner, /gradeSource === "lab-performance"/);
  assert.match(planner, /draft\.datasetId !== dataset\.id \|\| draft\.season !== season/);
});
