import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MvpRace from "../src/app/stats/components/MvpRace";
import WeeklyHonors from "../src/app/stats/components/WeeklyHonors";
import { StatsDisplay } from "../src/app/stats/components/StatsDisplay";
import { chelstatsToSeasonData } from "../src/lib/chelstats";
import { getEnrichedPlayers } from "../src/lib/discord";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import { calculateWeeklyAwardHistory, type WeeklyAwardHistory, type WeeklyAwardHistoryEntry } from "../src/lib/hockey-awards";
import { HOCKEY_SEASON } from "../src/lib/hockey-season-state";
import { getNickname } from "../src/lib/nicknames";

const now = "2026-09-14T00:00:00.000Z";
const emptyHistory = calculateWeeklyAwardHistory([], now);
const winner = (playerId: string, name: string, wins: number, rank: number): WeeklyAwardHistoryEntry => ({
  playerId, name, wins, rank, lastWin: "2026-09-07T00:00:00.000Z",
});
const historyWith = (...rankings: WeeklyAwardHistoryEntry[]): WeeklyAwardHistory => ({
  ...emptyHistory, rankings, awardedWeeks: Math.max(0, ...rankings.map(entry => entry.wins)),
  totalAwards: rankings.reduce((sum, entry) => sum + entry.wins, 0),
});

function honorsRows(markup: string) {
  const tables = markup.match(/<table\b[^>]*class="stats-honors-table"[^>]*>[\s\S]*?<\/table>/g) ?? [];
  assert.equal(tables.length, 1, "One honors table, without additional award widgets");
  const table = tables[0];
  assert.ok(table.includes(`<caption>${HOCKEY_SEASON} · Player of the Week wins</caption>`));
  const head = table.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  assert.deepEqual([...head.matchAll(/<th scope="col">([^<]*)<\/th>/g)].map(match => match[1]), ["Rank", "Player", "Wins"]);
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return [...body.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)].map(([, attributes, content]) => {
    const cells = [...content.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    assert.equal(cells.length, 3);
    assert.deepEqual(cells.map(cell => cell[1]), ["td", "th", "td"]);
    assert.match(cells[1][2], /scope="row"/);
    assert.doesNotMatch(cells[1][3], /<small|<time/, "Names do not include last-win dates");
    assert.match(cells[2][3], /^<strong>(?:[\d,]+|—)<\/strong>$/);
    const winning = attributes.match(/data-winning="(true|false)"/)?.[1];
    assert.ok(winning, "Every row identifies whether it has recorded wins");
    return { rank: cells[0][3], name: cells[1][3], wins: cells[2][3].replace(/<[^>]+>/g, ""), winning: winning === "true" };
  });
}

