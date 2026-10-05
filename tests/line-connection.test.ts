import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildConnectionGames, buildConnectionPlayers, ConnectionModel, normalizePosition,
  type ConnectionGame, type ConnectionPlayer, type Position,
} from "../src/lib/line-connection";
import type { ClubMember } from "../src/lib/chelstats";

const positions = (counts: Partial<Record<Position, number>>): Record<Position, number> => ({ C: 0, LW: 0, RW: 0, D: 0, G: 0, ...counts });
const player = (id: string, ovr: number, counts: Partial<Record<Position, number>>, member = true): ConnectionPlayer =>
  ({ id, overallRating: ovr, performanceRating: null, positionGames: positions(counts), memberPosition: null, member });
let seq = 0;
const game = (skaters: string[], goalie: string | null, gf: number, ga: number): ConnectionGame =>
  ({ id: String(++seq), date: "", timestamp: seq, opponent: "Opp", goalsFor: gf, goalsAgainst: ga, skaters, goalie, goalieSaves: 10, goalieShots: 10 + ga });

const players = [
  player("CENTER", 80, { C: 10 }), player("WING", 75, { LW: 10 }), player("DMAN", 72, { D: 10 }),
  player("DMAN2", 70, { D: 10 }), player("GOALIE", 85, { G: 12 }), player("GOALIE2", 70, { G: 12 }),
  player("GUEST", 99, { C: 1 }, false),
];
const games = [
  // CENTER + WING win a lot together with GOALIE; lose with GOALIE2.
  ...Array.from({ length: 6 }, () => game(["CENTER", "WING", "DMAN"], "GOALIE", 5, 1)),
  ...Array.from({ length: 6 }, () => game(["CENTER", "WING", "DMAN2"], "GOALIE2", 1, 5)),
];
const model = new ConnectionModel(games, players);
const any = (id: string) => ({ id, role: "any" as const });

test("any two players are rated immediately, including goalie + one skater", () => {
  assert.equal(model.evaluate([any("CENTER"), { id: "", role: "any" }], null), null);
  const pair = model.evaluate([any("CENTER"), any("WING")], null);
  assert.ok(pair && pair.pairs.length === 1 && pair.unit.games === 12);
  const withGoalie = model.evaluate([any("DMAN"), { id: "", role: "any" }], "GOALIE");
  assert.ok(withGoalie && withGoalie.pairs[0].withGoalie && withGoalie.unit.games === 6);
});

test("the goalie changes the unit's connection based on results with those skaters", () => {
  const line = [any("CENTER"), any("WING")];
  const good = model.evaluate(line, "GOALIE")!, bad = model.evaluate(line, "GOALIE2")!;
  assert.ok(good.percentage > bad.percentage, `${good.percentage} > ${bad.percentage}`);
  assert.equal(good.pairs.length, 3);
});

test("adding players moves the score up or down with their pair history", () => {
  const base = model.evaluate([any("CENTER"), any("WING")], null)!.percentage;
  const up = model.evaluate([any("CENTER"), any("WING"), any("DMAN")], null)!.percentage;
  const down = model.evaluate([any("CENTER"), any("WING"), any("DMAN2")], null)!.percentage;
  assert.ok(up > base && down < base, `${down} < ${base} < ${up}`);
});

test("a goalie slotted at wing is heavily penalised and flagged", () => {
  const natural = model.evaluate([{ id: "WING", role: "LW" }, { id: "CENTER", role: "C" }], null)!;
  const goalieAtWing = model.evaluate([{ id: "GOALIE", role: "LW" }, { id: "CENTER", role: "C" }], null)!;
  assert.equal(natural.positionPenalty, 0);
  assert.ok(goalieAtWing.positionPenalty >= 20);
  assert.deepEqual(goalieAtWing.outOfPosition.map(note => [note.id, note.usual]), [["GOALIE", "G"]]);
});

