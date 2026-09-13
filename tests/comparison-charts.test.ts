import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRadarAxes,
  radarMetrics,
  numericDomain,
  normalizeValue,
  buildScatterPoints,
  buildTrend,
  contiguousSegments,
  CHART_VIEWS,
} from "../src/lib/comparison-charts";
import {
  comparisonValue,
  COMPARISON_METRICS,
  formatComparisonValue,
  type ComparisonSeason,
} from "../src/lib/player-comparison";

const old: ComparisonSeason = {
  id: "2023",
  label: "2023-2024",
  date: "old",
  skater: [
    {
      name: "MATT",
      games: 10,
      values: { points: 100, goals: 40, assists: 60, plusMinus: -20, hits: 0 },
    },
    {
      name: "DYLAN",
      games: 20,
      values: { points: 120, goals: 60, assists: 60, plusMinus: 30, hits: 200 },
    },
  ],
  goalie: [
    {
      name: "RYDER",
      games: null,
      values: { saves: 500, savePct: 74.6, shutouts: 3 },
    },
  ],
};
const archive: ComparisonSeason = {
  id: "2025",
  label: "2025-2026",
  date: "final",
  skater: [
    {
      name: "MATT",
      games: 30,
      values: {
        points: 150,
        goals: 50,
        assists: 100,
        plusMinus: 20,
        hits: 300,
      },
    },
    {
      name: "DYLAN",
      games: 20,
      values: {
        points: 300,
        goals: 100,
        assists: 200,
        plusMinus: -50,
        hits: 600,
      },
    },
  ],
  goalie: [
    {
      name: "RYDER",
      games: 50,
      values: { saves: 600, savePct: 80, shutouts: 0 },
    },
  ],
};
const middle: ComparisonSeason = {
  id: "2024",
  label: "2024-2025",
  date: "gap",
  skater: [],
  goalie: [],
};
const live: ComparisonSeason = {
  id: "2026–2027", label: "2026-2027", date: "2026-09-13T06:05:00Z",
  skater: [{ name: "MATT", games: 5, values: { points: 10, goals: 4, assists: 6, plusMinus: -2, hits: 0 } }],
  goalie: [{ name: "RYDER", games: 5, values: { saves: 50, savePct: 80, shutouts: 0 } }],
};
const seasons = [live, archive, old, middle];
const before = JSON.stringify(seasons);
assert.deepEqual(
  CHART_VIEWS.map((v) => v.id),
  ["radar", "bars", "scatter", "trend"],
);
assert.deepEqual(
  radarMetrics("skater").map((m) => m.key),
  ["points", "goals", "assists", "plusMinus", "hits"],
);
assert.deepEqual(
  radarMetrics("goalie").map((m) => m.key),
  ["saves", "savePct", "shutouts", "games"],
);
let axes = buildRadarAxes(
  archive.skater[0],
  old.skater[0],
  archive,
  old,
  "skater",
  "totals",
);
assert.deepEqual(
  axes[0].domain,
  { min: 0, max: 300 },
  "Use both full season cohorts, not just selected players",
);
assert.deepEqual(axes[3].domain, { min: -50, max: 50 });
assert.equal(normalizeValue(-20, axes[3].domain), 0.3);
assert.equal(normalizeValue(0, axes[3].domain), 0.5);
assert.equal(normalizeValue(axes[0].a!, axes[0].domain), 0.5);
axes = buildRadarAxes(
  archive.skater[0],
  old.skater[0],
  archive,
  old,
  "skater",
  "per-game",
);
assert.equal(axes[0].a, 5);
assert.equal(axes[0].b, 10);
assert.equal(axes[0].domain.max, 15);
const goalieAxes = buildRadarAxes(
  archive.goalie[0],
  old.goalie[0],
  archive,
  old,
  "goalie",
  "per-game",
);
assert.equal(goalieAxes[0].a, 12);
assert.equal(goalieAxes[0].b, null);
assert.equal(goalieAxes[1].b, 74.6);
assert.equal(goalieAxes[3].a, 50);
assert.equal(goalieAxes[3].b, null);
assert.equal(
  comparisonValue(archive.goalie[0], radarMetrics("goalie")[3], "per-game"),
  50,
);
assert.equal(
  formatComparisonValue(50, radarMetrics("goalie")[3], "per-game"),
  "50",
);
assert.deepEqual(numericDomain([null, null]), { min: 0, max: 1 });
assert.deepEqual(numericDomain([0, 0]), { min: 0, max: 1 });
assert.deepEqual(numericDomain([-10, -20], true), { min: -20, max: 20 });
assert.equal(normalizeValue(0, numericDomain([0, 0], true)), 0.5);
assert.deepEqual(numericDomain([Number.NaN, Infinity, null, 20]), {
  min: 0,
  max: 20,
});
const points = buildScatterPoints(
  [archive, archive, old],
  "skater",
  "totals",
  COMPARISON_METRICS.skater[1],
  COMPARISON_METRICS.skater[2],
);
assert.equal(
  points.length,
  4,
  "Deduplicate identical seasons, retain same player across different seasons",
);
assert.ok(points.some((p) => p.id === "2023:MATT"));
assert.ok(points.some((p) => p.id === "2025:MATT"));
assert.equal(
  buildScatterPoints(
    [archive, old],
    "skater",
    "totals",
    COMPARISON_METRICS.skater[5],
    COMPARISON_METRICS.skater[2],
  ).length,
  0,
  "Missing metrics must not become scatter points at zero",
);
const trend = buildTrend(
  seasons,
  "MATT",
  "skater",
  COMPARISON_METRICS.skater[0],
  "totals",
);
assert.deepEqual(
  trend.map((p) => p.season),
  ["2023", "2024", "2025", "2026–2027"],
);
assert.deepEqual(
  trend.map((p) => p.value),
  [100, null, 150, 10],
);
assert.equal(contiguousSegments(trend).length, 2, "Missing season breaks line");
assert.deepEqual(
  contiguousSegments([
    { value: null },
    { value: 0 },
    { value: 2 },
    { value: null },
  ]),
  [[{ value: 0 }, { value: 2 }]],
);
assert.equal(
  buildTrend(
    seasons,
    "ABSENT",
    "skater",
    COMPARISON_METRICS.skater[0],
    "totals",
  ).filter((p) => p.value != null).length,
  0,
);
assert.equal(
  JSON.stringify(seasons),
  before,
  "Never mutate source data while charting",
);
// Current and archived cohorts stay independent, even for the same player.
const livePoints = buildScatterPoints([live, archive, live], "skater", "totals", COMPARISON_METRICS.skater[1], COMPARISON_METRICS.skater[2]);
assert.equal(livePoints.length, 3);
assert.ok(livePoints.some(point => point.id === "2026–2027:MATT"));
assert.ok(livePoints.some(point => point.id === "2025:MATT"));
const currentAxes = buildRadarAxes(live.skater[0], archive.skater[0], live, archive, "skater", "per-game");
assert.equal(currentAxes[0].a, 2);
assert.equal(currentAxes[0].b, 5);
assert.equal(currentAxes[0].domain.max, 15);
const savedLive = { ...live, date: "Last saved snapshot" };
assert.deepEqual(buildRadarAxes(savedLive.skater[0], archive.skater[0], savedLive, archive, "skater", "per-game"), currentAxes,
  "Freshness labeling must not discard or change saved current-season numbers");
