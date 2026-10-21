import assert from "node:assert/strict";
import test from "node:test";
import archive from "../src/lib/archives/nhl26-match-history.json";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import { buildRecordsData, type ArchiveMatch } from "../src/app/records/redesign/records-data";

const archived = archive.matches as unknown as ArchiveMatch[];
const past = { key: "2025", label: "2025–2026", param: "2025-2026", played: 366, matches: archived,
  roster: FROZEN_CHELSTATS.members.map(m => m.username) };
const liveRoster = ["Mhut8"];
const data = buildRecordsData([past, { key: "2026", label: "2026–2027", param: "2026-2027", matches: [], roster: liveRoster }], "2026");
const record = (d: typeof data, id: string) => d.playerGames.find(r => r.id === id)!;

test("single-game player records come from logged games and link to them", () => {
  for (const id of ["game-goals", "game-points"]) {
    const top = record(data, id).ranking[0];
    assert.equal(top.name, "XAVIER LAFLAMME");
    assert.equal(top.number, 20);
    assert.equal(top.game.opponent, "The Goofballs");
    assert.equal(top.game.href, "/matches/19142234140022?season=2025-2026");
  }
});

test("team records keep every game behind them; private games are excluded", () => {
  assert.equal(data.team.goals.value, 20);
  assert.equal(data.team.goals.games.length, 1);
  assert.equal(data.team.goals.broken, undefined);
  const streak = data.team.streaks.find(s => s.season === "2025")!;
  assert.equal(streak.games.length, streak.value);
  assert.ok(streak.games.every(g => g.scoreUs > g.scoreThem));
  assert.equal(data.seasons[0].games, archived.filter(m => m.matchType !== "private").length);
});

test("a new current-season game that beats the old best is flagged as broken", () => {
  const game: ArchiveMatch = {
    id: "new-1", timestamp: 1_800_000_000, date: "October 20, 2026", opponent: "Test Club",
    scoreUs: 25, scoreThem: 1, matchType: "regular", shotsUs: 40,
    players: [{ name: "MATT", position: "center", isGoalie: false, isOurPlayer: true, goals: 21, assists: 1 }],
  };
  const live = buildRecordsData([past, { key: "2026", label: "2026–2027", param: "2026-2027", matches: [game], roster: liveRoster }], "2026");
  assert.equal(live.team.goals.value, 25);
  assert.deepEqual(live.team.goals.broken?.previous, 20);
  const goals = record(live, "game-goals");
  assert.equal(goals.ranking[0].name, "MATT HUT");
  assert.equal(goals.ranking[0].game.href, "/matches/new-1?season=2026-2027");
  assert.equal(goals.previous[0].number, 20);
});

test("drop-ins never hold or rank in a record; an empty roster fails closed", () => {
  const game: ArchiveMatch = {
    id: "drop-1", timestamp: 1_800_000_000, date: "October 20, 2026", opponent: "Test Club",
    scoreUs: 5, scoreThem: 1, matchType: "regular",
    players: [{ name: "ur_fault1", position: "center", isGoalie: false, isOurPlayer: true, goals: 1, hits: 99 }],
  };
  const live = buildRecordsData([past, { key: "2026", label: "2026–2027", param: "2026-2027", matches: [game], roster: liveRoster }], "2026");
  assert.ok(live.playerGames.every(r => r.ranking.every(e => e.name !== "ur_fault1")));
  const closed = buildRecordsData([past, { key: "2026", label: "2026–2027", param: "2026-2027",
    matches: [{ ...game, players: [{ name: "MATT", position: "center", isGoalie: false, isOurPlayer: true, hits: 99 }] }], roster: [] }], "2026");
  assert.ok(closed.playerGames.every(r => r.ranking.every(e => e.season !== "2026")));
});
