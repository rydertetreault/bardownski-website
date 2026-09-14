import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { renderHome } from "../src/components/homepage/views";
import { initHomeInteractions } from "../src/components/homepage/interactions";
import { homeArchive } from "../src/components/homepage/home-data";
import type { ChelstatsData, ClubMatch } from "../src/lib/chelstats";
import type { HockeyAwards, SeasonMvpEntry, WeeklyAwardEntry, WeeklyAwards } from "../src/lib/hockey-awards";
import { HOCKEY_SEASON, type HockeySeasonState } from "../src/lib/hockey-season-state";
import { getDisplayName } from "../src/lib/nicknames";
import { articles } from "../src/lib/news";
import { featureArticles } from "../src/lib/featured-news";
import { SEASON_REVEAL } from "../src/lib/season-reveal";
import type { Match } from "../src/types";

// Exercise the server renderer and real delegated click guard without fetching a
// tracker, reading Redis, depending on today's week, or starting a browser.
interface Element {
  tagName: string;
  textContent: string;
  innerHTML: string;
  attributes: Record<string, string>;
  dataset: Record<string, string>;
  open: boolean;
  querySelector(selector: string): Element | null;
  querySelectorAll(selector: string): Element[];
  closest(selector: string): Element | null;
  getAttribute(name: string): string | undefined;
  hasAttribute(name: string): boolean;
  showModal(): void;
}
const require = createRequire(import.meta.url);
const { parse } = require("next/dist/compiled/node-html-parser") as { parse(markup: string): Element };
const one = (root: Element, selector: string) => {
  const found = root.querySelector(selector);
  assert.ok(found, `Missing rendered element: ${selector}`);
  return found;
};
const text = (root: Element, selector: string) => one(root, selector).textContent.trim();
const render = (season: HockeySeasonState | null) => parse(renderHome([], season));
const AS_OF = "2026-09-16T18:00:00.000Z";
function match(id: string, day: number, overrides: Partial<Match> = {}): Match {
  return { id, timestamp: Date.UTC(2026, 8, day, 12) / 1000, date: `September ${day}, 2026`,
    opponent: `Current opponent ${id}`, homeAway: "home", scoreUs: 4, scoreThem: 1,
    status: "final", matchType: "regular", ...overrides };
}
function weeklyPlayer(overrides: Partial<WeeklyAwardEntry> = {}): WeeklyAwardEntry {
  return { playerId: "current-skater", name: "  mHut8  ", position: "F", isGoalie: false,
    games: 4, score: 175.4, rank: 1, eligible: true, goals: 7, assists: 6, points: 13,
    saves: 0, shotsAgainst: 0, savePct: 0, gaa: 0, shutouts: 0, wins: 3, ...overrides };
}
function mvp(overrides: Partial<SeasonMvpEntry> & Pick<SeasonMvpEntry, "name" | "position" | "score" | "rank" | "games">): SeasonMvpEntry {
  return { isGoalie: false, goals: 0, assists: 0, points: 0, saves: 0, savePct: 0, gaa: 0, shutouts: 0, ...overrides };
}
function week(leaders: WeeklyAwardEntry[], complete = false): WeeklyAwards {
  return { start: complete ? "2026-09-07T00:00:00.000Z" : "2026-09-14T00:00:00.000Z",
    end: complete ? "2026-09-14T00:00:00.000Z" : "2026-09-21T00:00:00.000Z",
    status: complete ? "complete" : "in-progress", games: leaders.length ? 4 : 0, minimumGames: 3,
    standings: leaders, leaders, winners: complete ? leaders.filter(p => p.eligible) : [],
    coverage: { inputGames: 4, acceptedGames: 4, skippedGames: 0, acceptedAppearances: 4,
      skippedAppearances: 0, reasons: {}, samples: [] } };
}
function awards(): HockeyAwards {
  return { asOf: AS_OF, currentWeek: week([weeklyPlayer()]),
    lastCompletedWeek: week([weeklyPlayer({ playerId: "previous-winner", name: "s1obbyrobby" })], true),
    seasonMvp: [
      mvp({ name: "Julio 3026", position: "F", score: 91.234, rank: 1, games: 8, goals: 12, assists: 9, points: 21 }),
      mvp({ name: "Rydayro", position: "G", isGoalie: true, score: 91.234, rank: 1, games: 6, saves: 120, savePct: 84.25, gaa: 2.5, shutouts: 2 }),
      mvp({ name: "oP wet", position: "D", score: 74, rank: 3, games: 9, goals: 3, assists: 8, points: 11 }),
      mvp({ name: "Not in preview", position: "F", score: 10, rank: 4, games: 5 }),
    ] };
}
type Connected = Extract<HockeySeasonState, { status: "connected" | "stale" }>;
function current(matches: Match[] = [], overrides: Partial<Connected> = {}): Connected {
  const rawMatches: ClubMatch[] = matches.map(m => ({ ...m, matchType: m.matchType ?? "regular",
    scoreUs: m.scoreUs ?? 0, scoreThem: m.scoreThem ?? 0, shotsUs: 15, shotsThem: 12,
    toaUs: "3:00", toaThem: "2:00", passCompUs: 70, passCompThem: 65,
    result: "", players: [], threeStars: null }));
  const data: ChelstatsData = { matches: rawMatches, members: [], clubStats: {
    record: "0-0-0", wins: 0, losses: 0, otl: 0, goals: 0, goalsAgainst: 0,
    goalsPerGame: 0, goalsAgainstPerGame: 0, totalGames: matches.length, seasons: 0,
    titlesWon: 0, currentDivision: 0, bestDivision: 0, starLevel: 0, overallRating: 0,
  } };
  return { season: HOCKEY_SEASON, status: "connected", updatedAt: AS_OF, syncedAt: AS_OF,
    coverage: { storedMatches: matches.length, totalGames: matches.length }, matches, data,
    awards: awards(), ...overrides };
}
function unavailable(status: "unavailable" | "awaiting-setup" = "unavailable"): HockeySeasonState {
  return { season: HOCKEY_SEASON, status, data: null, matches: [], awards: null,
    syncedAt: null, updatedAt: null, coverage: { storedMatches: 0, totalGames: null },
    error: "Upstream test failure must not be displayed" };
}
function assertCurrentOnly(root: Element) {
  assert.equal(root.querySelectorAll(".season-status, [data-match], [data-games]").length, 0,
    "No tracking banner or archive match modal triggers in the homepage");
  for (const id of ["results", "weekly", "standings"]) {
    const section = one(root, `#${id}`);
    assert.ok(text(section, ".eyebrow").includes(HOCKEY_SEASON));
    assert.ok(!section.textContent.includes(homeArchive.season), `${id}: no archive season label`);
    assert.equal(section.querySelectorAll("[data-player], [data-weekly], [data-standings]").length, 0,
      `${id}: never open an archive player/weekly/MVP dialog`);
  }
}
function stats(root: Element) {
  return one(root, "#weekly").querySelectorAll(".mini-stats > div")
    .map(stat => [text(stat, "small"), text(stat, "strong")]);
}

