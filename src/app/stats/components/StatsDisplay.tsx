"use client";

import { useId } from "react";
import type { ParsedStats, EnrichedPlayer, StatEntry } from "@/lib/discord";
import { getEnrichedPlayers } from "@/lib/discord";
import { getNickname } from "@/lib/nicknames";

type Metric = {
  key: Exclude<keyof EnrichedPlayer, "name" | "position">;
  label: string;
  short: string;
  percent?: boolean;
  signed?: boolean;
};

const skaterMetrics: Metric[] = [
  { key: "gamesPlayed", label: "Games played", short: "GP" },
  { key: "points", label: "Points", short: "PTS" },
  { key: "goals", label: "Goals", short: "G" },
  { key: "assists", label: "Assists", short: "A" },
  { key: "plusMinus", label: "Plus / minus", short: "+/−", signed: true },
  { key: "hits", label: "Hits", short: "HIT" },
  { key: "shots", label: "Shots", short: "SOG" },
  { key: "shotPercentage", label: "Shooting %", short: "SH%", percent: true },
  { key: "passPercentage", label: "Passing %", short: "PASS%", percent: true },
  { key: "pim", label: "Penalty minutes", short: "PIM" },
  { key: "gwg", label: "Game-winning goals", short: "GWG" },
  { key: "takeaways", label: "Takeaways", short: "TA" },
  { key: "giveaways", label: "Giveaways", short: "GA" },
  { key: "blockedShots", label: "Blocked shots", short: "BLK" },
  { key: "interceptions", label: "Interceptions", short: "INT" },
  { key: "faceoffPct", label: "Faceoff %", short: "FO%", percent: true },
];

const goalieMetrics: Metric[] = [
  { key: "goalieGamesPlayed", label: "Goalie games played", short: "GGP" },
  { key: "saves", label: "Saves", short: "SVS" },
  { key: "savePercentage", label: "Save %", short: "SV%", percent: true },
  { key: "gaa", label: "Goals against average", short: "GAA" },
  { key: "shutouts", label: "Shutouts", short: "SO" },
  { key: "shutoutPeriods", label: "Shutout periods", short: "SOP" },
];

function isReported(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatValue(value: number | undefined, metric?: Pick<Metric, "percent" | "signed">) {
  if (!isReported(value)) return "—";
  const rounded = Number(value.toFixed(2));
  return `${metric?.signed && rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US", { maximumFractionDigits: 2 })}${metric?.percent ? "%" : ""}`;
}

function hasStats(player: EnrichedPlayer, metrics: Metric[]) {
  return metrics.some((metric) => isReported(player[metric.key]));
}

function sortByMetric(players: EnrichedPlayer[], key: Metric["key"]) {
  return [...players].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    return (isReported(bv) ? bv : -Infinity) - (isReported(av) ? av : -Infinity)
      || getNickname(a.name).localeCompare(getNickname(b.name));
  });
}

function getReportedPlayers(stats: ParsedStats) {
  // Enrichment supports both roles on the same player, but normally only maps
  // the roster. Include entry-only players without inventing their positions.
  const roster = new Map(stats.roster.map((player) => [player.name, player]));
  const lists = [
    stats.points, stats.goals, stats.assists, stats.plusMinus, stats.hits,
    stats.saves, stats.shutouts, stats.shots, stats.gwg, stats.takeaways,
    stats.giveaways, stats.blockedShots, stats.pim, stats.interceptions, stats.faceoffPct,
  ];
  for (const entries of lists) {
    for (const entry of entries ?? []) {
      if (!roster.has(entry.name)) roster.set(entry.name, { name: entry.name, position: "—" });
    }
  }
  return getEnrichedPlayers({ ...stats, roster: [...roster.values()] });
}