test("suggestions keep fixed picks and the goalie, never use goalies or guests as skaters", () => {
  const pool = players.map(p => p.id);
  const roles = ["C", "W", "D"] as const;
  const open = model.suggest([...roles], ["", "", ""], "GOALIE", pool);
  assert.ok(open.length > 0);
  for (const s of open) assert.ok(s.slots.every(id => !["GOALIE", "GOALIE2", "GUEST"].includes(id)));
  assert.deepEqual(open[0].slots, ["CENTER", "WING", "DMAN"], "best-fit order places each player in their position");
  const fixed = model.suggest([...roles], ["CENTER", "WING", ""], "GOALIE", pool);
  assert.ok(fixed.every(s => s.slots[0] === "CENTER" && s.slots[1] === "WING"));
  assert.equal(fixed[0].slots[2], "DMAN");
  assert.deepEqual(model.suggest([...roles], ["", "", ""], null, pool, { minGames: 99 }), []);
});

test("builders read positions from our match lineups and join verified goalies", () => {
  assert.equal(normalizePosition("defenseMen"), "D");
  assert.equal(normalizePosition("SKTR"), null);
  const member = { username: "Mhut8", position: "C", overallRating: 79, gamesPlayed: 5, goals: 1, assists: 1, points: 2, plusMinus: 0 } as ClubMember;
  const built = buildConnectionPlayers([member], [{ players: [
    { name: "Mhut8", position: "center", isGoalie: false, isOurPlayer: true },
    { name: "Rival", position: "goalie", isGoalie: true, isOurPlayer: false },
  ] as never }], []);
  assert.equal(built.length, 1);
  assert.equal(built[0].positionGames.C, 1);
  assert.equal(built[0].overallRating, 79);
  const joined = buildConnectionGames([{ id: "9", date: "", timestamp: 1, opponent: "x", goalsFor: 2, goalsAgainst: 1, skaters: ["A"] }],
    [{ id: "9", date: "", timestamp: 1, opponent: "x", goalsFor: 2, goalsAgainst: 1, skaters: ["A"], goalieId: "G1", saves: 9, shotsAgainst: 10, goalieGoalsAgainst: 1 }]);
  assert.equal(joined[0].goalie, "G1");
});

test("suggestion sorts rank by the chosen record before trimming, groups without games last", () => {
  const roster = [player("A", 70, { C: 5 }), player("B", 70, { LW: 5 }), player("C2", 70, { D: 5 }), player("D2", 70, { D: 5 })];
  const history = [
    // A+B+C2: 3 games, 2 wins. A+B+D2: 6 games, 3 wins but lopsided losses.
    game(["A", "B", "C2"], null, 3, 1), game(["A", "B", "C2"], null, 2, 1), game(["A", "B", "C2"], null, 0, 1),
    ...Array.from({ length: 3 }, () => game(["A", "B", "D2"], null, 2, 1)),
    ...Array.from({ length: 3 }, () => game(["A", "B", "D2"], null, 0, 6)),
  ];
  const m = new ConnectionModel(history, roster);
  const ids = roster.map(p => p.id);
  const top = (sort: Parameters<typeof m.suggest>[4] extends infer O ? O extends { sort?: infer S } ? S : never : never) =>
    m.suggest(["C", "W", "D"], ["", "", ""], null, ids, { sort, limit: 1 })[0].slots[2];
  assert.equal(top("wins"), "D2");
  assert.equal(top("games"), "D2");
  assert.equal(top("win-pct"), "C2");
  assert.equal(top("goal-diff"), "C2");
  assert.equal(top("goals-against"), "C2");
  const all = m.suggest(["C", "W", "D"], ["", "", ""], null, ids, { sort: "wins" });
  const firstEmpty = all.findIndex(s => s.result.unit.games === 0);
  assert.ok(firstEmpty === -1 || all.slice(firstEmpty).every(s => s.result.unit.games === 0));
});

