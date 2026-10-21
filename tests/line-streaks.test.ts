import assert from "node:assert/strict";
import test from "node:test";
import { lineWinStreaks } from "../src/app/matches/line-streaks";

const CLUB = ["Mhut8", "u4 Pablo", "JeneReneTetreau", "oP wet", "S1obbyRobby", "u4 Hood"];
// Names prefixed with "G:" played goalie that game.
const player = (raw: string) => {
  const goalie = raw.startsWith("G:");
  return { name: goalie ? raw.slice(2) : raw, position: goalie ? "goalie" : "center", isOurPlayer: true, isGoalie: goalie, goals: 0, shots: 1 };
};
const game = (id: string, timestamp: number, us: number, them: number, names: string[], extra = {}) => ({
  id, timestamp, date: `Day ${timestamp}`, scoreUs: us, scoreThem: them, matchType: "regular", players: names.map(player), ...extra,
});
const JRT = "JENE RENE TETREAU IV", MATT = "MATT HUT", XAV = "XAVIER LAFLAMME";

test("goalie counts as part of the line (Matt, Xavier, JRT in net)", () => {
  const streaks = lineWinStreaks([
    game("1", 1, 1, 3, ["G:RYDER", "DYLAN", "MATT"]),
    game("2", 2, 6, 5, ["G:RYDER", "DYLAN", "MATT"]),
    game("3", 3, 0, 2, ["G:RYDER", "MATT", "COLIN"]), // different lineup: doesn't touch it
    game("4", 4, 4, 3, ["G:RYDER", "DYLAN", "MATT"]),
    game("5", 5, 5, 0, ["G:RYDER", "DYLAN", "MATT"], { forfeit: true }),
  ], CLUB);
  assert.deepEqual(streaks.map(s => [s.players, s.current, s.goalies]), [[[JRT, MATT, XAV], 3, [JRT]]]);
  assert.equal(streaks[0].games, 4);
  assert.equal(streaks[0].lastWin, "Day 5");
});

test("a game only counts for the exact lineup: trio wins never extend the duo", () => {
  const streaks = lineWinStreaks([
    game("1", 1, 2, 1, ["G:RYDER", "MATT"]),
    game("2", 2, 2, 1, ["G:RYDER", "MATT"]),
    game("3", 3, 2, 1, ["G:RYDER", "MATT"]),
    game("4", 4, 2, 1, ["G:RYDER", "MATT", "DYLAN"]),
    game("5", 5, 2, 1, ["G:RYDER", "MATT", "DYLAN"]),
    game("6", 6, 2, 1, ["G:RYDER", "MATT", "DYLAN"]),
    game("7", 7, 2, 1, ["G:RYDER", "MATT", "DYLAN"]),
    game("8", 8, 2, 1, ["G:RYDER", "MATT", "DYLAN"]),
  ], CLUB);
  assert.deepEqual(streaks.map(s => [s.players, s.current, s.games]), [
    [[JRT, MATT, XAV], 5, 5],
    [[JRT, MATT], 3, 3],
  ]);
});

test("a loss ends only that lineup's streak", () => {
  const streaks = lineWinStreaks([
    game("1", 1, 2, 1, ["MATT", "DYLAN"]),
    game("2", 2, 2, 1, ["MATT", "DYLAN"]),
    game("3", 3, 2, 1, ["MATT", "COLIN"]),
    game("4", 4, 2, 1, ["MATT", "COLIN"]),
    game("5", 5, 0, 1, ["MATT", "COLIN"]),
  ], CLUB);
  assert.deepEqual(streaks.map(s => [s.players, s.current]), [[[MATT, XAV], 2]]);
});

test("guests are ignored (the lineup is just the club members); private games and empty forfeits are skipped", () => {
  const streaks = lineWinStreaks([
    game("1", 1, 3, 1, ["MATT", "BYCURIOUSJORGE2", "OthersideExotics"]),
    game("2", 2, 3, 1, ["MATT", "BYCURIOUSJORGE2", "DYLAN"]),
    game("p", 3, 0, 9, ["MATT", "DYLAN"], { matchType: "private" }),
    game("f", 4, 0, 1, ["MATT", "DYLAN"], { forfeit: true, players: [] }),
    game("3", 5, 3, 1, ["MATT", "DYLAN"]),
  ], CLUB);
  assert.deepEqual(streaks.map(s => [s.players, s.current]), [[[MATT, XAV], 2]]);
});
