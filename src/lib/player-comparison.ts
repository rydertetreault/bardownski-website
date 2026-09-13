import type { ParsedStats, SeasonData, StatEntry } from "./discord";

export type CompareRole = "skater" | "goalie";
export type CompareBasis = "totals" | "per-game";
export type MetricKey =
  | "games"
  | "points"
  | "goals"
  | "assists"
  | "plusMinus"
  | "hits"
  | "shots"
  | "shootingPct"
  | "passingPct"
  | "saves"
  | "savePct"
  | "shutouts";
export type ComparisonProfile = {
  name: string;
  games: number | null;
  values: Partial<Record<MetricKey, number | null>>;
};
export type ComparisonSeason = {
  id: string;
  label: string;
  date: string;
  skater: ComparisonProfile[];
  goalie: ComparisonProfile[];
};
export type ComparisonMetric = {
  key: MetricKey;
  label: string;
  short: string;
  percent?: boolean;
  signed?: boolean;
};
export type ComparisonRow = {
  metric: ComparisonMetric;
  a: number | null;
  b: number | null;
  edge: "a" | "b" | "tie" | "unavailable";
  gap: number | null;
};

export const COMPARISON_METRICS: Record<CompareRole, ComparisonMetric[]> = {
  skater: [
    { key: "points", label: "Points", short: "PTS" },
    { key: "goals", label: "Goals", short: "G" },
    { key: "assists", label: "Assists", short: "A" },
    { key: "plusMinus", label: "Plus / minus", short: "+/−", signed: true },
    { key: "hits", label: "Hits", short: "HIT" },
    { key: "shots", label: "Shots", short: "SOG" },
    { key: "shootingPct", label: "Shooting %", short: "SH%", percent: true },
    { key: "passingPct", label: "Passing %", short: "PASS%", percent: true },
  ],
  goalie: [
    { key: "saves", label: "Saves", short: "SVS" },
    { key: "savePct", label: "Save %", short: "SV%", percent: true },
    { key: "shutouts", label: "Shutouts", short: "SO" },
  ],
};

export function formatSeasonLabel(season: string): string {
  return /^\d{4}$/.test(season)
    ? `${season}-${Number(season) + 1}`
    : season.replace(/[–—]/g, "-");
}

function finite(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Use the union of reported entries, not just roster membership. Old snapshots
 * can omit the roster or goalie GP. An absent stat stays null, never zero. */
export function buildComparisonProfiles(
  stats: ParsedStats,
  role: CompareRole,
): ComparisonProfile[] {
  const lists =
    role === "skater"
      ? [
          stats.points,
          stats.goals,
          stats.assists,
          stats.plusMinus,
          stats.hits,
          stats.shots ?? [],
        ]
      : [stats.saves, stats.shutouts];
  const names = [
    ...new Set(lists.flatMap((entries) => entries.map((entry) => entry.name))),
  ];
  const entry = (entries: StatEntry[] | undefined, name: string) =>
    entries?.find((item) => item.name === name);
  return names
    .map((name) => {
      if (role === "goalie") {
        const saves = stats.saves.find((item) => item.name === name);
        return {
          name,
          games: finite(saves?.ggp),
          values: {
            saves: finite(saves?.value),
            // Both adapters already supply percentages on a 0–100 scale.
            savePct: finite(saves?.secondary),
            shutouts: finite(entry(stats.shutouts, name)?.value),
          },
        };
      }
      return {
        name,
        games: finite(entry(stats.points, name)?.secondary),
        values: {
          points: finite(entry(stats.points, name)?.value),
          goals: finite(entry(stats.goals, name)?.value),
          assists: finite(entry(stats.assists, name)?.value),
          plusMinus: finite(entry(stats.plusMinus, name)?.value),
          hits: finite(entry(stats.hits, name)?.value),
          shots: finite(entry(stats.shots, name)?.value),
          shootingPct: finite(entry(stats.goals, name)?.secondary),
          passingPct: finite(entry(stats.assists, name)?.secondary),
        },
      };
    })
    .sort(
      (a, b) =>
        (b.values[role === "skater" ? "points" : "saves"] ?? -Infinity) -
          (a.values[role === "skater" ? "points" : "saves"] ?? -Infinity) ||
        a.name.localeCompare(b.name),
    );
}

export function buildComparisonSeasons(
  seasons: SeasonData[],
): ComparisonSeason[] {
  return seasons.map(({ season, stats }) => ({
    id: season,
    label: formatSeasonLabel(season),
    date: stats.date,
    skater: buildComparisonProfiles(stats, "skater"),
    goalie: buildComparisonProfiles(stats, "goalie"),
  }));
}

export function comparisonValue(
  profile: ComparisonProfile | undefined,
  metric: ComparisonMetric,
  basis: CompareBasis,
): number | null {
  if (metric.key === "games") return profile?.games ?? null;
  const value = profile?.values[metric.key];
  if (value == null || !Number.isFinite(value)) return null;
  if (basis === "totals" || metric.percent) return value;
  return profile?.games != null && profile.games > 0
    ? value / profile.games
    : null;
}

export function buildComparisonRows(
  a: ComparisonProfile | undefined,
  b: ComparisonProfile | undefined,
  role: CompareRole,
  basis: CompareBasis,
): ComparisonRow[] {
  return COMPARISON_METRICS[role].map((metric) => {
    const av = comparisonValue(a, metric, basis);
    const bv = comparisonValue(b, metric, basis);
    // Match the displayed precision so rounded-equal numbers are never given an edge.
    const roundedA = av == null ? null : Number(av.toFixed(2));
    const roundedB = bv == null ? null : Number(bv.toFixed(2));
    const gap =
      roundedA == null || roundedB == null
        ? null
        : Math.abs(roundedA - roundedB);
    const edge =
      roundedA == null || roundedB == null
        ? "unavailable"
        : roundedA === roundedB
          ? "tie"
          : roundedA > roundedB
            ? "a"
            : "b";
    return { metric, a: av, b: bv, edge, gap };
  });
}

export function formatComparisonValue(
  value: number | null,
  metric: ComparisonMetric,
  basis: CompareBasis,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(2));
  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits:
      basis === "per-game" && !metric.percent && metric.key !== "games" ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${metric.signed && rounded > 0 ? "+" : ""}${formatted}${metric.percent ? "%" : ""}`;
}

/** Bar length measures magnitude. Signed values get a central zero baseline;
 * negative plus/minus extends left, rather than being clamped away. */
export function comparisonBar(
  value: number | null,
  other: number | null,
  signed = false,
): { left: string; width: string } {
  const max = Math.max(Math.abs(value ?? 0), Math.abs(other ?? 0), 1e-9);
  const width = (Math.abs(value ?? 0) / max) * (signed ? 50 : 100);
  return {
    left: `${signed ? (value != null && value < 0 ? 50 - width : 50) : 0}%`,
    width: `${width}%`,
  };
}
