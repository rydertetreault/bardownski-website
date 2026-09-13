import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getScoutingReport } from "../src/app/roster/scouting";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import type { ClubMember } from "../src/lib/chelstats";

const fixtures = [
  { username: "u4 Pablo", name: "DYLAN", nickname: "Xavier Laflamme", role: "Playmaker", values: ["290", "920", "490", "1,410"] },
  { username: "Mhut8", name: "MATT", nickname: "Matt Hut", role: "Sniper", values: ["233", "472", "329", "801"] },
  { username: "u4 Hood", name: "KADEN", nickname: "Gotta Be", role: "Offensive Defenseman", values: ["117", "121", "196", "317"] },
  { username: "Julio 3026", name: "JIMMY", nickname: "Jimmy Lemons", role: "Two-Way Winger", values: ["112", "95", "187", "282"] },
  { username: "S1obbyRobby", name: "ROB", nickname: "Slobby Robby", role: "Shutdown Defenseman", values: ["91", "33", "170", "203"] },
  { username: "Rydayro", name: "RYDER", nickname: "Jene Rene Tetreau IV", role: "Goaltender", values: ["209", "132", "2,135", "71.0%"] },
  { username: "oP Ding1633", name: "LOGAN", nickname: "Top G", role: "Impact Winger", values: ["125", "150", "172", "322"] },
  { username: "oP wet", name: "COLIN", nickname: "Wolfgang Mozart", role: "Utility", values: ["101", "80", "141", "221"] },
  { username: "Treyway6479", name: "Treyway6479", nickname: "Treyway6479", role: "Winger · Limited Sample", values: ["8", "0", "6", "6"] },
];

function memberFor(username: string): ClubMember {
  const member = FROZEN_CHELSTATS.members.find((entry) => entry.username === username);
  assert.ok(member, `Missing archived member: ${username}`);
  return member;
}

const reports = fixtures.map((fixture) => getScoutingReport(memberFor(fixture.username), fixture.name));

test("all nine frozen members receive distinct nickname-only archived-season reports", () => {
  assert.equal(FROZEN_CHELSTATS.members.length, 9);
  assert.deepEqual(new Set(fixtures.map((fixture) => fixture.username)), new Set(FROZEN_CHELSTATS.members.map((member) => member.username)));
  assert.equal(new Set(reports.map((report) => report.description)).size, 9);
  for (const [index, fixture] of fixtures.entries()) {
    const report = reports[index];
    assert.equal(report.season, "2025–2026");
    assert.equal(report.role, fixture.role);
    assert.ok(report.description.includes(fixture.nickname));
    assert.ok(report.description.includes("2025–2026"));
    assert.ok(report.description.split(/\s+/).length >= 50);
    assert.ok(report.description.split(/\s+/).length <= 95);
    assert.ok(report.focus.length > 15 && report.focus.length < 150);
    let publicCopy = [report.role, report.description, report.focus, report.sampleNote].join(" ");
    // Matt Hut and Jimmy Lemons are approved nicknames, not raw first names.
    for (const { nickname } of fixtures) publicCopy = publicCopy.replaceAll(nickname, "");
    assert.doesNotMatch(publicCopy, /\b(?:DYLAN|MATT|KADEN|JIMMY|ROB|RYDER|LOGAN|COLIN)\b/i);
    assert.doesNotMatch(publicCopy, /playoffs?|league rank|clutch|awards?|nothing gets through|never out of place|current season/i);
  }
});

test("summary values exactly match the verified archive with stable en-US formatting", () => {
  for (const [index, fixture] of fixtures.entries()) {
    const report = reports[index];
    const member = memberFor(fixture.username);
    const isGoalie = fixture.name === "RYDER";
    assert.equal(report.stats.length, 4);
    assert.deepEqual(report.stats.map((stat) => stat.label), isGoalie
      ? ["Goalie GP", "Goalie wins", "Saves", "Save %"]
      : ["Skater GP", "Goals", "Assists", "Points"]);
    assert.deepEqual(report.stats.map((stat) => stat.value), fixture.values);
    const expected = isGoalie
      ? [member.goalieGP.toLocaleString("en-US"), member.goalieWins.toLocaleString("en-US"), member.goalieSaves.toLocaleString("en-US"), `${member.savePct.toFixed(1)}%`]
      : [member.gamesPlayed, member.goals, member.assists, member.points].map((value) => value.toLocaleString("en-US"));
    assert.deepEqual(report.stats.map((stat) => stat.value), expected);
    for (const value of fixture.values) assert.ok(report.description.includes(value), `${fixture.nickname}: missing ${value}`);
  }
});

