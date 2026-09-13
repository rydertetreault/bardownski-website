import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import MatchesClient from "../src/app/matches/MatchesClient";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import { HOCKEY_SEASON, type HockeySeasonState } from "../src/lib/hockey-season-state";
import { getResult } from "../src/app/matches/utils";
import type { Match } from "../src/types";

const match = (id: string, timestamp: number, changes: Partial<Match> = {}): Match => ({
  id, timestamp, date: "September 13, 2026", opponent: "The visitors", homeAway: "home",
  scoreUs: 6, scoreThem: 3, status: "final", matchType: "regular", ...changes,
});
const empty: HockeySeasonState = {
  season: HOCKEY_SEASON, status: "unavailable", data: null, updatedAt: null,
  syncedAt: null, coverage: { storedMatches: 0, totalGames: null }, matches: [],
};
function current(matches: Match[], status: "connected" | "stale" = "connected"): HockeySeasonState {
  return { ...empty, status, updatedAt: "2026-09-13T12:00:00Z", matches,
    data: { ...FROZEN_CHELSTATS, clubStats: { ...FROZEN_CHELSTATS.clubStats, totalGames: 12, wins: 7, losses: 5, otl: 0 } },
    coverage: { storedMatches: matches.length, totalGames: 12 },
  };
}
const archive = [match("collision", 10, { opponent: "Archived opponent" })];
function render(season: HockeySeasonState, archivedMatches = archive) {
  return renderToStaticMarkup(<MatchesClient season={season} archivedMatches={archivedMatches} archivedRecord={{ wins: 207, losses: 144, otl: 15 }} />);
}
function section(html: string, id: string) {
  const start = html.indexOf(`id="${id}"`);
  return html.slice(start, html.indexOf("</section>", start));
}

test("hub copy and metadata never expose connection or setup notices", () => {
  for (const season of [empty, { ...empty, status: "awaiting-setup" as const }, current([]), current([], "stale")]) {
    const html = render(season);
    assert.doesNotMatch(html, /tracking|connected|setup pending|NaN|Infinity/i);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.match(html, /THE WIN STREAK/);
    assert.match(html, /Last season’s best/);
  }
  assert.doesNotMatch(readFileSync("src/app/matches/page.tsx", "utf8"), /tracking/i);
});

test("unavailable current data never falls back to archive results or a zero streak", () => {
  const html = render(empty);
  assert.match(section(html, "results"), /Results are temporarily unavailable/);
  assert.doesNotMatch(section(html, "results"), /Archived opponent|207|collision/);
  assert.match(section(html, "archive"), /Archived opponent/);
  assert.match(html, /<strong>—<\/strong><span>Latest results/);
  assert.match(html, /Waiting for a final score/);
  assert.match(html, /<strong>24<\/strong>/);
});

test("current and archive reports use encoded, season-qualified links even for colliding IDs", () => {
  const html = render(current([match("collision", 20), match("slash /?", 19)]));
  assert.match(section(html, "results"), /href="\/matches\/collision\?season=2026-2027"/);
  assert.match(section(html, "results"), /href="\/matches\/slash%20%2F%3F\?season=2026-2027"/);
  assert.match(section(html, "archive"), /href="\/matches\/collision\?season=2025-2026"/);
  assert.doesNotMatch(section(html, "results"), /season=2025-2026/);
  assert.doesNotMatch(section(html, "archive"), /season=2026-2027/);
});

test("newest final is featured; live, upcoming and forfeited rows do not link to a final report", () => {
  const html = render(current([
    match("future", 30, { status: "upcoming", scoreUs: null, scoreThem: null }),
    match("playing", 29, { status: "live" }), match("forfeit", 28, { forfeit: true }),
    match("regular", 27),
  ]));
  for (const id of ["future", "playing", "forfeit"]) assert.doesNotMatch(html, new RegExp(`href="/matches/${id}`));
  assert.match(html, /href="\/matches\/regular\?season=2026-2027"/);
  assert.match(html, /Forfeit result · No match report/);
  assert.match(html, /In progress · Club match/);
  assert.match(html, /Upcoming · Club match/);
});

test("run excludes private games, counts forfeits and never inherits last season's run", () => {
  const html = render(current([
    match("private", 40, { matchType: "private", scoreUs: 0 }),
    match("win", 30), match("forfeit", 20, { forfeit: true }),
    match("loss", 10, { scoreUs: 0 }),
  ]));
  assert.match(html, /<strong>2<\/strong><span>Latest results/);
  assert.equal((html.match(/data-filled="true"/g) ?? []).length, 2);
  assert.match(html, /Based on available competitive results/);
});

test("stale data stays useful with a concise delay notice, not a connection banner", () => {
  const html = render(current([match("win", 10)], "stale"));
  assert.match(html, /<strong>1<\/strong><span>Last saved results/);
  assert.match(html, /Showing the last available results. Newer scores may be delayed/);
  assert.match(html, /Open match report/);
});

test("boards are independently labelled, bounded and keep matches accessible without JS", () => {
  const html = render(current(Array.from({ length: 15 }, (_, i) => match(`current-${i}`, i))),
    Array.from({ length: 20 }, (_, i) => match(`old-${i}`, i)));
  assert.equal((section(html, "results").match(/class="hub-match-row"/g) ?? []).length, 10);
  assert.equal((section(html, "archive").match(/class="hub-match-row"/g) ?? []).length, 6);
  assert.match(html, /1–10 of 15/);
  assert.match(html, /1–6 of 20/);
  assert.equal((html.match(/aria-label="Page 2"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 2);
  assert.equal((html.match(/disabled=""[^>]*>← Previous/g) ?? []).length, 2);
  assert.match(html, /for="hub-search-current"/);
  assert.match(html, /for="hub-search-archive"/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 2);
  assert.equal((html.match(/role="status"/g) ?? []).length, 4);
});

test("display result classification agrees with win-run handling for invalid scores", () => {
  for (const value of [null, NaN, Infinity, -1]) {
    assert.equal(getResult(match("bad", 1, { scoreUs: value })), null);
    assert.equal(getResult(match("bad", 1, { scoreThem: value })), null);
  }
  assert.equal(getResult(match("shutout", 1, { scoreThem: 0 })), "W");
});


test("latest result uses the real B logo and report links opt into a same-page dialog", () => {
  const html = render(current([match("latest", 1)]));
  assert.match(html, /Bardownski B logo/);
  assert.match(html, /B-logo.png/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html, />BD<|<dialog/);
});
