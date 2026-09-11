import assert from "node:assert/strict";
import { calculateSeasonAwards, calculateRecapHighlights, RECAP_HONORS, SEASON_AWARDS } from "../src/lib/season-awards";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";

const byId = Object.fromEntries(SEASON_AWARDS.map(a => [a.id, a]));
assert.deepEqual(byId.mvp.winners, ["XAVIER LAFLAMME"]);
assert.equal(byId.mvp.result, "2075.54 performance score");
assert.deepEqual(byId.defense.winners, ["GOTTA BE"]);
assert.deepEqual(byId.goalie.winners, ["JENE RENE TETREAU IV"]);
assert.equal(byId.points.result, "1,410 points");
assert.equal(byId.goals.result, "920 goals");
assert.equal(byId.assists.result, "490 assists");
assert.equal(byId.hits.result, "2,189 hits");
assert.equal(byId.blocks.result, "152 blocked shots");
assert.equal(byId.clutch.result, "43 game-winning goals");
assert.ok(calculateSeasonAwards([]).every(a => a.winners.length === 0));
const player = FROZEN_CHELSTATS.members[0];
const tied = calculateSeasonAwards([player, { ...player, username: "tie-player" }]);
assert.equal(tied.find(a => a.id === "points")!.winners.length, 2);
assert.equal(tied[0].winners.length, 2);
const shortSeason = calculateSeasonAwards([{...player, gamesPlayed: 4}]);
assert.equal(shortSeason[0].winners.length, 0);
assert.equal(shortSeason.find(a=>a.id==='points')!.winners.length, 1);
assert.equal(calculateSeasonAwards([{...player, position:'SKTR'}]).find(a=>a.id==='defense')!.winners.length,0);
console.log("Season awards: frozen winners, totals, ties, empty data, eligibility passed.");

assert.deepEqual(RECAP_HONORS.map(a => a.id), ["defense", "goalie", "individual-performance", "breakout"]);
assert.deepEqual(RECAP_HONORS[0].winners, byId.defense.winners);
assert.deepEqual(RECAP_HONORS[1].winners, byId.goalie.winners);
assert.deepEqual(RECAP_HONORS[2].winners, ["XAVIER LAFLAMME"]);
assert.deepEqual(RECAP_HONORS[3].winners, ["GOTTA BE"]);
assert.match(RECAP_HONORS[2].result, /20 goals · 0 assists/);
assert.equal(RECAP_HONORS[3].selection, "editorial");
assert.match(RECAP_HONORS[3].description!, /25.1% to 35%/);
const breakout = FROZEN_CHELSTATS.members.find(p => p.username === "u4 Hood")!;
assert.equal(RECAP_HONORS[3].result, `${breakout.points} points · ${breakout.blockedShots} blocks · ${breakout.gamesPlayed} games`);
assert.match(RECAP_HONORS[3].description!, new RegExp(`${breakout.goals} goals, ${breakout.assists} assists`));
assert.ok(calculateRecapHighlights([]).every(a => a.winners.length === 0));
const games = Array.from({ length: 11 }, (_, i) => ({
  id: String(i), timestamp: i, date: "test", opponent: "test",
  scoreUs: 3, scoreThem: 0, matchType: "regular",
  players: ["A", "B"].map(name => ({name, goals: i < 5 ? 1 : i === 5 ? 99 : 2, assists: 0})),
}));
const highlights = calculateRecapHighlights(games);
assert.deepEqual(highlights[0].winners, ["A", "B"]);
assert.equal(highlights.length, 1); // Editorial breakout is independent of match history.


assert.deepEqual(calculateRecapHighlights([...games].reverse()), highlights);
assert.deepEqual(calculateRecapHighlights([...games, games[0]]), highlights);
console.log("Recap honors: positional awards retained, raw leaders removed, archived winners, eligibility, ties, ordering and duplicate games passed.");