// Do not copy the renderer's filter/sort into the expectation: the incoming list
// is deliberately unordered and newer private/live/upcoming rows must not crowd
// any of the four valid results out of the preview.
test("current results are the latest four finite-timestamp public finals, newest first, without mutating input", () => {
  const season = current([
    match("oldest", 1), match("third", 12, { matchType: "finals", scoreUs: 0, scoreThem: 1 }),
    match("private", 20, { matchType: "private" }), match("latest", 16, { scoreUs: 12, scoreThem: 3 }),
    match("upcoming", 21, { status: "upcoming" }), match("fourth", 10, { scoreUs: 2, scoreThem: 2 }),
    match("invalid", 22, { timestamp: NaN }), match("second", 15, { scoreUs: 2, scoreThem: 4 }),
    match("live", 23, { status: "live" }), match("infinite", 24, { timestamp: Infinity }),
  ]);
  const before = structuredClone(season);
  const root = render(season);
  assertCurrentOnly(root);
  assert.deepEqual(root.querySelectorAll("#results .result-row").map(row => ({
    tag: row.tagName, opponent: text(row, ".result-team b"), date: text(row, ".result-team small"),
    score: text(row, "strong"), result: text(row, ".result-letter"), href: row.getAttribute("href"),
  })), [
    { tag: "A", opponent: "Current opponent latest", date: "September 16, 2026", score: "12–3", result: "W", href: "/matches/latest?season=2026-2027" },
    { tag: "A", opponent: "Current opponent second", date: "September 15, 2026", score: "2–4", result: "L", href: "/matches/second?season=2026-2027" },
    { tag: "A", opponent: "Current opponent third", date: "September 12, 2026", score: "0–1", result: "L", href: "/matches/third?season=2026-2027" },
    { tag: "A", opponent: "Current opponent fourth", date: "September 10, 2026", score: "2–2", result: "T", href: "/matches/fourth?season=2026-2027" },
  ]);
  assert.equal(one(root, "#results .text-link").getAttribute("href"), "/matches");
  assert.deepEqual(season, before, "Rendering must not reorder or rewrite the shared tracker snapshot");
});

