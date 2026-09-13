import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { ParsedStats } from "../src/lib/discord";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import { chelstatsToSeasonData } from "../src/lib/chelstats";
import { parseNhl27Snapshot, NHL27_IDENTITY } from "../src/lib/nhl27-api";
import { HOCKEY_SEASON, type HockeySeasonState } from "../src/lib/hockey-season-state";
import { buildChemistryDataset, normalizeChemistryName } from "../src/lib/line-chemistry";
import { buildLinePlayers, lineDraftKey } from "../src/components/lines/line-datasets";
import {
  buildComparisonProfiles,
  buildComparisonRows,
  buildComparisonSeasons,
  comparisonBar,
  comparisonValue,
  COMPARISON_METRICS,
  formatComparisonValue,
  formatSeasonLabel,
} from "../src/lib/player-comparison";

const old: ParsedStats = {
  date: "Archived snapshot",
  roster: [], // Historical data need not have a roster to be selectable.
  points: [{ rank: 1, name: "MATT", value: 100, secondary: 20 }],
  goals: [{ rank: 1, name: "MATT", value: 40, secondary: 20 }],
  assists: [{ rank: 1, name: "MATT", value: 60, secondary: 75 }],
  plusMinus: [
    { rank: 1, name: "MATT", value: -10 },
    { rank: 2, name: "COLIN", value: -20 },
  ],
  hits: [{ rank: 1, name: "MATT", value: 0 }],
  saves: [{ rank: 1, name: "RYDER", value: 500, secondary: 76.9 }],
  shutouts: [{ rank: 1, name: "RYDER", value: 3 }],
  milestones: [],
};
const recent: ParsedStats = {
  ...old,
  date: "Final snapshot",
  points: [{ rank: 1, name: "MATT", value: 120, secondary: 30 }],
  shots: [{ rank: 1, name: "MATT", value: 200 }],
  saves: [{ rank: 1, name: "RYDER", value: 600, secondary: 80, ggp: 50 }],
};
const before = JSON.stringify([old, recent]);
const seasons = buildComparisonSeasons([
  { season: "2025", stats: recent },
  { season: "2024", stats: old },
]);
assert.equal(formatSeasonLabel("2023"), "2023-2024");
assert.equal(formatSeasonLabel("2026–2027"), "2026-2027");
assert.equal(formatSeasonLabel("Unknown"), "Unknown");
assert.deepEqual(
  seasons.map((s) => s.label),
  ["2025-2026", "2024-2025"],
);
assert.deepEqual(
  seasons.map((s) => s.date),
  ["Final snapshot", "Archived snapshot"],
);
const a = seasons[0].skater.find((p) => p.name === "MATT")!;
const b = seasons[1].skater.find((p) => p.name === "MATT")!;
assert.equal(a.values.points, 120);
assert.equal(b.values.points, 100);
assert.equal(
  b.values.shots,
  null,
  "Do not invent zero for unrecorded historical fields",
);
assert.equal(b.values.hits, 0, "Recorded zero must remain available");
assert.ok(
  seasons[1].skater.some((p) => p.name === "COLIN"),
  "Use all stat lists, including plus/minus-only players",
);
const totalRows = buildComparisonRows(a, b, "skater", "totals");
const rateRows = buildComparisonRows(a, b, "skater", "per-game");
assert.equal(totalRows[0].edge, "a");
assert.equal(
  rateRows[0].edge,
  "b",
  "Per-game comparison can reverse the totals edge",
);
assert.deepEqual([rateRows[0].a, rateRows[0].b, rateRows[0].gap], [4, 5, 1]);
assert.equal(
  totalRows.find((r) => r.metric.key === "shots")!.edge,
  "unavailable",
);
assert.equal(totalRows.find((r) => r.metric.key === "hits")!.edge, "tie");
assert.equal(
  rateRows.find((r) => r.metric.key === "shootingPct")!.a,
  20,
  "Percentages must not be divided by GP",
);
assert.ok(
  buildComparisonRows(a, a, "skater", "totals").every(
    (row) => row.edge === "tie" || row.edge === "unavailable",
  ),
);
const goalies = [seasons[0].goalie[0], seasons[1].goalie[0]];
assert.equal(
  goalies[1].name,
  "RYDER",
  "Do not discard goalies with missing GP",
);
assert.equal(goalies[1].games, null);
const goalieRates = buildComparisonRows(
  goalies[0],
  goalies[1],
  "goalie",
  "per-game",
);
assert.equal(goalieRates[0].a, 12);
assert.equal(goalieRates[0].b, null);
assert.equal(
  goalieRates[1].b,
  76.9,
  "Recorded save percentage stays on its supplied 0–100 scale",
);
assert.equal(goalieRates[1].edge, "a");
assert.equal(Number(goalieRates[1].gap!.toFixed(2)), 3.1);
assert.equal(
  comparisonValue({ ...a, games: 0 }, COMPARISON_METRICS.skater[0], "per-game"),
  null,
);
assert.equal(
  comparisonValue(
    { ...a, games: null },
    COMPARISON_METRICS.skater[0],
    "per-game",
  ),
  null,
);
assert.equal(
  comparisonValue(undefined, COMPARISON_METRICS.skater[0], "totals"),
  null,
);
assert.equal(
  formatComparisonValue(null, COMPARISON_METRICS.skater[0], "totals"),
  "—",
);
assert.equal(
  formatComparisonValue(0, COMPARISON_METRICS.skater[0], "per-game"),
  "0.00",
);
assert.equal(
  formatComparisonValue(-10, COMPARISON_METRICS.skater[3], "totals"),
  "-10",
);
assert.equal(
  formatComparisonValue(10, COMPARISON_METRICS.skater[3], "totals"),
  "+10",
);
assert.equal(
  formatComparisonValue(76.9, COMPARISON_METRICS.goalie[1], "per-game"),
  "76.9%",
);
assert.equal(
  buildComparisonRows(
    { ...a, values: { points: 1.234 } },
    { ...b, values: { points: 1.231 } },
    "skater",
    "totals",
  )[0].edge,
  "tie",
);
assert.deepEqual(comparisonBar(-10, 20, true), { left: "25%", width: "25%" });
assert.deepEqual(comparisonBar(20, -10, true), { left: "50%", width: "50%" });
assert.deepEqual(comparisonBar(-20, -10, true), { left: "0%", width: "50%" });
assert.deepEqual(comparisonBar(0, 0), { left: "0%", width: "0%" });
assert.deepEqual(comparisonBar(null, null, true), { left: "50%", width: "0%" });
assert.deepEqual(buildComparisonSeasons([]), []);
assert.deepEqual(
  buildComparisonProfiles({ ...old, saves: [], shutouts: [] }, "goalie"),
  [],
);
assert.equal(
  JSON.stringify([old, recent]),
  before,
  "Comparison must never mutate source data",
);
// Exercise real current-season member/match shapes without any network/storage calls.
const archiveBefore = JSON.stringify(FROZEN_CHELSTATS);
const liveData = parseNhl27Snapshot(JSON.parse(readFileSync("tests/fixtures/nhl27-public.json", "utf8")), "2026-09-13T06:05:00.000Z").data;
const liveBefore = JSON.stringify(liveData);
for (const status of ["connected", "stale"] as const) {
  const state: HockeySeasonState = {
    season: HOCKEY_SEASON, status, data: liveData,
    matches: liveData.matches.map(match => ({ ...match, status: "final" })),
    updatedAt: "2026-09-13T06:05:00.000Z", syncedAt: "2026-09-13T06:06:00.000Z",
    coverage: { storedMatches: liveData.matches.length, totalGames: liveData.clubStats.totalGames },
  };
  const profiles = buildComparisonSeasons([
    chelstatsToSeasonData(state.data.members, { season: state.season, date: state.updatedAt }),
    chelstatsToSeasonData(FROZEN_CHELSTATS.members),
  ]);
  assert.deepEqual(profiles.map(profile => profile.id), ["2026–2027", "2025"]);
  assert.equal(profiles[0].date, state.updatedAt);
  assert.notEqual(profiles[0].skater[0].values.points, profiles[1].skater[0].values.points);
  const chemistry = buildChemistryDataset(state.data.matches, []);
  assert.equal(chemistry.total, liveData.matches.length);
  assert.ok(chemistry.games.every(game => game.source === "full"));
  assert.ok(chemistry.games.every(game => liveData.matches.some(match => match.id === game.id)));
  const pool = buildLinePlayers(state.data.members, chemistry.games, "current");
  for (const member of state.data.members.filter(member => member.gamesPlayed === 0 && member.goalieGP > 0)) {
    const id = normalizeChemistryName(member.username);
    assert.ok(!pool.some(player => player.id === id), "Goalie-only members are not skaters");
  }
}
assert.deepEqual(buildChemistryDataset([], []), { games: [], total: 0, excluded: 0 });
assert.deepEqual(buildLinePlayers([], [], "current"), []);
const observedGame = { id: "observed", timestamp: 1, date: "Saved game", opponent: "Visitors", goalsFor: 2, goalsAgainst: 1, skaters: ["NEW SKATER", "MATT HUT"] };
const goalieOnly = { ...liveData.members[0], username: "Goalie only", gamesPlayed: 0, goalieGP: 5, position: "G" };
assert.deepEqual(buildLinePlayers([goalieOnly], [observedGame], "current").map(player => player.id), ["NEW SKATER", "MATT HUT"],
  "Observed skaters not in current member totals remain selectable");
