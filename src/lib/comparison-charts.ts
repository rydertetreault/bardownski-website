import {
  comparisonValue,
  COMPARISON_METRICS,
  type CompareBasis,
  type CompareRole,
  type ComparisonMetric,
  type ComparisonProfile,
  type ComparisonSeason,
  type MetricKey,
} from "./player-comparison";

export type ChartView = "radar" | "bars" | "scatter" | "trend";
export const CHART_VIEWS: {
  id: ChartView;
  label: string;
  description: string;
}[] = [
  { id: "radar", label: "Radar", description: "The shape of their game." },
  {
    id: "bars",
    label: "Grouped bars",
    description: "Every category. Head to head.",
  },
  {
    id: "scatter",
    label: "Scatter plot",
    description: "Where they stand in the field.",
  },
  {
    id: "trend",
    label: "Season trend",
    description: "Follow the game through the years.",
  },
];
export const GOALIE_GAMES: ComparisonMetric = {
  key: "games",
  label: "Goalie games",
  short: "GP",
};
export const RADAR_KEYS: Record<CompareRole, MetricKey[]> = {
  skater: ["points", "goals", "assists", "plusMinus", "hits"],
  goalie: ["saves", "savePct", "shutouts", "games"],
};
export function radarMetrics(role: CompareRole): ComparisonMetric[] {
  return RADAR_KEYS[role].map((key) =>
    key === "games"
      ? GOALIE_GAMES
      : COMPARISON_METRICS[role].find((metric) => metric.key === key)!,
  );
}
export function metricUnit(
  metric: ComparisonMetric,
  basis: CompareBasis,
): string {
  return metric.percent
    ? "%"
    : basis === "per-game" && metric.key !== "games"
      ? "/ GP"
      : "total";
}
export type NumericDomain = { min: number; max: number };
export function numericDomain(
  values: (number | null)[],
  signed = false,
): NumericDomain {
  const valid = values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  const max = Math.max(...valid.map(Math.abs), 0);
  if (signed) return { min: -(max || 1), max: max || 1 };
  return { min: Math.min(0, ...valid), max: Math.max(0, ...valid) || 1 };
}
export function normalizeValue(value: number, domain: NumericDomain): number {
  return Math.max(
    0,
    Math.min(1, (value - domain.min) / (domain.max - domain.min)),
  );
}
export type RadarAxis = {
  metric: ComparisonMetric;
  domain: NumericDomain;
  a: number | null;
  b: number | null;
};
/** One scale per metric, shared by BOTH selected seasons and players. */
export function buildRadarAxes(
  a: ComparisonProfile | undefined,
  b: ComparisonProfile | undefined,
  aSeason: ComparisonSeason | undefined,
  bSeason: ComparisonSeason | undefined,
  role: CompareRole,
  basis: CompareBasis,
): RadarAxis[] {
  const cohort = [
    ...(aSeason?.[role] ?? []),
    ...(bSeason?.id === aSeason?.id ? [] : (bSeason?.[role] ?? [])),
  ];
  return radarMetrics(role).map((metric) => ({
    metric,
    domain: numericDomain(
      cohort.map((player) => comparisonValue(player, metric, basis)),
      metric.signed,
    ),
    a: comparisonValue(a, metric, basis),
    b: comparisonValue(b, metric, basis),
  }));
}
export type ScatterPoint = {
  id: string;
  name: string;
  season: string;
  label: string;
  x: number;
  y: number;
};
export function buildScatterPoints(
  seasons: ComparisonSeason[],
  role: CompareRole,
  basis: CompareBasis,
  xMetric: ComparisonMetric,
  yMetric: ComparisonMetric,
): ScatterPoint[] {
  return [
    ...new Map(seasons.map((season) => [season.id, season])).values(),
  ].flatMap((season) =>
    season[role].flatMap((player) => {
      const x = comparisonValue(player, xMetric, basis);
      const y = comparisonValue(player, yMetric, basis);
      return x == null || y == null
        ? []
        : [
            {
              id: `${season.id}:${player.name}`,
              name: player.name,
              season: season.id,
              label: season.label,
              x,
              y,
            },
          ];
    }),
  );
}
export type TrendPoint = {
  season: string;
  label: string;
  value: number | null;
};
export function buildTrend(
  seasons: ComparisonSeason[],
  name: string,
  role: CompareRole,
  metric: ComparisonMetric,
  basis: CompareBasis,
): TrendPoint[] {
  return [...seasons]
    .sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id))
    .map((season) => ({
      season: season.id,
      label: season.label,
      value: comparisonValue(
        season[role].find((player) => player.name === name),
        metric,
        basis,
      ),
    }));
}
/** A missing season breaks a line. Never interpolate through absent data. */
export function contiguousSegments<T extends { value: number | null }>(
  points: T[],
): T[][] {
  const segments: T[][] = [];
  let active: T[] = [];
  for (const point of points) {
    if (point.value == null) {
      if (active.length) segments.push(active);
      active = [];
    } else active.push(point);
  }
  if (active.length) segments.push(active);
  return segments;
}