test("short feeds are not padded with saved archive games; forfeits and unknown scores remain honest", () => {
  const root = render(current([
    match("forfeit-1", 16, { forfeit: true, scoreUs: null, scoreThem: null }),
    match("one-score", 15, { scoreUs: 0, scoreThem: null }),
  ]));
  const rows = root.querySelectorAll("#results .result-row");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => [text(row, "strong"), text(row, ".result-letter"), row.getAttribute("href")]), [
    ["—–—", "—", "/matches#results"], ["0–—", "—", "/matches/one-score?season=2026-2027"],
  ]);
  assert.match(text(rows[0], ".result-team small"), /forfeit/i);
  assertCurrentOnly(root);
});

test("current match IDs are encoded, opponent/date are inert, and native clicks never open archive dialogs", () => {
  const payload = `A & B "quoted" <img data-injected="yes" src=x onerror="alert(1)">`;
  const id = `current/1?season=2025-2026&"#<id>`;
  const root = render(current([match(id, 16, { opponent: payload, date: payload })]));
  const row = one(root, "#results a.result-row");
  assert.equal(row.getAttribute("href"), `/matches/${encodeURIComponent(id)}?season=2026-2027`);
  assert.equal(text(row, ".result-team b"), payload);
  assert.equal(text(row, ".result-team small"), payload);
  assert.equal(root.querySelectorAll("[data-injected], [onerror], script").length, 0);
  const modal = one(root, "dialog");
  modal.open = false;
  modal.showModal = () => { modal.open = true; };
  for (const element of root.querySelectorAll("*")) {
    Object.defineProperty(element, "dataset", { get: () => Object.fromEntries(Object.entries(element.attributes)
      .filter(([key]) => key.startsWith("data-")).map(([key, value]) => [key.slice(5), value])) });
  }
  type Click = { target: Element; button: number; defaultPrevented: boolean; preventDefault(): void };
  let click: ((event: Click) => void) | undefined;
  initHomeInteractions({ active: true, document: { body: root,
    querySelector: root.querySelector.bind(root), querySelectorAll: root.querySelectorAll.bind(root),
    addEventListener(type: string, listener: (event: Click) => void) { if (type === "click") click = listener; },
  }, listen() {}, onDispose() {}, MutationObserver: class { observe() {} disconnect() {} } }, { refresh() {} }, []);
  assert.ok(click, "Use the production delegated handler");
  for (const target of [row, one(row, ".result-team b"), one(root, "#results .text-link")]) {
    const event = { target, button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      preventDefault() { this.defaultPrevented = true; } };
    click(event);
    assert.equal(event.defaultPrevented, false, "Leave navigation to the real current-season matches route");
    assert.equal(modal.open, false, "Never reinterpret a current result as an archive array index");
    assert.equal(one(modal, ".modal-body").innerHTML, "");
  }
});

for (const [label, season] of [
  ["null default", null], ["unavailable", unavailable()], ["awaiting setup", unavailable("awaiting-setup")],
  ["connected without awards", current([], { awards: null })],
  ["connected with an empty week", current([], { awards: { ...awards(), currentWeek: week([]), lastCompletedWeek: week([], true), seasonMvp: [] } })],
] as const) {
  test(`${label}: empty current sections never fall back to previous results or award winners`, () => {
    const root = render(season);
    assertCurrentOnly(root);
    assert.equal(root.querySelectorAll("#results .result-row, #weekly .mini-stats strong, #standings details, .weekly-previous-winner").length, 0);
    assert.match(text(root, "#results"), season?.status === "unavailable" ? /temporarily unavailable/i : /no results yet this season/i);
    assert.equal(text(root, "#weekly h2"), "Awaiting the first announcement.");
    assert.doesNotMatch(text(root, "#weekly"), /leader|projected|provisional|in progress/i, "Never project a winner");
    assert.equal(one(root, "#weekly img").getAttribute("src"), "/images/homepage/player-purple.webp");
    assert.equal(text(root, "#standings .rank-leader-note strong"), "Awaiting eligible players");
    assert.match(text(root, "#standings"), /no eligible rankings yet this season/i);
    assert.ok(!root.textContent.includes("Upstream test failure"), "Internal source error is not public copy");
    for (const id of ["results", "weekly", "standings"]) {
      for (const player of homeArchive.players) assert.ok(!text(root, `#${id}`).includes(player.name));
      for (const game of homeArchive.matches) assert.ok(!text(root, `#${id}`).includes(game.opponent));
    }
  });
}

