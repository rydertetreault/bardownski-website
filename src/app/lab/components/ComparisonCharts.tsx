"use client";

import { useId, useState } from "react";
import { getNickname } from "@/lib/nicknames";
import {
  formatComparisonValue,
  type CompareBasis,
  type CompareRole,
  type ComparisonMetric,
  type ComparisonProfile,
  type ComparisonRow,
  type ComparisonSeason,
} from "@/lib/player-comparison";
import {
  buildRadarAxes,
  buildScatterPoints,
  buildTrend,
  contiguousSegments,
  metricUnit,
  normalizeValue,
  numericDomain,
  type NumericDomain,
} from "@/lib/comparison-charts";

export type ChartPair = {
  a: ComparisonProfile;
  b: ComparisonProfile;
  aSeason: ComparisonSeason;
  bSeason: ComparisonSeason;
  role: CompareRole;
  basis: CompareBasis;
};
const A = "#68c8ce";
const B = "#d2aceb";
const fmt = formatComparisonValue;
function tick(value: number): string {
  return Math.abs(value) >= 1000
    ? `${Number((value / 1000).toFixed(1))}k`
    : Number(value.toFixed(2)).toString();
}
function valueLabel(
  value: number | null,
  metric: ComparisonMetric,
  basis: CompareBasis,
) {
  return value == null ? "Not recorded" : fmt(value, metric, basis);
}
function polar(index: number, total: number, radius: number) {
  const angle = (index * Math.PI * 2) / total - Math.PI / 2;
  return {
    x: 320 + Math.cos(angle) * radius,
    y: 282 + Math.sin(angle) * radius,
  };
}
function pointList(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function RadarChart(pair: ChartPair) {
  const id = useId();
  const [active, setActive] = useState(0);
  const axes = buildRadarAxes(
    pair.a,
    pair.b,
    pair.aSeason,
    pair.bSeason,
    pair.role,
    pair.basis,
  );
  const inspected = axes[active] ?? axes[0];
  return (
    <div className="lab-visual-layout">
      <div className="lab-plot lab-radar-plot">
        <div className="lab-plot-caption">
          <span>PERFORMANCE RADAR</span>
          <span>SHARED SEASON SCALES</span>
        </div>
        <svg
          className="lab-radar-svg"
          viewBox="0 0 640 570"
          role="group"
          aria-labelledby={`${id}-title ${id}-desc`}
        >
          <title id={`${id}-title`}>Player comparison radar chart</title>
          <desc id={`${id}-desc`}>
            Teal circles represent side A; purple squares represent side B. Each
            axis uses a shared scale from both selected seasons. Missing data
            leaves a gap. Focus or hover on a point for its exact value; the
            adjacent axis breakdown contains all values.
          </desc>
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <polygon
              key={ring}
              points={pointList(
                axes.map((_, i) => polar(i, axes.length, 204 * ring)),
              )}
              className="lab-grid-line"
            />
          ))}
          {axes.map((axis, i) => {
            const end = polar(i, axes.length, 204);
            const label = polar(i, axes.length, 247);
            return (
              <g key={axis.metric.key}>
                <line
                  x1="320"
                  y1="282"
                  x2={end.x}
                  y2={end.y}
                  className="lab-grid-line"
                />
                <text
                  x={label.x}
                  y={label.y - 3}
                  className="lab-axis-label"
                  textAnchor="middle"
                >
                  {axis.metric.short}
                </text>
                <text
                  x={label.x}
                  y={label.y + 14}
                  className="lab-tick"
                  textAnchor="middle"
                >
                  {tick(axis.domain.min)} → {tick(axis.domain.max)}
                  {axis.metric.percent ? "%" : ""}
                </text>
              </g>
            );
          })}
          {(["a", "b"] as const).map((side) => {
            const positions = axes.map((axis, i) =>
              axis[side] == null
                ? null
                : polar(
                    i,
                    axes.length,
                    normalizeValue(axis[side]!, axis.domain) * 204,
                  ),
            );
            const complete = positions.every((p) => p !== null);
            const color = side === "a" ? A : B;
            return (
              <g key={side} className={`lab-radar-series lab-series-${side}`}>
                {complete ? (
                  <polygon
                    points={pointList(positions as { x: number; y: number }[])}
                    fill={color}
                    fillOpacity=".13"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray={side === "b" ? "7 4" : undefined}
                  />
                ) : (
                  positions.map((p, i) => {
                    const next = positions[(i + 1) % positions.length];
                    return p && next ? (
                      <line
                        key={i}
                        x1={p.x}
                        y1={p.y}
                        x2={next.x}
                        y2={next.y}
                        stroke={color}
                        strokeWidth="2.5"
                        strokeDasharray={side === "b" ? "7 4" : undefined}
                      />
                    ) : null;
                  })
                )}
                {positions.map((p, i) => {
                  if (!p) return null;
                  const axis = axes[i];
                  const label = `Side ${side.toUpperCase()}, ${axis.metric.label}: ${valueLabel(axis[side], axis.metric, pair.basis)}`;
                  return (
                    <g
                      key={axis.metric.key}
                      className="lab-chart-point"
                      tabIndex={0}
                      role="img"
                      aria-label={label}
                      onFocus={() => setActive(i)}
                      onMouseEnter={() => setActive(i)}
                    >
                      <circle cx={p.x} cy={p.y} r="13" fill="transparent" />
                      {side === "a" ? (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5"
                          fill={color}
                          stroke="#0b151c"
                          strokeWidth="2"
                        />
                      ) : (
                        <rect
                          x={p.x - 5}
                          y={p.y - 5}
                          width="10"
                          height="10"
                          fill={color}
                          stroke="#0b151c"
                          strokeWidth="2"
                        />
                      )}
                      <title>{label}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        <p className="lab-chart-note">
          Outer ring = the highest magnitude in the selected seasons. Plus/minus
          runs from −max to +max, with zero at the middle ring. Gaps mean
          unrecorded data.
        </p>
      </div>
      <aside className="lab-chart-aside">
        <p className="lab-kicker">AXIS BREAKDOWN</p>
        <h4>
          Complete game.
          <br />
          <em>One profile.</em>
        </h4>
        <p className="lab-aside-copy">
          Compare the shape, then check the numbers. Hover or focus a plotted
          point to inspect its axis.
        </p>
        <div className="lab-inspector" aria-live="polite">
          <span>
            {inspected.metric.label}{" "}
            <small>{metricUnit(inspected.metric, pair.basis)}</small>
          </span>
          <div>
            <b className="lab-side-a">
              A {fmt(inspected.a, inspected.metric, pair.basis)}
            </b>
            <b className="lab-side-b">
              B {fmt(inspected.b, inspected.metric, pair.basis)}
            </b>
          </div>
        </div>
        <table className="lab-axis-table">
          <caption className="lab-sr-only">Radar exact values</caption>
          <thead>
            <tr>
              <th scope="col">Axis</th>
              <th scope="col">A</th>
              <th scope="col">B</th>
            </tr>
          </thead>
          <tbody>
            {axes.map((axis) => (
              <tr key={axis.metric.key}>
                <th scope="row">
                  {axis.metric.label}
                  {pair.basis === "per-game" &&
                  !axis.metric.percent &&
                  axis.metric.key !== "games"
                    ? " / GP"
                    : ""}
                </th>
                <td className="lab-side-a">
                  {fmt(axis.a, axis.metric, pair.basis)}
                </td>
                <td className="lab-side-b">
                  {fmt(axis.b, axis.metric, pair.basis)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lab-chart-note">
          {pair.role === "goalie"
            ? "Goalie GP remains a game count in either mode. "
            : ""}
          Both shapes use the same axes—not separate player-specific scales.
          This is a statistical profile, not an overall rating.
        </p>
      </aside>
    </div>
  );
}

export function GroupedBars({
  rows,
  basis,
}: {
  rows: ComparisonRow[];
  basis: CompareBasis;
}) {
  return (
    <div className="lab-grouped-bars">
      {rows.map((row) => {
        const domain = numericDomain([row.a, row.b], row.metric.signed);
        const y = (value: number) => 156 - normalizeValue(value, domain) * 120;
        const zero = y(0);
        return (
          <figure key={row.metric.key} className="lab-bar-chart">
            <figcaption>
              <strong>{row.metric.label}</strong>
              <span>{metricUnit(row.metric, basis)}</span>
            </figcaption>
            <svg
              viewBox="0 0 320 210"
              role="img"
              aria-label={`${row.metric.label}: A ${valueLabel(row.a, row.metric, basis)}, B ${valueLabel(row.b, row.metric, basis)}`}
            >
              {[0, 0.5, 1].map((t) => {
                const value = domain.min + t * (domain.max - domain.min);
                return (
                  <g key={t}>
                    <line
                      x1="48"
                      x2="295"
                      y1={y(value)}
                      y2={y(value)}
                      className="lab-grid-line"
                    />
                    <text
                      x="38"
                      y={y(value) + 4}
                      className="lab-tick"
                      textAnchor="end"
                    >
                      {tick(value)}
                    </text>
                  </g>
                );
              })}
              <line
                x1="48"
                x2="295"
                y1={zero}
                y2={zero}
                className="lab-zero-line"
              />
              {(["a", "b"] as const).map((side, i) => {
                const v = row[side];
                const x = 98 + i * 113;
                const height = v == null ? 0 : Math.abs(y(v) - zero);
                return (
                  <g key={side}>
                    {v != null && (
                      <rect
                        className={`lab-bar-series lab-series-${side}`}
                        x={x - 25}
                        y={Math.min(y(v), zero)}
                        width="50"
                        height={Math.max(height, 0.8)}
                        rx="2"
                        fill={side === "a" ? A : B}
                        fillOpacity=".8"
                      >
                        <title>{`${side.toUpperCase()}: ${fmt(v, row.metric, basis)}`}</title>
                      </rect>
                    )}
                    <text
                      x={x}
                      y="185"
                      fill={side === "a" ? A : B}
                      textAnchor="middle"
                      className="lab-chart-value"
                    >
                      {fmt(v, row.metric, basis)}
                    </text>
                    <text
                      x={x}
                      y="204"
                      textAnchor="middle"
                      className="lab-tick"
                    >
                      SIDE {side.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}

function CartesianGrid({
  xDomain,
  yDomain,
  xLabel,
  yLabel,
}: {
  xDomain: NumericDomain;
  yDomain: NumericDomain;
  xLabel: string;
  yLabel: string;
}) {
  return (
    <g>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={90 + t * 600}
            x2={90 + t * 600}
            y1="44"
            y2="386"
            className="lab-grid-line"
          />
          <line
            x1="90"
            x2="690"
            y1={386 - t * 342}
            y2={386 - t * 342}
            className="lab-grid-line"
          />
          <text
            x={90 + t * 600}
            y="414"
            textAnchor="middle"
            className="lab-tick"
          >
            {tick(xDomain.min + t * (xDomain.max - xDomain.min))}
          </text>
          <text x="74" y={390 - t * 342} textAnchor="end" className="lab-tick">
            {tick(yDomain.min + t * (yDomain.max - yDomain.min))}
          </text>
        </g>
      ))}
      <text x="390" y="459" textAnchor="middle" className="lab-axis-label">
        {xLabel}
      </text>
      <text
        transform="translate(22 215) rotate(-90)"
        textAnchor="middle"
        className="lab-axis-label"
      >
        {yLabel}
      </text>
    </g>
  );
}

export function ScatterChart({
  pair,
  xMetric,
  yMetric,
}: {
  pair: ChartPair;
  xMetric: ComparisonMetric;
  yMetric: ComparisonMetric;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const points = buildScatterPoints(
    [pair.aSeason, pair.bSeason],
    pair.role,
    pair.basis,
    xMetric,
    yMetric,
  );
  const xDomain = numericDomain(
    points.map((p) => p.x),
    xMetric.signed,
  );
  const yDomain = numericDomain(
    points.map((p) => p.y),
    yMetric.signed,
  );
  const aId = `${pair.aSeason.id}:${pair.a.name}`;
  const bId = `${pair.bSeason.id}:${pair.b.name}`;
  const sorted = [...points].sort(
    (a, b) =>
      Number(a.id === aId || a.id === bId) -
      Number(b.id === aId || b.id === bId),
  );
  const inspected =
    points.find((p) => p.id === hovered) ??
    points.find((p) => p.id === aId) ??
    points[0];
  const unavailable =
    !points.some((p) => p.id === aId) || !points.some((p) => p.id === bId);
  return (
    <div className="lab-visual-layout">
      <div className="lab-plot">
        <div className="lab-plot-caption">
          <span>PLAYER / SEASON DISTRIBUTION</span>
          <span>{points.length} RECORDED SNAPSHOTS</span>
        </div>
        <div
          className="lab-chart-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable scatter chart"
        >
          <svg
            viewBox="0 0 760 490"
            className="lab-cartesian-svg"
            role="group"
            aria-labelledby={`${id}-title`}
          >
            <title id={`${id}-title`}>
              {`Scatter plot: ${xMetric.label} versus ${yMetric.label}`}
            </title>
            <CartesianGrid
              xDomain={xDomain}
              yDomain={yDomain}
              xLabel={`${xMetric.label} (${metricUnit(xMetric, pair.basis)})`}
              yLabel={`${yMetric.label} (${metricUnit(yMetric, pair.basis)})`}
            />
            {sorted.map((p) => {
              const a = p.id === aId;
              const b = p.id === bId;
              const x = 90 + normalizeValue(p.x, xDomain) * 600;
              const y = 386 - normalizeValue(p.y, yDomain) * 342;
              const label = `${getNickname(p.name)}, ${p.label}: ${xMetric.label} ${fmt(p.x, xMetric, pair.basis)}, ${yMetric.label} ${fmt(p.y, yMetric, pair.basis)}`;
              return (
                <g
                  key={p.id}
                  className="lab-chart-point"
                  role="img"
                  aria-label={label}
                  tabIndex={0}
                  onFocus={() => setHovered(p.id)}
                  onMouseEnter={() => setHovered(p.id)}
                >
                  <circle cx={x} cy={y} r="15" fill="transparent" />
                  {b && (
                    <rect
                      x={x - (a ? 11 : 7)}
                      y={y - (a ? 11 : 7)}
                      width={a ? 22 : 14}
                      height={a ? 22 : 14}
                      fill={a ? "none" : B}
                      stroke={B}
                      strokeWidth="2"
                    />
                  )}
                  {(a || !b) && (
                    <circle
                      cx={x}
                      cy={y}
                      r={a ? 8 : 4}
                      fill={a ? A : "#8b9daa"}
                      fillOpacity={a ? 1 : 0.55}
                      stroke={a ? "#0b1119" : "none"}
                      strokeWidth="2"
                    />
                  )}
                  {(a || b) && (
                    <text
                      x={x}
                      y={y - 18}
                      textAnchor="middle"
                      className="lab-point-label"
                    >
                      {a && b ? "A / B" : a ? "A" : "B"}
                    </text>
                  )}
                  <title>{label}</title>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="lab-chart-note">
          Each dot is a player-season from the two selected seasons. Grey dots
          are the comparison field. Only snapshots with both axis values are
          plotted.
        </p>
      </div>
      <aside className="lab-chart-aside">
        <p className="lab-kicker">SCOUT THE FIELD</p>
        <h4>
          Production.
          <br />
          <em>In perspective.</em>
        </h4>
        <p className="lab-aside-copy">
          Change either axis to explore a different relationship. Hover or focus
          any dot for its player, season and exact numbers.
        </p>
        {inspected ? (
          <div className="lab-inspector" aria-live="polite">
            <span>{getNickname(inspected.name)}</span>
            <small>{inspected.label}</small>
            <dl>
              <div>
                <dt>{xMetric.label}</dt>
                <dd>{fmt(inspected.x, xMetric, pair.basis)}</dd>
              </div>
              <div>
                <dt>{yMetric.label}</dt>
                <dd>{fmt(inspected.y, yMetric, pair.basis)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="lab-notice">No snapshots have both selected metrics.</p>
        )}
        {unavailable && (
          <p className="lab-notice">
            One or both selected players cannot be plotted with these metrics.
            Missing values are not plotted as zero.
          </p>
        )}
        <p className="lab-chart-note">
          Position shows these two statistics only. It does not imply causation
          or an overall ranking. Overlapping A/B markers mean identical
          coordinates.
        </p>
      </aside>
    </div>
  );
}

export function TrendChart({
  pair,
  seasons,
  metric,
}: {
  pair: ChartPair;
  seasons: ComparisonSeason[];
  metric: ComparisonMetric;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const a = buildTrend(seasons, pair.a.name, pair.role, metric, pair.basis);
  const b = buildTrend(seasons, pair.b.name, pair.role, metric, pair.basis);
  const domain = numericDomain(
    [...a, ...b].map((p) => p.value),
    metric.signed,
  );
  const x = (index: number) =>
    a.length <= 1 ? 390 : 100 + (index / (a.length - 1)) * 580;
  const y = (value: number) => 374 - normalizeValue(value, domain) * 320;
  const selectedPoint = [
    ...a.map((p) => ({ ...p, side: "A" })),
    ...b.map((p) => ({ ...p, side: "B" })),
  ].find((p) => `${p.side}:${p.season}` === hovered);
  return (
    <div className="lab-visual-layout">
      <div className="lab-plot">
        <div className="lab-plot-caption">
          <span>SEASON-BY-SEASON TRAJECTORY</span>
          <span>{metricUnit(metric, pair.basis).toUpperCase()}</span>
        </div>
        <div
          className="lab-chart-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable season trend chart"
        >
          <svg
            viewBox="0 0 760 490"
            className="lab-cartesian-svg"
            role="group"
            aria-labelledby={`${id}-title`}
          >
            <title id={`${id}-title`}>{`Season trend: ${metric.label}`}</title>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const v = domain.min + (domain.max - domain.min) * t;
              return (
                <g key={t}>
                  <line
                    x1="100"
                    x2="680"
                    y1={y(v)}
                    y2={y(v)}
                    className="lab-grid-line"
                  />
                  <text
                    x="83"
                    y={y(v) + 4}
                    textAnchor="end"
                    className="lab-tick"
                  >
                    {tick(v)}
                  </text>
                </g>
              );
            })}
            {a.map((p, i) => (
              <g key={p.season}>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1="54"
                  y2="374"
                  className="lab-grid-line"
                />
                <text x={x(i)} y="410" textAnchor="middle" className="lab-tick">
                  {p.label}
                </text>
              </g>
            ))}
            <text
              x="390"
              y="459"
              textAnchor="middle"
              className="lab-axis-label"
            >
              {metric.label} ({metricUnit(metric, pair.basis)}) · Season
              snapshots, not game-by-game
            </text>
            {[a, b].map((series, index) => {
              const side = index === 0 ? "A" : "B";
              const color = index === 0 ? A : B;
              const seasonId = index === 0 ? pair.aSeason.id : pair.bSeason.id;
              const positions = series.map((p, i) => ({
                ...p,
                x: x(i),
                y: p.value == null ? 0 : y(p.value),
              }));
              return (
                <g
                  key={side}
                  className={`lab-trend-series lab-series-${side.toLowerCase()}`}
                >
                  {contiguousSegments(positions).map((segment, i) => (
                    <polyline
                      key={i}
                      points={pointList(segment)}
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeDasharray={index ? "8 5" : undefined}
                    />
                  ))}
                  {positions
                    .filter((p) => p.value != null)
                    .map((p) => {
                      const label = `Side ${side}, ${p.label}: ${valueLabel(p.value, metric, pair.basis)}`;
                      return (
                        <g
                          key={p.season}
                          role="img"
                          aria-label={label}
                          tabIndex={0}
                          className="lab-chart-point"
                          onFocus={() => setHovered(`${side}:${p.season}`)}
                          onMouseEnter={() => setHovered(`${side}:${p.season}`)}
                        >
                          <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                          {p.season === seasonId && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={index ? 14 : 11}
                              fill="none"
                              stroke={color}
                              strokeWidth="1.5"
                            />
                          )}
                          {index ? (
                            <rect
                              x={p.x - 5}
                              y={p.y - 5}
                              width="10"
                              height="10"
                              fill={color}
                            />
                          ) : (
                            <circle cx={p.x} cy={p.y} r="6" fill={color} />
                          )}
                          <title>{label}</title>
                        </g>
                      );
                    })}
                </g>
              );
            })}
          </svg>
        </div>
        <p className="lab-chart-note">
          Solid teal = A’s player; dashed purple = B’s player. Rings mark each
          side’s selected season. Missing snapshots break the line—no invented
          seasons or interpolated values.
        </p>
      </div>
      <aside className="lab-chart-aside">
        <p className="lab-kicker">THE LONG VIEW</p>
        <h4>
          Different years.
          <br />
          <em>One trajectory.</em>
        </h4>
        <p className="lab-aside-copy">
          Tracks both selected players across every available season. Compare
          the same player on both sides to see their shared trajectory with
          different season markers.
        </p>
        {!a.some((p) => p.value != null) && !b.some((p) => p.value != null) && (
          <p className="lab-notice">
            No recorded values for this metric in the available seasons. Choose
            another metric or player.
          </p>
        )}
        {selectedPoint && (
          <div className="lab-inspector" aria-live="polite">
            <span>
              Side {selectedPoint.side} · {selectedPoint.label}
            </span>
            <b>{fmt(selectedPoint.value, metric, pair.basis)}</b>
          </div>
        )}
        <table className="lab-axis-table">
          <caption>
            {metric.label} · {metricUnit(metric, pair.basis)}
          </caption>
          <thead>
            <tr>
              <th scope="col">Season</th>
              <th scope="col">A</th>
              <th scope="col">B</th>
            </tr>
          </thead>
          <tbody>
            {a.map((point, i) => (
              <tr key={point.season}>
                <th scope="row">{point.label}</th>
                <td className="lab-side-a">
                  {fmt(point.value, metric, pair.basis)}
                </td>
                <td className="lab-side-b">
                  {fmt(b[i].value, metric, pair.basis)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lab-chart-note">
          Totals depend on season length and games played. Per-game mode
          compares pace where GP is recorded. Changes in game versions and
          tracking coverage can affect comparisons.
        </p>
      </aside>
    </div>
  );
}

// Keep a complete exact-value alternative alongside the graphics.
export function ComparisonData({
  rows,
  basis,
}: {
  rows: ComparisonRow[];
  basis: CompareBasis;
}) {
  return (
    <details className="lab-data">
      <summary>
        Exact numbers / accessible data table <span aria-hidden="true">+</span>
      </summary>
      <div
        className="lab-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Comparison data table"
      >
        <table className="lab-axis-table">
          <caption className="lab-sr-only">
            Selected player-season comparison
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Side A</th>
              <th scope="col">Side B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric.key}>
                <th scope="row">
                  {row.metric.label}
                  {row.metric.percent
                    ? ""
                    : ` ${metricUnit(row.metric, basis)}`}
                </th>
                <td className="lab-side-a">{fmt(row.a, row.metric, basis)}</td>
                <td className="lab-side-b">{fmt(row.b, row.metric, basis)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