function PlayerTable({
  id,
  title,
  players,
  metrics,
  order,
}: {
  id: string;
  title: string;
  players: EnrichedPlayer[];
  metrics: Metric[];
  order: string;
}) {
  return (
    <section className="stats-table-section" aria-labelledby={`${id}-heading`}>
      <div className="stats-subhead">
        <h3 id={`${id}-heading`}>{title} statistics.</h3>
        <span>THE PLAYER TOTALS</span>
      </div>
      <p className="stats-table-note" id={`${id}-note`}>
        Sorted by {order}. — means not reported, not zero. Players with reported skater and goalie stats appear in both tables. Scroll horizontally to view all columns.
      </p>
      <div className="stats-table-scroll" role="region" tabIndex={0} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-note`}>
        <table className="stats-player-table">
          <caption>{title} totals for the selected season</caption>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col"><abbr title="Listed position">POS</abbr></th>
              {metrics.map((metric) => <th key={metric.key} scope="col"><abbr title={metric.label}>{metric.short}</abbr></th>)}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.name}>
                <th scope="row">{getNickname(player.name)}</th>
                <td>{player.position.trim() || "—"}</td>
                {metrics.map((metric) => <td key={metric.key}>{formatValue(player[metric.key], metric)}</td>)}
              </tr>
            ))}
            {players.length === 0 && (
              <tr><td className="stats-empty" colSpan={metrics.length + 2}>No {title.toLowerCase()} statistics were reported in this snapshot.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LeaderCard({ label, entries, secondary, signed }: {
  label: string;
  entries: StatEntry[];
  secondary?: { label: string; percent?: boolean };
  signed?: boolean;
}) {
  const sorted = entries.filter((entry) => isReported(entry.value)).sort(
    (a, b) => b.value - a.value || getNickname(a.name).localeCompare(getNickname(b.name)),
  );
  if (!sorted.length) return null;
  const leaders = sorted.filter((entry) => entry.value === sorted[0].value);
  // Show the top five entries plus any ties at the cutoff, not an arbitrary
  // sole leader (or omitted co-leader) from the upstream array order.
  const visible = sorted.filter((entry, index) => index < 5 || entry.value === sorted[4]?.value);
  return (
    <article className="stats-leader">
      <p className="stats-eyebrow">{label}</p>
      <strong className="stats-leader-total">{formatValue(sorted[0].value, { signed })}</strong>
      <h4 className="stats-leader-name">
        {leaders.map((entry) => getNickname(entry.name)).join(" / ")}
        {leaders.length > 1 && " · Tied for the lead"}
      </h4>
      <ol aria-label={`${label} leaders`}>
        {visible.map((entry) => {
          const rank = sorted.findIndex((other) => other.value === entry.value) + 1;
          const tied = sorted.filter((other) => other.value === entry.value).length > 1;
          return (
            <li key={entry.name} value={rank}>
              <span aria-label={`${tied ? "Tied at rank" : "Rank"} ${rank}`}>{tied ? `T-${rank}` : rank}</span>
              <span>{getNickname(entry.name)}</span>
              <b>{formatValue(entry.value, { signed })}</b>
              {secondary && <small>{secondary.label} · {formatValue(entry.secondary, secondary)}</small>}
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export function StatsDisplay({ stats }: { stats: ParsedStats }) {
  const instanceId = useId();
  const players = getReportedPlayers(stats);
  // Never classify exclusively by listed position: mixed-role players belong
  // in both tables whenever each role has reported data (including zero).
  const skaters = sortByMetric(players.filter((player) => hasStats(player, skaterMetrics)), "points");
  const goalies = sortByMetric(players.filter((player) => hasStats(player, goalieMetrics)), "saves");
  const leaders = [
    { label: "Points", entries: stats.points, secondary: { label: "Games played" } },
    { label: "Goals", entries: stats.goals, secondary: { label: "Shooting %", percent: true } },
    { label: "Assists", entries: stats.assists, secondary: { label: "Passing %", percent: true } },
    { label: "Plus / minus", entries: stats.plusMinus, signed: true },
    { label: "Hits", entries: stats.hits, secondary: { label: "Penalty minutes" } },
    { label: "Saves", entries: stats.saves, secondary: { label: "Save %", percent: true } },
    { label: "Shutouts", entries: stats.shutouts, secondary: { label: "Shutout periods" } },
  ].filter((category) => category.entries.some((entry) => isReported(entry.value)));

  return (
    <>
      {leaders.length > 0 && (
        <section aria-labelledby={`${instanceId}-leaders`}>
          <div className="stats-subhead"><h3 id={`${instanceId}-leaders`}>Setting the pace.</h3><span>THE CATEGORY LEADERS</span></div>
          <div className="stats-leaders">{leaders.map((category) => <LeaderCard key={category.label} {...category} />)}</div>
        </section>
      )}
      <PlayerTable id={`${instanceId}-skaters`} title="Skater" players={skaters} metrics={skaterMetrics.slice(0, 10)} order="points, highest first" />
      <PlayerTable id={`${instanceId}-goalies`} title="Goalie" players={goalies} metrics={goalieMetrics} order="saves, highest first" />
      {players.length > 0 && (
        <section className="stats-profiles" aria-labelledby={`${instanceId}-profiles`}>
          <div className="stats-subhead"><h3 id={`${instanceId}-profiles`}>The full picture.</h3><span>INDIVIDUAL PLAYER PROFILES</span></div>
          {players.map((player) => {
            const metrics = [
              ...(hasStats(player, skaterMetrics) ? skaterMetrics : []),
              ...(hasStats(player, goalieMetrics) ? goalieMetrics : []),
            ];
            return (
              <details key={player.name} className="stats-profile">
                <summary>
                  <span>{getNickname(player.name)}<small>{player.position.trim() || "—"}</small></span>
                  <span className="stats-profile-hint">Full player stats</span>
                </summary>
                {metrics.length > 0 ? (
                  <div className="stats-profile-grid">
                    {metrics.map((metric) => <div key={metric.key}><small>{metric.label}</small><strong>{formatValue(player[metric.key], metric)}</strong></div>)}
                  </div>
                ) : <p className="stats-empty">No individual statistics were reported for this player.</p>}
              </details>
            );
          })}
        </section>
      )}
      {stats.milestones.length > 0 && (
        <section className="stats-milestones" aria-labelledby={`${instanceId}-milestones`}>
          <div className="stats-subhead"><h3 id={`${instanceId}-milestones`}>Milestones.</h3></div>
          {stats.milestones.map((milestone) => (
            <article key={milestone.name}>
              <h4>{getNickname(milestone.name)}</h4>
              <ul>{milestone.achievements.map((achievement, index) => <li key={`${index}-${achievement}`}>{achievement}</li>)}</ul>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