test("stale state retains supplied current results and awards with local freshness notes, not a status banner", () => {
  const season = current([match("saved-current", 15)], { status: "stale" });
  const root = render(season);
  assertCurrentOnly(root);
  assert.equal(text(root, "#results .result-team b"), "Current opponent saved-current");
  assert.match(text(root, "#results"), /latest available results/i);
  assert.equal(text(root, "#weekly h2"), getDisplayName(season.awards!.lastCompletedWeek.winners[0].name));
  assert.match(text(root, "#weekly"), /latest saved announcement/i);
  assert.match(text(root, "#standings"), /last saved current-season totals/i);
  assert.deepEqual(stats(root), [["GAMES", "4"], ["GOALS", "7"], ["ASSISTS", "6"], ["POINTS", "13"]]);
});

test("a wrong-season object cannot relabel archived results or awards as current", () => {
  // Simulate an incorrectly wired caller at the JS renderer boundary.
  const wrongSeason = { ...current([match("must-not-appear", 16)]), season: "2025–2026" } as unknown as HockeySeasonState;
  const root = render(wrongSeason);
  assertCurrentOnly(root);
  assert.equal(root.querySelectorAll("#results .result-row, #standings details, #weekly .mini-stats strong, .weekly-previous-winner").length, 0);
  assert.equal(text(root, "#weekly h2"), "Awaiting the first announcement.");
  assert.ok(!root.textContent.includes("must-not-appear"));
});

test("announced weekly winner and MVP preview use supplied role stats, ranks and shared nickname resolution", () => {
  const season = current();
  const before = structuredClone(season);
  const root = render(season);
  const supplied = season.awards!;
  assertCurrentOnly(root);
  // The announced winner is last week's completed award, never the in-progress leader.
  assert.equal(text(root, "#weekly h2"), getDisplayName(supplied.lastCompletedWeek.winners[0].name));
  assert.ok(!text(root, "#weekly").includes(getDisplayName(supplied.currentWeek.leaders[0].name)));
  assert.doesNotMatch(text(root, "#weekly"), /leader|projected|provisional|in progress/i);
  assert.match(text(root, "#weekly .eyebrow"), /^PLAYER OF THE WEEK \/ 2026–2027$/);
  assert.match(text(root, "#weekly"), /Week of September 7 – September 13/);
  assert.deepEqual(stats(root), [["GAMES", "4"], ["GOALS", "7"], ["ASSISTS", "6"], ["POINTS", "13"]]);
  assert.equal(root.querySelectorAll(".weekly-previous-winner").length, 0);
  assert.equal(one(root, "#weekly img").getAttribute("src"), "/images/highlights/sr1.webp", "Announced winner gets their own photo");
  assert.match(one(root, "#weekly img").getAttribute("alt")!, /Slobby Robby/);
  assert.equal(one(root, "#weekly .text-link").getAttribute("href"), "/stats#weekly-honors");
  const rows = root.querySelectorAll("#standings details");
  assert.equal(rows.length, 3, "Only the supplied top three, not the archive top three");
  assert.deepEqual(rows.map(row => text(row, ".rank-number")), ["01", "01", "03"]);
  assert.ok(rows.every(row => !row.querySelector("summary > strong")), "Totals appear once, in the expanded panel, not repeated on the summary row");
  assert.deepEqual(rows.map(row => row.querySelectorAll(".rank-stat-line dd").map(dd => dd.textContent.trim())), [["8", "12", "9", "21"], ["6", "84.3%", "2.50", "2"], ["9", "3", "8", "11"]]);
  assert.ok(!root.querySelector("#standings")!.textContent.includes("91.23"), "Model scores are not shown");
  assert.deepEqual(rows.map(row => text(row, "summary b")), [`${getDisplayName("Julio 3026")}F · 8 GP`, `${getDisplayName("Rydayro")}G · 6 GP`, `${getDisplayName("oP wet")}D · 9 GP`]);
  assert.deepEqual(rows.map(row => row.querySelectorAll(".rank-stat-line dt").map(dt => dt.textContent.trim())), [["GP", "G", "A", "PTS"], ["GP", "SV%", "GAA", "SO"], ["GP", "G", "A", "PTS"]]);
  assert.deepEqual(rows.map(row => row.hasAttribute("open")), [true, false, false]);
  assert.ok(rows.every(row => row.getAttribute("name") === "mvp-preview"), "Native exclusive disclosures work without enhancement");
  assert.equal(text(root, "#standings .rank-leader-note strong"), getDisplayName(supplied.seasonMvp[0].name));
  assert.match(text(rows[1], ".rank-details p"), /Goalie totals over 6 games/);
  assert.ok(rows.every(row => one(row, ".rank-details a").getAttribute("href") === "/stats#numbers"));
  assert.equal(one(root, "#standings .rank-footer a").getAttribute("href"), "/stats#standings");
  assert.match(text(root, "#standings .fine"), /not votes or odds/i);
  assert.deepEqual(season, before, "Nicknames are presentation-only; never rewrite source identities");
});