test("used lines: real lineups by mode, AI-filled spots, exact-lineup records and goalie filter", () => {
  const roster = [player("C1", 70, { C: 9 }), player("W1", 70, { LW: 9 }), player("D1", 70, { D: 9 }), player("D2", 70, { D: 3 }),
    player("G1", 80, { G: 9 }), player("G2", 80, { G: 3 })];
  const g = (skaters: string[], goalie: string, gf: number, ga: number, mode: "3s" | "6s", positions: Record<string, Position>) =>
    ({ ...game(skaters, goalie, gf, ga), mode, positions });
  const history = [
    ...Array.from({ length: 3 }, () => g(["C1", "W1"], "G1", 4, 1, "3s", { C1: "C", W1: "LW" })),
    g(["C1", "W1"], "G2", 0, 3, "3s", { C1: "C", W1: "LW" }),
    g(["C1", "W1", "D1"], "G1", 1, 2, "3s", { C1: "C", W1: "LW", D1: "D" }),
    // A 6v6 game with the same pair must not count as a 3s line.
    g(["C1", "W1", "D1", "D2"], "G1", 5, 0, "6s", { C1: "C", W1: "LW", D1: "D", D2: "D" }),
    { ...game(["C1", "D2"], "G1", 9, 0), complete: false },
  ];
  const m = new ConnectionModel(history, roster);
  const threes = m.usedLines(["C", "W", "D"], ["", "", ""], null, { sort: "wins" });
  // Split by goalie: the same skaters with G1 and with G2 are separate units.
  assert.deepEqual(threes.map(line => [line.slots, line.goalie, line.lineup.wins, line.lineup.losses]), [
    [["C1", "W1", ""], "G1", 3, 0],
    [["C1", "W1", "D1"], "G1", 0, 1],
    [["C1", "W1", ""], "G2", 0, 1],
  ]);
  assert.ok(threes[0].result.pairs.some(pair => pair.withGoalie), "connection includes that goalie");
  const withG2 = m.usedLines(["C", "W", "D"], ["", "", ""], "G2");
  assert.deepEqual(withG2.map(line => [line.slots, line.lineup.games]), [[["C1", "W1", ""], 1]]);
  const units = m.usedLines(["LW", "C", "RW", "LD", "RD"], ["", "", "", "", ""], null);
  assert.equal(units.length, 1);
  assert.equal(units[0].slots[1], "C1");
  assert.ok(units[0].slots.includes("D1") && units[0].slots.indexOf("D1") >= 3, "D-men placed on defense");
  assert.ok(m.usedLines(["C", "W", "D"], ["", "", "D1"], null).every(line => line.slots.includes("D1")));
  assert.ok(m.usedLines(["any", "any"], ["", ""], null).every(line => !(line.slots.includes("D2") && line.lineup.games === 2)), "partial scoresheet skipped");
  const withGuest = new ConnectionModel([g(["C1", "W1", "GUEST"], "G1", 2, 1, "3s", { C1: "C", W1: "LW", GUEST: "D" })],
    [...roster, player("GUEST", 60, { D: 1 }, false)]);
  assert.deepEqual(withGuest.usedLines(["C", "W", "D"], ["", "", ""], null).map(line => line.slots), [["C1", "W1", ""]], "guest spot is open");
});

