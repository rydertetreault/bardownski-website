import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

test("Player Lab renders a tool chooser rather than both tools in sequence", () => {
  const page = readFileSync("src/app/lab/page.tsx", "utf8");
  const shell = readFileSync("src/app/lab/LabTools.tsx", "utf8");
  assert.match(page, /<LabTools/);
  assert.doesNotMatch(page, /<HeadToHeadCard|<LineSeasonSelector|player-lab-nav/);
  assert.match(page, /initialTool=\{tool === "comparison" \? "comparison" : "lines"\}/);
  assert.match(shell, /dynamic\(\(\) => import\("@\/components\/lines\/LineSeasonSelector"\)/);
  assert.match(shell, /dynamic\(\(\) => import\("\.\/components\/HeadToHeadCard"\)/);
  assert.match(shell, /visited\[tool.id\] && <Activity/);
  assert.match(shell, /mode=\{selected === tool.id \? "visible" : "hidden"\}/);
  assert.match(shell, /hidden=\{selected !== tool.id\}/);
  assert.match(shell, /role="tablist" aria-label="Player Lab tools"/);
  assert.match(shell, /role="tabpanel"/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.ok(shell.includes(key));
});

test("Tool links preserve normal history and reach nested builder insights", () => {
  const shell = readFileSync("src/app/lab/LabTools.tsx", "utf8");
  for (const anchor of ["comparison", "lines", "goalie-compatibility", "goalies", "chemistry-method"]) assert.ok(shell.includes(`"${anchor}"`));
  assert.match(shell, /addEventListener\("popstate", followLocation\)/);
  assert.match(shell, /addEventListener\("hashchange", followLocation\)/);
  assert.match(shell, /history.pushState\(history.state/);
  assert.match(shell, /target instanceof HTMLDetailsElement/);
});


test("Line ideas switches suggestions and goalie stats while pairings stay beside goalie", () => {
  const insights = readFileSync("src/components/lines/LineIdeas.tsx", "utf8");
  const planner = readFileSync("src/components/lines/LinePlanner.tsx", "utf8");
  assert.match(insights, /useState<IdeasTab>\("ideas"\)/);
  for (const label of ["Suggested lines", "Goalie stats with this line"]) assert.ok(insights.includes(label));
  assert.match(insights, /role="tablist" aria-label="Line ideas"/);
  assert.match(insights, /\{panels\[active\]\}/);
  assert.match(planner, /<GoalieCompatibility compact/);
  assert.ok(planner.indexOf("<GoalieCompatibility") < planner.indexOf("<LineIdeas"));
  assert.match(planner, /useState<GoalieImpactViewState>\(\{ mode: "line"/);
  assert.doesNotMatch(insights, /Goalie pairings|id: "pairings"/);
  assert.match(planner, /<GoalieImpact compact/);
  assert.match(planner, /id="chemistry-method"><summary>How ratings work<\/summary>/);
  assert.doesNotMatch(planner, /THE FINE PRINT|line-notes-section|LOOKING FOR A SPARK/);
  assert.match(planner, /useState<GoalieCompatibilityViewState>\(\{ scope: "line"/);
  assert.match(planner, /onViewStateChange=\{setPairingView\}/);
  assert.match(planner, /onViewStateChange=\{setGoalieView\}/);
});