test("stats page keeps current-only weekly history and roster, with no live tracker or archive substitution", () => {
  const page = readFileSync("src/app/stats/page.tsx", "utf8");
  const honors = readFileSync("src/app/stats/components/WeeklyHonors.tsx", "utf8");
  assert.equal((page.match(/<StatsClient\s/g) ?? []).length, 1);
  assert.ok(page.indexOf('<MvpRace') < page.indexOf('<StatsClient'));
  assert.match(page, /currentStats \? \[currentStats, \.\.\.archives\] : archives/);
  assert.match(page, /currentAvailable=\{available\}/);
  assert.match(page, /const members = season\.data\?\.members \?\? \[\]/);
  assert.match(page, /season\.data \? calculateWeeklyAwardHistory\(season\.data\.matches, season\.awards\?\.asOf[^;]+: null/);
  const props = page.match(/<WeeklyHonors\b[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(props, /history=\{weeklyHistory\}/);
  assert.match(props, /members=\{members\}/);
  assert.doesNotMatch(props, /awards=/);
  assert.match(page, /<TrackingNotice state=\{season\}/);
  assert.match(page, /id="archive"/);
  assert.doesNotMatch(page, /WeeklyTracker|fetchLiveChelstatsData|fetchPlayerOfWeek|fetchPotw/);
  assert.doesNotMatch(honors, /FROZEN_CHELSTATS|chelstats-frozen|fetch\(/);
  const source = page + honors;
  assert.equal((source.match(/id="weekly-honors"/g) ?? []).length, 1);
  assert.equal((source.match(/id="weekly-tracker"/g) ?? []).length, 1);
  assert.match(source, /<([a-z]+)\b[^>]*id="weekly-tracker"[^>]*(?:\/>|><\/\1>)/, "Legacy tracker is an empty anchor only");
});

test("MVP missing versus pending is explicit and tied leaders are both featured", () => {
  assert.match(renderToStaticMarkup(<MvpRace members={[]} available={false} />), /Rankings temporarily unavailable/);
  assert.match(renderToStaticMarkup(<MvpRace members={[]} available />), /No eligible performances yet/);
  const base = FROZEN_CHELSTATS.members.find(member => member.gamesPlayed >= 5)!;
  const markup = renderToStaticMarkup(<MvpRace members={[{...base,username:"Tied A"},{...base,username:"Tied B"}]} available />);
  assert.match(markup, /Sharing the lead/);
  assert.match(markup, /Tied A \/ Tied B/);
  assert.equal((markup.match(/data-leading="true"/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /NaN|Infinity/);
});

test("MVP board shows role stats instead of model scores, with goalies labelled G", () => {
  const skater = FROZEN_CHELSTATS.members.find(member => member.gamesPlayed >= 5 && member.goalieGP === 0)!;
  const goalie = { ...FROZEN_CHELSTATS.members.find(member => member.goalieGP >= 5)!, username: "Net Minder", gamesPlayed: 0 };
  const markup = renderToStaticMarkup(<MvpRace members={[skater, goalie]} available />);
  const rows = markup.match(/<tr[^>]*data-leading[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  assert.equal(rows.length, 2);
  const cells = (row: string) => [...row.matchAll(/<dd>([^<]*)<\/dd><dt>([^<]*)<\/dt>/g)].map(m => [m[2], m[1]]);
  const skaterRow = rows.find(row => row.includes(getNickname(skater.username)))!;
  const goalieRow = rows.find(row => row.includes("Net Minder"))!;
  const n = (value: number) => value.toLocaleString("en-US");
  assert.deepEqual(cells(skaterRow), [["GP", n(skater.gamesPlayed)], ["G", n(skater.goals)], ["A", n(skater.assists)], ["PTS", n(skater.goals + skater.assists)]]);
  assert.deepEqual(cells(goalieRow), [["GP", n(goalie.goalieGP)], ["SV%", `${goalie.savePct.toFixed(1)}%`], ["GAA", goalie.gaa.toFixed(2)], ["SO", n(goalie.shutouts)]]);
  assert.match(goalieRow, /<small>G<\/small>/);
  assert.doesNotMatch(markup, /Goaltender|Performance score|stats-rank-score|stats-mvp-score|<th scope="col">Score<\/th>/);
  assert.match(markup, /<th scope="col">Stats<\/th>/);
  const feature = markup.match(/<dl class="stats-mvp-line"[\s\S]*?<\/dl>/)?.[0] ?? "";
  assert.equal([...feature.matchAll(/<dt>([^<]*)<\/dt>/g)].length, 4, "Leader feature shows the same four role stats");
});

test("missing weekly history is unavailable and roster wins stay unknown, never zero", () => {
  const markup = renderToStaticMarkup(<WeeklyHonors history={null} members={[{ username: "New player" }, { username: "Mhut8" }]} stale />);
  assert.match(markup, /Award totals are temporarily unavailable/);
  assert.match(markup, /Missing history is not zero wins/);
  const rows = honorsRows(markup);
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row.rank === "—" && row.wins === "—" && !row.winning));
  assert.doesNotMatch(markup, /<strong>0<\/strong>/);
  const noRoster = renderToStaticMarkup(<WeeklyHonors history={null} members={[]} stale={false} />);
  assert.match(noRoster, /Award totals are temporarily unavailable/);
  assert.doesNotMatch(noRoster, /No Player of the Week wins recorded yet|<strong>0<\/strong>/);
});

test("available empty history gives roster members zero and no roster gives a concise empty state", () => {
  const markup = renderToStaticMarkup(<WeeklyHonors history={emptyHistory} members={[{ username: "Mhut8" }, { username: "New player" }]} stale={false} />);
  const rows = honorsRows(markup);
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row.rank === "—" && row.wins === "0" && !row.winning));
  const empty = renderToStaticMarkup(<WeeklyHonors history={emptyHistory} members={[]} stale={false} />);
  assert.match(empty, /No Player of the Week wins recorded yet/);
  assert.doesNotMatch(empty, /<tbody>[\s\S]*?<tr|No games were captured|Monday cutoff|Three games|performance score/i);
});

test("weekly honors displays exact recorded tallies, competition ranks and zero-win roster members", () => {
  const history = historyWith(winner("a", "Alpha", 7, 1), winner("b", "Bravo", 3, 2), winner("c", "Charlie", 3, 2), winner("d", "Delta", 1, 4));
  const before = structuredClone(history);
  const markup = renderToStaticMarkup(<WeeklyHonors history={history} members={[{ username: "Alpha" }, { username: "New player" }]} stale={false} />);
  assert.deepEqual(honorsRows(markup), [
    { rank: "01", name: "Alpha", wins: "7", winning: true },
    { rank: "02", name: "Bravo", wins: "3", winning: true },
    { rank: "02", name: "Charlie", wins: "3", winning: true },
    { rank: "04", name: "Delta", wins: "1", winning: true },
    { rank: "—", name: "New player", wins: "0", winning: false },
  ]);
  assert.deepEqual(history, before, "Rendering preserves source IDs and exact history totals");
  assert.match(markup, /Completed awards only\. Shared winners each receive one win\. Counts reflect recorded /);
  assert.doesNotMatch(markup, /Last saved data|Latest refresh unconfirmed/);
});

test("roster matching resolves gamertags and normalizes raw names without adding duplicate zero rows", () => {
  const history = historyWith(winner("ea-matt", "MATT", 2, 1), winner("ea-other", "mixed case", 1, 2));
  const members = [{ username: "  mHuT8  " }, { username: " Mixed   CASE " }, { username: "New player" }];
  const before = structuredClone(members);
  const rows = honorsRows(renderToStaticMarkup(<WeeklyHonors history={history} members={members} stale={false} />));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => [row.wins, row.winning]), [["2", true], ["1", true], ["0", false]]);
  assert.equal(rows[0].name, "MATT HUT");
  assert.equal(rows[2].name, "New player");
  assert.deepEqual(members, before);
});

test("identical source names and display nicknames do not merge recorded winner IDs", () => {
  const history = historyWith(winner("source-one", "MATT", 5, 1), winner("source-two", "MATT", 2, 2), winner("source-three", "MATT HUT", 2, 2));
  const rows = honorsRows(renderToStaticMarkup(<WeeklyHonors history={history} members={[{ username: "Mhut8" }]} stale={false} />));
  assert.deepEqual(rows, [
    { rank: "01", name: "MATT HUT", wins: "5", winning: true },
    { rank: "02", name: "MATT HUT", wins: "2", winning: true },
    { rank: "02", name: "MATT HUT", wins: "2", winning: true },
  ]);
});

test("a matching public nickname is not evidence that a roster member has recorded wins", () => {
  for (const [recordedName, username] of [["MATT HUT", "Mhut8"], ["MATT", "MATT HUT"]]) {
    const history = historyWith(winner("recorded-source", recordedName, 4, 1));
    const rows = honorsRows(renderToStaticMarkup(<WeeklyHonors history={history} members={[{ username }]} stale={false} />));
    assert.deepEqual(rows, [
      { rank: "01", name: "MATT HUT", wins: "4", winning: true },
      { rank: "—", name: "MATT HUT", wins: "0", winning: false },
    ]);
  }
});

test("saved honors retain stale disclosure but no featured winner, imagery, dates, totals or scoring details", () => {
  const history = historyWith({ ...winner("saved", "Saved winner", 3, 1), lastWin: "2020-01-06T00:00:00.000Z" });
  const markup = renderToStaticMarkup(<WeeklyHonors history={history} members={[]} stale />);
  assert.match(markup, /Last saved data/);
  assert.match(markup, /Latest refresh unconfirmed/);
  assert.deepEqual(honorsRows(markup), [{ rank: "01", name: "Saved winner", wins: "3", winning: true }]);
  assert.doesNotMatch(markup, /<img\b|<figure\b|<details\b|<time\b|stats-weekly-feature|stats-honors-totals|stats-honors-layout|weekly-tracker-table/);
  assert.doesNotMatch(markup, /performance score|current.week|this week|in.progress|last completed week|last win|week of|weeks with a winner|recorded award wins|method|Jan 6|2020|Selection unavailable/i);
  const emptySaved = renderToStaticMarkup(<WeeklyHonors history={emptyHistory} members={[]} stale />);
  assert.match(emptySaved, /Last saved data/);
  assert.match(emptySaved, /Latest refresh unconfirmed/);
});

test("member snapshot adapter preserves goalie GAA and reported zero shutouts without changing frozen input", () => {
  const source = { ...FROZEN_CHELSTATS.members[0], username:"Snapshot goalie", goalieGP:3, goalieSaves:52, savePct:83.9, gaa:3.33, shutouts:0, shutoutPeriods:0 };
  const before = JSON.stringify(source);
  const stats = chelstatsToSeasonData([source], {season:"2026–2027",date:now}).stats;
  const goalie = getEnrichedPlayers(stats)[0];
  assert.equal(goalie.gaa, 3.33);
  assert.equal(goalie.shutouts, 0);
  assert.equal(goalie.shutoutPeriods, 0);
  assert.equal(JSON.stringify(source), before);
  const markup = renderToStaticMarkup(<StatsDisplay stats={stats} />);
  assert.match(markup, /<td>3\.33<\/td><td>0<\/td><td>0<\/td>/);
  const historical = {...stats,saves:stats.saves.map(({gaa, ...saved}) => { void gaa; return saved; })};
  assert.equal(getEnrichedPlayers(historical)[0].gaa, undefined, "Older missing GAA stays absent, not zero");
});
