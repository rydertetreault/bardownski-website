import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import MatchReport from "../src/app/matches/components/MatchReport";
import { CHAMPIONSHIP } from "../src/lib/championship";
import type { Match, MatchPlayerStat } from "../src/types";

const match: Match = { id: "sample", timestamp: 20, date: "September 13, 2026", opponent: "Visitors", homeAway: "home", status: "final", scoreUs: 6, scoreThem: 3, matchType: "regular" };
const player: MatchPlayerStat = { name: "Sample skater", position: "leftWing", goals: 0, assists: 0, hits: 0, shots: 0, plusMinus: 0, pim: 0, powerPlayGoals: 0, shortHandedGoals: 0, gameWinningGoal: 0, saves: 0, shotsAgainst: 0, goalsAgainst: 0, savePct: 0, isGoalie: false, isOurPlayer: true };
function render(changes: Partial<Match> = {}, season: "2026-2027" | "2025-2026" = "2026-2027", standalone = false) {
  return renderToStaticMarkup(<MatchReport match={{ ...match, ...changes }} season={season} standalone={standalone} titleId="report-title" />);
}

test("same report supports dialog and standalone heading hierarchy with B logo", () => {
  const embedded = render();
  assert.match(embedded, /<h2 id="report-title"/);
  assert.doesNotMatch(embedded, /<h1/);
  assert.match(embedded, /aria-labelledby="report-title"/);
  assert.match(embedded, /B-logo.png/);
  assert.match(render({}, "2026-2027", true), /<h1 id="report-title"/);
});

test("unknown team statistics and absent players render honest missing states", () => {
  const html = render({ scoreUs: null, scoreThem: null });
  assert.match(html, /Score unavailable/);
  assert.match(html, /Not available/);
  assert.match(html, /Some team statistics weren’t supplied/);
  assert.match(html, /Player statistics weren’t supplied/);
  assert.doesNotMatch(html, /NaN|Infinity|Bardownski win|Bardownski loss/);
});

test("team durations compare full minutes and seconds, not decimal prefixes", () => {
  const html = render({ toaUs: "4:59", toaThem: "5:01", shotsUs: 0, shotsThem: 0, passCompUs: 0, passCompThem: 100 });
  assert.match(html, /width:49\.833333333333336%/);
  assert.match(html, /width:50\.16666666666667%/);
  assert.match(html, /4:59/);
  assert.match(html, /5:01/);
  assert.doesNotMatch(html, /Some team statistics weren’t supplied|NaN|Infinity/);
});

test("player tables separate opponents and preserve zero saves, zero save percentage and signed stats", () => {
  const html = render({ players: [player, { ...player, name: "Our goalie", isGoalie: true }, { ...player, name: "Their skater", isOurPlayer: false, goals: 3, plusMinus: -2 }] });
  const tables = html.match(/<table\b[^]*?<\/table>/g)!;
  assert.equal(tables.length, 3);
  assert.match(tables[0], /Bardownski · Skaters/);
  assert.doesNotMatch(tables[0], /Their skater/);
  assert.match(tables[1], /Bardownski · Goaltending/);
  assert.match(tables[1], /<td>0<\/td><td>0<\/td><td>0\.000<\/td>/);
  assert.match(tables[2], /Visitors · Skaters/);
  assert.match(tables[2], /Their skater/);
  assert.match(tables[2], /<td>-2<\/td>/);
  assert.doesNotMatch(tables[2], /Sample skater|Our goalie/);
});

test("championship story only belongs to the archive even with colliding match identity", () => {
  const changes: Partial<Match> = { opponent: CHAMPIONSHIP.opponent, scoreUs: 5, scoreThem: 3, matchType: "finals" };
  assert.match(render(changes, "2025-2026"), /Championship clincher|The title is ours/);
  assert.doesNotMatch(render(changes), /Championship clincher|The title is ours|lifted the Season 4/);
});

test("non-final and level results are not falsely presented as defeats", () => {
  assert.match(render({ scoreUs: 3 }), /Draw/);
  for (const status of ["upcoming", "live"] as const) {
    const html = render({ status });
    assert.doesNotMatch(html, /Bardownski win|Bardownski loss/);
    assert.match(html, status === "live" ? /In progress/ : /Upcoming/);
  }
});