test("goalie workload remains separate even with the archived SKTR position", () => {
  const goalie = memberFor("Rydayro");
  assert.equal(goalie.position, "SKTR");
  assert.equal(goalie.gamesPlayed, 27);
  const report = getScoutingReport(goalie, "RYDER");
  assert.equal(report.stats[0].value, "209");
  assert.match(report.description, /209 goalie appearances/);
  assert.doesNotMatch(report.description, /27 (?:skater|goalie)/);
  assert.match(report.description, /21 shutouts/);
  const winger = getScoutingReport(memberFor("Julio 3026"), "JIMMY");
  assert.equal(winger.stats[0].value, "112");
  assert.match(winger.description, /separate 25-game goalie sample/);
  assert.match(winger.description, /98 blocked shots/);
  const utility = getScoutingReport(memberFor("oP wet"), "COLIN");
  assert.equal(utility.stats[0].value, "101");
  assert.match(utility.description, /27 separate goalie appearances and 21 goalie wins/);
});

test("supporting totals are factual and defensive plus/minus is shared context", () => {
  const attackingDefense = getScoutingReport(memberFor("u4 Hood"), "KADEN");
  assert.match(attackingDefense.description, /-33 plus\/minus/);
  assert.match(attackingDefense.description, /shared on-ice results, not an individual defensive verdict/);
  const defense = getScoutingReport(memberFor("S1obbyRobby"), "ROB");
  assert.match(defense.description, /123 blocked shots/);
  assert.match(defense.description, /\+51 plus\/minus is shared on-ice context/);
  assert.match(getScoutingReport(memberFor("Mhut8"), "MATT").description, /shooting 33\.5%/);
  const impact = getScoutingReport(memberFor("oP Ding1633"), "LOGAN");
  assert.match(impact.description, /562 hits/);
  assert.match(impact.description, /6 game-winning goals/);
});

test("Treyway6479 explicitly limits conclusions from eight games", () => {
  const report = getScoutingReport(memberFor("Treyway6479"), "Treyway6479");
  assert.match(report.sampleNote ?? "", /Limited 8-game skater sample/);
  assert.match(report.sampleNote ?? "", /no established play style inferred/);
  assert.match(report.description, /only 8 skater games: 0 goals, 6 assists and 6 points, with 13 shots/);
  assert.match(report.description, /not enough ice time here to define a signature style/);
  assert.match(report.role, /Limited Sample/);
});

test("numbers are interpolated from the supplied member, not embedded archive constants", () => {
  for (const fixture of fixtures) {
    const changed: ClubMember = {
      ...memberFor(fixture.username), gamesPlayed: 17, goals: 1234, assists: 2345,
      points: 3579, goalieGP: 19, goalieWins: 11, goalieSaves: 3456, savePct: 72.3,
      plusMinus: -12, blockedShots: 19, shots: 29, hits: 47, shotPct: 23.4, shutouts: 7,
    };
    const report = getScoutingReport(changed, fixture.name);
    const expected = fixture.name === "RYDER" ? ["19", "11", "3,456", "72.3%"] : ["17", "1,234", "2,345", "3,579"];
    assert.deepEqual(report.stats.map((stat) => stat.value), expected);
    for (const value of expected) assert.ok(report.description.includes(value));
    if (fixture.name === "Treyway6479") assert.match(report.sampleNote ?? "", /17-game/);
  }
});

test("unknown identities get neutral copy without leaking their internal name", () => {
  for (const name of ["Unlisted player", "constructor", "toString"]) {
    const report = getScoutingReport({ ...memberFor("Treyway6479"), username: name }, name);
    assert.equal(report.role, "Roster Skater");
    assert.equal(report.stats.length, 4);
    assert.match(report.description, /No established scouting description/);
    assert.ok(!report.description.includes(name));
    assert.match(report.sampleNote ?? "", /Limited 8-game skater sample/);
  }
  const goalie = getScoutingReport({ ...memberFor("Rydayro"), username: "Unknown goalie", position: "GK" }, "Unknown goalie");
  assert.equal(goalie.role, "Goaltender");
  assert.deepEqual(goalie.stats.map((stat) => stat.value), ["209", "132", "2,135", "71.0%"]);
});

test("report generation does not mutate archive data or share mutable output", () => {
  const before = structuredClone(FROZEN_CHELSTATS);
  for (const fixture of fixtures) {
    const member = Object.freeze({ ...memberFor(fixture.username) });
    const report = getScoutingReport(member, fixture.name);
    report.stats[0].value = "changed";
    report.stats.push({ label: "Extra", value: "0" });
    const fresh = getScoutingReport(member, fixture.name);
    assert.deepEqual(fresh.stats.map((stat) => stat.value), fixture.values);
  }
  assert.deepEqual(FROZEN_CHELSTATS, before);
});

test("helper is standalone with only a type import and no page or network dependency", () => {
  const source = readFileSync("src/app/roster/scouting.ts", "utf8");
  assert.match(source, /import type \{ ClubMember \}/);
  assert.equal((source.match(/^import /gm) ?? []).length, 1);
  assert.doesNotMatch(source, /fetch\s*\(|from ["'][^"']*page|chelstats-frozen/);
});