assert.deepEqual(buildTrend([archive, { ...live, skater: [] }], "MATT", "skater", COMPARISON_METRICS.skater[0], "totals").map(point => point.value), [150, null],
  "An empty current cohort is a gap, never a copy of the archive");
const charts = readFileSync("src/app/lab/components/ComparisonCharts.tsx", "utf8");
const lab = readFileSync("src/app/lab/components/HeadToHeadCard.tsx", "utf8");
assert.match(lab, /from "\.\/ComparisonCharts"/);
for (const component of ["RadarChart", "GroupedBars", "ScatterChart", "TrendChart", "ComparisonData"])
  assert.ok(charts.includes(`export function ${component}`));
assert.match(lab, /aria-label="Player role"/);
assert.match(lab, /aria-label="Stat basis"/);
assert.match(lab, /aria-label="Chart view"/);
assert.match(lab, /aria-label="Swap players and seasons"/);
assert.match(lab, /label="X axis"/);
assert.match(lab, /label="Y axis"/);
assert.match(lab, /label="Trend metric"/);
assert.match(lab, /missingGP &&/);
assert.match(lab, /same &&/);
assert.match(lab, /!pair \?/);
assert.doesNotMatch(charts, /stats-edition|stats\/components/);
assert.match(charts, /\{`Scatter plot: \$\{xMetric.label\} versus \$\{yMetric.label\}`\}/);
assert.match(charts, /\{`Season trend: \$\{metric.label\}`\}/);
console.log(
  "Charts: shared scales, signed/missing values, goalie GP, scatter deduplication, chronological trends and relocated controls passed.",
);