test("goalie toggle: best goalie per suggested line, and skaters-only used lines combine goalies", () => {
  const pool = players.map(p => p.id);
  const withGoalies = model.suggestWithGoalies(["C", "W", "D"], ["", "", ""], ["GOALIE", "GOALIE2"], pool);
  assert.ok(withGoalies.length > 0 && withGoalies.every(line => line.goalie === "GOALIE" || line.goalie === "GOALIE2"));
  const keys = withGoalies.map(line => [...line.slots].sort().join("|"));
  assert.equal(new Set(keys).size, keys.length, "one best goalie per skater group");
  const top = withGoalies.find(line => line.slots.includes("DMAN") && line.slots.includes("WING"));
  assert.equal(top?.goalie, "GOALIE", "the goalie these skaters won with");
  assert.ok(model.suggest(["C", "W", "D"], ["", "", ""], null, pool).every(line => line.goalie === null));
  assert.ok(model.suggestWithGoalies(["C", "W", "D"], ["GOALIE", "", ""], ["GOALIE"], pool).length === 0, "goalie in a skater slot is not also in net");

  const split = model.usedLines(["any", "any"], ["", ""], null, { withGoalie: true });
  const combined = model.usedLines(["any", "any"], ["", ""], null, { withGoalie: false });
  const cw = (lines: typeof split) => lines.filter(line => line.slots.includes("CENTER") && line.slots.includes("WING"));
  assert.deepEqual(cw(split).map(line => [line.goalie, line.lineup.games]).sort(), [["GOALIE", 6], ["GOALIE2", 6]]);
  assert.deepEqual(cw(combined).map(line => [line.goalie, line.lineup.games]), [[null, 12]]);
  assert.ok(model.usedLines(["any", "any"], ["", ""], "GOALIE2", { withGoalie: false }).some(line => line.lineup.games === 12), "skaters only ignores the goalie filter");

  // A lineup whose games had no recorded goalie is skaters-only material.
  const aiNet = new ConnectionModel([...games, game(["DMAN", "DMAN2"], null, 3, 0), game(["DMAN", "DMAN2"], null, 2, 0)], players);
  assert.ok(aiNet.usedLines(["any", "any"], ["", ""], null, { withGoalie: true }).every(line => line.goalie !== null));
  assert.deepEqual(aiNet.usedLines(["any", "any"], ["DMAN", "DMAN2"], null, { withGoalie: false }).map(line => [line.goalie, line.lineup.games]), [[null, 2]]);

  // One skater + goalie (AI/guests elsewhere) is a unit with a goalie, never a skaters-only line.
  const solo = (skater: string, goalie: string | null, gf: number, ga: number) => ({ ...game([skater], goalie, gf, ga), mode: "3s" as const, positions: { [skater]: "C" as Position } });
  const soloModel = new ConnectionModel([solo("CENTER", "GOALIE", 4, 1), solo("CENTER", "GOALIE", 3, 2), solo("CENTER", null, 1, 0)], players);
  const soloLines = soloModel.usedLines(["C", "W", "D"], ["", "", ""], null, { withGoalie: true });
  assert.deepEqual(soloLines.map(line => [line.slots, line.goalie, line.lineup.games, line.lineup.wins]), [[["CENTER", "", ""], "GOALIE", 2, 2]]);
  assert.ok(soloLines[0].result.pairs.length === 1 && soloLines[0].result.pairs[0].withGoalie);
  assert.deepEqual(soloModel.usedLines(["C", "W", "D"], ["", "", ""], null, { withGoalie: false }), []);
  assert.deepEqual(soloModel.usedLines(["any", "any"], ["", ""], null, { withGoalie: true }).map(line => [line.slots, line.goalie]), [[["CENTER", ""], "GOALIE"]]);
});

test("skaters-in-line filter: exact skater counts for used lines and suggestions", () => {
  const pool = players.map(p => p.id);
  const roles = ["C", "W", "D"] as const;
  const two = model.suggest([...roles], ["", "", ""], "GOALIE", pool, { skaters: 2 });
  assert.ok(two.length > 0 && two.every(line => line.slots.filter(Boolean).length === 2 && line.slots.length === 3));
  const one = model.suggest([...roles], ["", "", ""], "GOALIE", pool, { skaters: 1 });
  assert.ok(one.length > 0 && one.every(line => line.slots.filter(Boolean).length === 1));
  assert.deepEqual(model.suggest([...roles], ["", "", ""], null, pool, { skaters: 1 }), [], "one skater needs a goalie");
  assert.ok(model.suggest([...roles], ["CENTER", "", ""], "GOALIE", pool, { skaters: 2 }).every(line => line.slots[0] === "CENTER" && line.slots.filter(Boolean).length === 2));
  assert.deepEqual(model.suggest([...roles], ["CENTER", "WING", ""], "GOALIE", pool, { skaters: 1 }), [], "more picks than the count");
  const full = model.usedLines([...roles], ["", "", ""], null, { skaters: 3 });
  assert.ok(full.length > 0 && full.every(line => line.slots.filter(Boolean).length === 3));
  assert.deepEqual(model.usedLines([...roles], ["", "", ""], null, { skaters: 2 }), []);
});