assert.ok(buildLinePlayers([goalieOnly], [{ ...observedGame, skaters: [normalizeChemistryName(goalieOnly.username)] }], "current").length,
  "An observed skater appearance takes precedence over a stale season role");
const archiveChemistry = buildChemistryDataset([]);
assert.equal(archiveChemistry.total, 75);
assert.equal(archiveChemistry.excluded, 3);
assert.equal(archiveChemistry.games.length, 72);
const archivedPlayers = buildLinePlayers(FROZEN_CHELSTATS.members, archiveChemistry.games, "archive");
for (const member of FROZEN_CHELSTATS.members) assert.ok(archivedPlayers.some(player => player.id === normalizeChemistryName(member.username)));
const currentIdentity = { id: NHL27_IDENTITY.storageKey, season: HOCKEY_SEASON };
assert.notEqual(lineDraftKey(currentIdentity), lineDraftKey({ ...currentIdentity, season: "2025–2026" }));
assert.notEqual(lineDraftKey(currentIdentity), lineDraftKey({ ...currentIdentity, id: "another-club" }));
assert.notEqual(lineDraftKey(currentIdentity), "bardownski-line-draft-v1");
assert.equal(JSON.stringify(FROZEN_CHELSTATS), archiveBefore);
assert.equal(JSON.stringify(liveData), liveBefore);

