import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { getPlayerNumber } from "../src/lib/player-numbers";

test("Lab club numbers match published roster for real names, nicknames and gamertags", () => {
  for (const [aliases, number] of [
    [["RYDER", "Rydayro", "JENE RENE TETREAU IV"], 14],
    [["DYLAN", "u4 Pablo", "XAVIER LAFLAMME"], 4],
    [["MATT", "Mhut8", "MATT HUT"], 8],
    [["ROB", "S1obbyRobby", "SLOBBY ROBBY"], 1],
    [["COLIN", "oP wet", "WOLFGANG MOZART"], 2],
    [["KADEN", "u4 Hood", "GOTTA BE"], 9],
    [["JIMMY", "Julio 3026", "JIMMY LEMONS"], 69],
    [["LOGAN", "oP Ding1633", "TOP G"], 6],
  ] as const) {
    for (const alias of aliases) {
      assert.equal(getPlayerNumber(alias), number);
      assert.equal(getPlayerNumber(`  ${alias.toLowerCase()}  `), number);
    }
    assert.match(readFileSync("src/app/roster/page.tsx", "utf8"), new RegExp(`${aliases[0]}: ${number}\\b`));
  }
  for (const unknown of ["", "New skater", "constructor", "toString", "MATT 2"]) assert.equal(getPlayerNumber(unknown), null);
});

test("builder uses numbered plus-node selectors, never jerseys or drawing-board panels", () => {
  const planner = readFileSync("src/components/lines/LinePlanner.tsx", "utf8");
  assert.doesNotMatch(planner, /Sweater|line-sweater|THE DRAWING BOARD|line-ice/);
  assert.match(planner, /line-triangle/);
  assert.match(planner, /variant="player"/);
  assert.match(planner, /playerNumber \?\? "—" : "\+"/);
  assert.match(planner, /player\?\.name \?\? "Add player"/);
  const comparison = readFileSync("src/app/lab/components/HeadToHeadCard.tsx", "utf8");
  assert.match(comparison, /variant="player"/);
  assert.match(comparison, /getPlayerNumber/);
});


test("three-skater formation is center, wing and defense with a separate optional goalie", () => {
  const planner = readFileSync("src/components/lines/LinePlanner.tsx", "utf8");
  assert.match(planner, /3: \["Center", "Wing", "Defense"\]/);
  assert.match(planner, /3: \["C", "W", "D"\]/);
  assert.match(planner, /id="line-goalie" label="Goalie"/);
  assert.match(planner, /<GoalieImpact compact dataset=\{goalieDataset\} skaters=\{slots\}/);
  assert.match(planner, /slots, available, goalieId/);
  assert.match(planner, /!used\.has\(draft\.goalieId\)/);
  assert.match(planner, /if \(id && id === goalieId\) setGoalieId\(""\)/);
  const page = readFileSync("src/app/lab/page.tsx", "utf8");
  assert.match(page, /buildGoalieDataset\(members, season\.data\?\.matches \?\? \[\]\)/);
  assert.match(page, /buildGoalieDataset\(FROZEN_CHELSTATS\.members, archivedMatches\)/);
});