test("in-progress leaders are never announced; tied goalie winners share the honor with goalie stats and photo", () => {
  const supplied = awards();
  const goalie = weeklyPlayer({ playerId: "current-goalie", name: "Rydayro", position: "G", isGoalie: true,
    games: 3, eligible: true, goals: 0, assists: 0, points: 0, saves: 61, shotsAgainst: 64,
    savePct: 61 / 64 * 100, gaa: 1.5, shutouts: 1, wins: 1 });
  const tie = weeklyPlayer({ playerId: "tied", name: "u4 Pablo", games: 3, eligible: true });
  supplied.currentWeek = week([goalie, tie]);
  supplied.lastCompletedWeek = week([], true);
  const open = render(current([], { awards: supplied }));
  assert.equal(text(open, "#weekly h2"), "Awaiting the first announcement.");
  assert.equal(open.querySelectorAll("#weekly .mini-stats strong").length, 0);
  supplied.lastCompletedWeek = week([goalie, tie], true);
  const root = render(current([], { awards: supplied }));
  assert.equal(text(root, "#weekly h2"), [goalie, tie].map(p => getDisplayName(p.name)).join(" / "));
  assert.match(text(root, "#weekly"), /Shared honors/);
  assert.deepEqual(stats(root), [["GAMES", "3"], ["SV%", "95.3%"], ["SHUTOUTS", "1"]]);
  assert.equal(one(root, "#weekly img").getAttribute("src"), "/images/highlights/r2.webp");
  const unknown = awards();
  unknown.lastCompletedWeek = week([weeklyPlayer({ name: "New goalie", position: "G", isGoalie: true, games: 3 })], true);
  assert.equal(one(render(current([], { awards: unknown })), "#weekly img").getAttribute("src"), "/images/homepage/goalie-purple.webp", "Unknown players never borrow another player's photo");
  assert.equal(root.querySelectorAll(".weekly-previous-winner").length, 0);
});

test("unknown current weekly/MVP identities remain literal text, never executable markup", () => {
  const payload = `Unknown & "player" <img data-injected="yes" src=x onerror="alert(1)">`;
  const supplied = awards();
  supplied.currentWeek = week([weeklyPlayer({ name: payload })]);
  supplied.lastCompletedWeek = week([weeklyPlayer({ name: payload })], true);
  supplied.seasonMvp = [{ ...supplied.seasonMvp[0], name: payload, position: payload }];
  const root = render(current([], { awards: supplied }));
  assert.equal(text(root, "#weekly h2"), payload);
  assert.equal(one(root, "#weekly img").getAttribute("src"), "/images/homepage/player-purple.webp");
  assert.equal(text(root, "#standings .rank-leader-note strong"), payload);
  assert.equal(text(root, "#standings summary b small"), `${payload} · 8 GP`);
  assert.equal(root.querySelectorAll("[data-injected], [onerror], script, iframe").length, 0);
});

test("with populated current data the reveal remains one News story, never a hero, status banner or highlight player", () => {
  const root = parse(renderHome(featureArticles(articles).slice(0, 3), current([match("current", 16)])));
  assertCurrentOnly(root);
  const links = root.querySelectorAll(`[data-news="${SEASON_REVEAL.articleId}"]`);
  assert.equal(links.length, 1);
  assert.ok(links[0].closest("#news"));
  assert.equal(links[0].getAttribute("href"), `/news/${SEASON_REVEAL.articleId}`);
  const posters = root.querySelectorAll(`img[src="${SEASON_REVEAL.poster}"]`);
  assert.equal(posters.length, 1);
  assert.ok(posters[0].closest("#news"));
  assert.equal(root.querySelectorAll('#season-reveal, .home-reveal, [data-video="reveal"], video, source').length, 0);
  assert.equal(text(root, ".cinema-hero h1"), "HOME ICE.THE NEXT SHIFT.");
  assert.equal(one(root, ".cinema-backdrop img").getAttribute("src"), "/images/homepage/history-2022.webp");
  assert.deepEqual(root.querySelectorAll("#highlights [data-video]").map(button => button.getAttribute("data-video")), ["finish", "crease"]);
});