test("positions depend on how many of our skaters played: a lone skater at C, a winger beside a teammate", () => {
  const match = (skaters: [string, string][]) => ({ players: [
    ...skaters.map(([name, position]) => ({ name, position, isGoalie: false, isOurPlayer: true })),
    { name: "KEEPER", position: "goalie", isGoalie: true, isOurPlayer: true },
  ] }) as never;
  const member = (username: string) => ({ username, position: "C", overallRating: 75, gamesPlayed: 10, goals: 1, assists: 1, points: 2, plusMinus: 0 }) as ClubMember;
  // XAV plays LW beside MAT (8 games) but C whenever he's alone (4 games).
  const matches = [
    ...Array.from({ length: 8 }, () => match([["XAV", "leftWing"], ["MAT", "center"]])),
    ...Array.from({ length: 4 }, () => match([["XAV", "center"]])),
  ];
  const built = buildConnectionPlayers([member("XAV"), member("MAT")], matches, []);
  const xav = built.find(p => p.id === "XAV")!;
  assert.deepEqual([xav.positionGamesBySize?.[1]?.C, xav.positionGamesBySize?.[2]?.LW], [4, 8]);
  const m = new ConnectionModel([], built);
  assert.ok(m.familiarity("XAV", "C", 1) > m.familiarity("XAV", "W", 1), "alone: center");
  assert.ok(m.familiarity("XAV", "W", 2) > m.familiarity("XAV", "C", 2), "with a teammate: wing");
  assert.equal(m.usualPosition("XAV", 1), "C");
  assert.equal(m.usualPosition("XAV", 2), "LW");
  const alone = (role: "C" | "W") => m.evaluate([{ id: "XAV", role }], "KEEPER")!.positionPenalty;
  assert.ok(alone("C") < alone("W"));
  assert.equal(m.suggest(["C", "W", "D"], ["", "", ""], "KEEPER", ["XAV"], { skaters: 1 })[0].slots[0], "XAV", "suggested at C when alone");
});

test("line ideas count only games with exactly that lineup of club skaters", () => {
  const roster = [player("SOLO", 80, { C: 10 }), player("MATE", 75, { LW: 10 }), player("THIRD", 72, { D: 10 }),
    player("NET", 85, { G: 12 }), player("DROPIN", 90, { C: 1 }, false)];
  const m = new ConnectionModel([
    // SOLO alone with NET: 2 games, plus 1 beside a drop-in guest (AI, still solo).
    game(["SOLO"], "NET", 3, 1), game(["SOLO"], "NET", 2, 2), game(["SOLO", "DROPIN"], "NET", 4, 0),
    // THIRD only ever played with club teammates: never a one-skater line.
    ...Array.from({ length: 4 }, () => game(["SOLO", "MATE", "THIRD"], "NET", 1, 3)),
    { ...game(["THIRD"], "NET", 9, 0), complete: false },
  ], roster);
  const ids = roster.map(p => p.id);
  const fits = m.suggest(["C", "W", "D"], ["", "", ""], "NET", ids, { sort: "games", skaters: 1 });
  const games = Object.fromEntries(fits.map(line => [line.slots.find(Boolean), line.result.unit.games]));
  assert.deepEqual(games, { SOLO: 3, THIRD: 0, MATE: 0 });
  const used = m.usedLines(["C", "W", "D"], ["", "", ""], "NET", { sort: "games", skaters: 1 });
  assert.deepEqual(used.map(line => [line.slots.find(Boolean), line.lineup.games, line.result.unit.games]), [["SOLO", 3, 3]]);
  // Games where a drop-in filled an open spot are counted and flagged.
  assert.equal(fits.find(line => line.slots.includes("SOLO"))!.result.unit.dropInGames, 1);
  assert.equal(used[0].lineup.dropInGames, 1);
  // The line builder still reports every game with the picked players.
  assert.equal(m.evaluate([any("THIRD"), { id: "", role: "any" }], "NET")!.unit.games, 5);
});