const page = readFileSync("src/app/lab/page.tsx", "utf8");
const statsPage = readFileSync("src/app/stats/page.tsx", "utf8");
const display = readFileSync("src/app/stats/components/StatsDisplay.tsx", "utf8");
const client = readFileSync("src/app/stats/StatsClient.tsx", "utf8");
assert.equal((page.match(/<HeadToHeadCard\s/g) ?? []).length, 1);
assert.doesNotMatch(statsPage, /HeadToHeadCard|ComparisonCharts|comparison-lab|buildComparisonSeasons/);
assert.doesNotMatch(display, /HeadToHeadCard|stats-arena/);
assert.doesNotMatch(client, /children|HeadToHeadCard/);
assert.match(statsPage, /<StatsClient seasons=\{archives\}/);
assert.match(page, /<h1>Player lab<\/h1>/);
assert.match(page, /href="#comparison"/);
assert.match(page, /href="#lines"/);
const plannerStart = page.indexOf("<LineSeasonSelector");
assert.ok(plannerStart > page.indexOf("<HeadToHeadCard"), "Planner belongs below comparison");
assert.match(page, /fetchChannelMessages\(\)/);
assert.match(page, /getHockeySeason\(\)/);
assert.match(page, /parseAllSeasons\(messages\)\.filter\(\(s\) => s\.season !== "2025"\)/);
assert.match(page, /chelstatsToSeasonData\(FROZEN_CHELSTATS\.members\)/);
for (const consumer of [page, statsPage]) {
  assert.match(consumer, /season\.status === "connected" \|\| season\.status === "stale"/);
  assert.match(consumer, /<TrackingNotice state=\{season\}/);
}
assert.match(page, /season\.status === "awaiting-setup" \? HOCKEY_SEASON : undefined/);
assert.match(page, /\.\.\.\(currentStats \? \[currentStats\] : \[\]\),\s*\.\.\.archives/);
assert.match(page, /seasons=\{comparisonSeasons\}/);
assert.match(page, /pendingSeason=\{pendingSeason\}/);
assert.match(page, /buildChemistryDataset\(season\.data\?\.matches \?\? \[\], \[\]\)/);
assert.match(page, /buildChemistryDataset\(archivedMatches\)/);
assert.match(page, /buildLinePlayers\(members, currentChemistry\.games, "current"\)/);
const selector = readFileSync("src/components/lines/LineSeasonSelector.tsx", "utf8");
const planner = readFileSync("src/components/lines/LinePlanner.tsx", "utf8");
assert.match(selector, /useState\(current\.id\)/);
assert.match(selector, /<LinePlanner key=\{dataset\.id\} dataset=\{dataset\}/);
assert.doesNotMatch(planner, /366|2025|pendingSeason|bardownski-line-draft-v1/);
assert.match(planner, /draft\.datasetId !== dataset\.id \|\| draft\.season !== season/);
for (const path of ["src/app/matches/MatchesClient.tsx", "src/components/season/SeasonTracking.tsx", "src/components/lines/LineSeasonSelector.tsx", "src/components/lines/LinePlanner.tsx"]) {
  assert.doesNotMatch(readFileSync(path, "utf8"), /from "@\/lib\/hockey-season"/);
}
assert.doesNotMatch(page, /fetchChelstatsData|fetchAndStoreMatches|StatsClient|stats\.css/);
for (const oldPath of [
  "src/app/stats/components/HeadToHeadCard.tsx",
  "src/app/stats/components/ComparisonCharts.tsx",
  "src/app/stats/comparison-lab.css",
]) assert.equal(existsSync(oldPath), false, `${oldPath} must be physically moved`);
const labCss = readFileSync("src/app/lab/comparison-lab.css", "utf8");
assert.doesNotMatch(labCss, /stats-edition|max-width:\s*1600px|gradient\(/);
assert.match(
  labCss,
  /\.lab-console\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;/,
);
const pageCss = readFileSync("src/app/lab/lab.css", "utf8");
for (const color of ["#006775", "#320d48", "#f0efeb", "#0b0c0d"])
  assert.ok(pageCss.includes(color));
assert.match(pageCss, /barlow-condensed\.ttf/);
const lab = readFileSync("src/app/lab/components/HeadToHeadCard.tsx", "utf8");
assert.match(lab, /id="comparison"/);
assert.match(lab, /pendingSeason &&/);
assert.match(lab, /tracking is pending/);
assert.match(lab, /— means not recorded, never zero/);
assert.match(lab, /useState<ChartView>\("radar"\)/);
for (const component of [
  "RadarChart",
  "GroupedBars",
  "ScatterChart",
  "TrendChart",
])
  assert.ok(lab.includes(`<${component}`));
const tracking = readFileSync("src/components/season/SeasonTracking.tsx", "utf8");
for (const status of ["connected", "stale", "unavailable", '"awaiting-setup"']) assert.ok(tracking.includes(`${status}:`));
assert.match(tracking, /state\?: HockeySeasonState/);
assert.match(tracking, /state\.updatedAt/);
assert.match(tracking, /state\.syncedAt/);
assert.match(tracking, /state\.coverage\.storedMatches/);
const matchesClient = readFileSync("src/app/matches/MatchesClient.tsx", "utf8");
assert.match(matchesClient, /season="2026-2027"/);
assert.match(matchesClient, /season="2025-2026"/);
assert.match(matchesClient, /\?season=\$\{season\}/);
assert.doesNotMatch(matchesClient, /\/#next|matches\.slice\(/);
const detail = readFileSync("src/app/matches/[id]/page.tsx", "utf8");
assert.match(detail, /requestedSeason === "2025-2026" \? null : await getHockeySeason/);
assert.match(detail, /requestedSeason === "2026-2027" \|\| currentMatch \? \[\] : await getAllMatchesForRecords/);
console.log(
  "Player comparison: independent seasons, rates, missing data, signed values and standalone /lab ownership and honest season boundaries passed.",
);
