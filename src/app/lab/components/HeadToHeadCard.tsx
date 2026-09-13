"use client";

import { useId, useState } from "react";
import LabSelect from "@/components/ui/LabSelect";
import { getNickname } from "@/lib/nicknames";
import { getPlayerNumber } from "@/lib/player-numbers";
import {
  buildComparisonRows,
  COMPARISON_METRICS,
  type CompareBasis,
  type CompareRole,
  type ComparisonMetric,
  type ComparisonProfile,
  type ComparisonSeason,
  type MetricKey,
} from "@/lib/player-comparison";
import { CHART_VIEWS, type ChartView } from "@/lib/comparison-charts";
import {
  ComparisonData,
  GroupedBars,
  RadarChart,
  ScatterChart,
  TrendChart,
} from "./ComparisonCharts";

type Selection = { season: string; player: string };
function ChartIcon({ view }: { view: ChartView }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {view === "radar" ? (
        <>
          <path
            d="M12 2 22 9 18 21H6L2 9Z M12 2v10L2 9m10 3 10-3m-10 3 6 9m-6-9L6 21"
            opacity=".45"
          />
          <path d="m12 5 7 5-3 8-8 1-3-9Z" />
        </>
      ) : view === "bars" ? (
        <>
          <path d="M3 3v18h19" />
          <path d="M7 16V8m4 8V5m5 11V9m4 7V6" strokeWidth="2.5" />
        </>
      ) : view === "scatter" ? (
        <>
          <path d="M3 3v18h19" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="12" cy="11" r="1.5" />
          <circle cx="17" cy="7" r="1.5" />
          <circle cx="19" cy="13" r="1.5" />
        </>
      ) : (
        <>
          <path d="M3 3v18h19" />
          <path d="m5 15 5-6 5 3 6-8M5 18l5-5 5 3 6-6" />
        </>
      )}
    </svg>
  );
}
function PlayerSelector({
  side,
  seasons,
  season,
  player,
  role,
  onSeason,
  onPlayer,
}: {
  side: "a" | "b";
  seasons: ComparisonSeason[];
  season: ComparisonSeason | undefined;
  player: ComparisonProfile | undefined;
  role: CompareRole;
  onSeason: (id: string) => void;
  onPlayer: (name: string) => void;
}) {
  const id = useId();
  const players = season?.[role] ?? [];
  const number = player ? getPlayerNumber(player.name) : null;
  return (
    <fieldset className={`lab-selection lab-side-${side}`}>
      <legend className="lab-sr-only">
        Side {side.toUpperCase()} player and season
      </legend>
      <p className="lab-side-label" aria-hidden="true">
        <span>{side.toUpperCase()}</span> {side === "a" ? "First player" : "Second player"}
      </p>
      <div className="lab-player-picker">
        <LabSelect
          id={`${id}-player`}
          label={`Player ${side.toUpperCase()}`}
          compact
          variant="player"
          playerNumber={number}
          value={player?.name ?? ""}
          options={players.map((p) => ({
            value: p.name,
            label: getNickname(p.name),
            number: getPlayerNumber(p.name),
            badge: `${p.games ?? "—"} GP`,
          }))}
          triggerContent={
            <span className="lab-player-identity">
              {number != null && (
                <span className="lab-player-number" aria-label={`Club number ${number}`}>
                  <small>CLUB NO.</small>
                  <strong>{number}</strong>
                </span>
              )}
              <span className="lab-player-copy">
                <span className="lab-player-name">
                  {player ? getNickname(player.name) : `No ${role} data`}
                </span>
                <span className="lab-player-change">
                  {players.length ? "Change player" : "Choose another season"}
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="m5 7 5 5 5-5" />
                  </svg>
                </span>
              </span>
            </span>
          }
          placeholder={`No ${role} data`}
          disabled={!players.length}
          onChange={onPlayer}
        />
      </div>
      <div className="lab-player-meta">
        <div className="lab-season-picker">
          <LabSelect
            id={`${id}-season`}
            label={`Season ${side.toUpperCase()}`}
            compact
            value={season?.id ?? ""}
            options={seasons.map((s) => ({ value: s.id, label: s.label }))}
            searchable={false}
            placeholder="No seasons"
            disabled={!seasons.length}
            onChange={onSeason}
          />
        </div>
        <p className="lab-player-context">
          <strong>{player?.games ?? "—"}</strong> {role === "goalie" ? "goalie games" : "games played"}
        </p>
      </div>
    </fieldset>
  );
}

function MetricSelect({
  label,
  value,
  metrics,
  onChange,
}: {
  label: string;
  value: MetricKey;
  metrics: ComparisonMetric[];
  onChange: (value: MetricKey) => void;
}) {
  const id = useId();
  return (
    <div className="lab-metric-select">
      <LabSelect
        id={id}
        label={label}
        value={value}
        options={metrics.map((metric) => ({
          value: metric.key,
          label: metric.label,
          badge: metric.short,
        }))}
        searchable={false}
        onChange={(key) => onChange(key as MetricKey)}
      />
    </div>
  );
}

export function HeadToHeadCard({
  seasons,
  pendingSeason,
}: {
  seasons: ComparisonSeason[];
  pendingSeason?: string;
}) {
  const first = seasons.find((s) => s.skater.length) ?? seasons[0];
  const [left, setLeft] = useState<Selection>({
    season: first?.id ?? "",
    player: first?.skater[0]?.name ?? "",
  });
  const [right, setRight] = useState<Selection>({
    season: first?.id ?? "",
    player: first?.skater[1]?.name ?? first?.skater[0]?.name ?? "",
  });
  const [role, setRole] = useState<CompareRole>("skater");
  const [basis, setBasis] = useState<CompareBasis>("totals");
  const [view, setView] = useState<ChartView>("radar");
  const [xKey, setXKey] = useState<MetricKey>("goals");
  const [yKey, setYKey] = useState<MetricKey>("assists");
  const [trendKey, setTrendKey] = useState<MetricKey>("points");
  const resultId = useId();
  const aSeason = seasons.find((s) => s.id === left.season) ?? first;
  const bSeason = seasons.find((s) => s.id === right.season) ?? first;
  const a =
    aSeason?.[role].find((p) => p.name === left.player) ?? aSeason?.[role][0];
  const b =
    bSeason?.[role].find((p) => p.name === right.player) ??
    bSeason?.[role][1] ??
    bSeason?.[role][0];
  const metrics = COMPARISON_METRICS[role];
  const xMetric = metrics.find((m) => m.key === xKey) ?? metrics[0];
  const yMetric = metrics.find((m) => m.key === yKey) ?? metrics[1];
  const trendMetric = metrics.find((m) => m.key === trendKey) ?? metrics[0];
  const rows = buildComparisonRows(a, b, role, basis);
  const currentView = CHART_VIEWS.find((v) => v.id === view)!;
  const pair =
    a && b && aSeason && bSeason
      ? { a, b, aSeason, bSeason, role, basis }
      : null;
  const same = a && b && a.name === b.name && aSeason?.id === bSeason?.id;
  const missingGP =
    basis === "per-game" &&
    [a, b].some((p) => p && (p.games == null || p.games <= 0));
  function changeSeason(side: "a" | "b", season: string) {
    const previous = side === "a" ? a : b;
    const players = seasons.find((s) => s.id === season)?.[role] ?? [];
    const player = players.find((p) => p.name === previous?.name) ?? players[0];
    (side === "a" ? setLeft : setRight)({ season, player: player?.name ?? "" });
  }
  return (
    <section
      id="comparison"
      className="comparison-lab"
      aria-labelledby="comparison-title"
    >
      <header className="lab-header">
        <div className="lab-header-copy">
          <p className="lab-kicker">02 / PLAYER COMPARISON</p>
          <h2 id="comparison-title">
            HEAD <em>TO HEAD.</em>
          </h2>
          <p>Different players. Different seasons. Every angle of the game.</p>
          <div className="lab-header-meta">
            <span>PLAYER × SEASON</span>
            <span>FOUR WAYS TO SEE THE GAME</span>
          </div>
        </div>
        <div className="lab-header-mark" aria-hidden="true">
          <span>A</span><i>vs</i><span>B</span>
          <small>LET THE NUMBERS TALK.</small>
        </div>
      </header>
      <div className="lab-console">
        <div className="lab-matchup-setup">
          <div className="lab-topline">
            <h3 className="lab-matchup-title">The matchup</h3>
            <div className="lab-toggle" role="group" aria-label="Player role">
              {(["skater", "goalie"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={role === value}
                  onClick={() => setRole(value)}
                >
                  {value === "skater" ? "Skaters" : "Goalies"}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-selections">
            <PlayerSelector
              side="a"
              seasons={seasons}
              season={aSeason}
              player={a}
              role={role}
              onSeason={(id) => changeSeason("a", id)}
              onPlayer={(player) =>
                setLeft({ season: aSeason?.id ?? "", player })
              }
            />
            <button
              className="lab-swap"
              type="button"
              aria-label="Swap players and seasons"
              title="Swap players and seasons"
              disabled={!pair}
              onClick={() => {
                if (pair) {
                  setLeft({ season: pair.bSeason.id, player: pair.b.name });
                  setRight({ season: pair.aSeason.id, player: pair.a.name });
                }
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" />
              </svg>
            </button>
            <PlayerSelector
              side="b"
              seasons={seasons}
              season={bSeason}
              player={b}
              role={role}
              onSeason={(id) => changeSeason("b", id)}
              onPlayer={(player) =>
                setRight({ season: bSeason?.id ?? "", player })
              }
            />
          </div>
          {pendingSeason && (
            <p className="lab-availability">
              {pendingSeason} player stats are not available yet. Explore a previous season.
            </p>
          )}
        </div>
        <div className="lab-analysis-display">
          <div className="lab-view-bar">
            <div className="lab-views" role="group" aria-label="Chart view">
              {CHART_VIEWS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  aria-controls={resultId}
                  onClick={() => setView(item.id)}
                >
                  <span className="lab-view-number" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <ChartIcon view={item.id} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="lab-toggle" role="group" aria-label="Stat basis">
              {(["totals", "per-game"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={basis === value}
                  onClick={() => setBasis(value)}
                >
                  {value === "totals" ? "Totals" : "Per game"}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-chart-controls">
            <p>
              {basis === "totals"
                ? "Season totals · the full picture."
                : "Per game · compare the pace. Percentages stay unchanged."}
            </p>
            {view === "scatter" && (
              <div>
                <MetricSelect
                  label="X axis"
                  value={xMetric.key}
                  metrics={metrics}
                  onChange={setXKey}
                />
                <MetricSelect
                  label="Y axis"
                  value={yMetric.key}
                  metrics={metrics}
                  onChange={setYKey}
                />
              </div>
            )}
            {view === "trend" && (
              <MetricSelect
                label="Trend metric"
                value={trendMetric.key}
                metrics={metrics}
                onChange={setTrendKey}
              />
            )}
          </div>
          {same && (
            <p role="status" className="lab-notice">
              Same player, same season: the shapes overlap. Choose a different
              season on either side to compare their progression.
            </p>
          )}
          {missingGP && (
            <p role="status" className="lab-notice">
              Per-game stats need games played. Percentages are still available.
            </p>
          )}
          <div
            id={resultId}
            className="lab-results"
            role="region"
            aria-labelledby={`${resultId}-title`}
          >
            <div className="lab-result-heading">
              <div>
                <p className="lab-kicker">
                  {role === "skater" ? "SKATER" : "GOALTENDER"} ANALYSIS /{" "}
                  {basis === "totals" ? "TOTALS" : "PER GAME"}
                </p>
                <h3 id={`${resultId}-title`}>{currentView.description}</h3>
              </div>
              <span className="lab-chart-index" aria-hidden="true">
                0{CHART_VIEWS.findIndex((v) => v.id === view) + 1} / 04
              </span>
            </div>
            <div className="lab-legend">
              {(
                [
                  { side: "a", player: a, season: aSeason },
                  { side: "b", player: b, season: bSeason },
                ] as const
              ).map(({ side, player, season }) => (
                <p className={`lab-side-${side}`} key={side}>
                  <span
                    className={`lab-legend-symbol lab-symbol-${side}`}
                    aria-hidden="true"
                  />
                  <b>{side.toUpperCase()}</b>
                  <span>
                    {player ? getNickname(player.name) : "No player"}
                    <small>
                      {season?.label ?? "No season"}
                      {view === "trend" ? " · selected marker" : ""}
                    </small>
                  </span>
                </p>
              ))}
            </div>
            <p className="lab-sr-only" aria-live="polite">
              {currentView.label}. Side A: {a ? getNickname(a.name) : "no player"},{" "}
              {aSeason?.label}. Side B: {b ? getNickname(b.name) : "no player"}, {bSeason?.label}
              . {basis}.
            </p>
            {!pair ? (
              <div className="lab-empty">
                <h4>No {role} data for this matchup.</h4>
                <p>
                  Choose seasons with recorded {role} statistics on both sides.
                </p>
              </div>
            ) : (
              <>
                {view === "radar" && <RadarChart {...pair} />}
                {view === "bars" && (
                  <>
                    <GroupedBars rows={rows} basis={basis} />
                    <p className="lab-chart-note">
                      Each category has its own numeric scale shared by A and B.
                      Negative plus/minus extends below zero. Missing values are
                      not drawn as bars.
                    </p>
                  </>
                )}
                {view === "scatter" && (
                  <ScatterChart pair={pair} xMetric={xMetric} yMetric={yMetric} />
                )}
                {view === "trend" && (
                  <TrendChart
                    pair={pair}
                    seasons={seasons}
                    metric={trendMetric}
                  />
                )}
                <ComparisonData rows={rows} basis={basis} />
              </>
            )}
          </div>
          <footer className="lab-footnote">
            <span>THE NUMBERS, NOT THE NARRATIVE.</span>
            <p>
              — means unavailable, not zero. Different seasons, different game
              lengths. Switch to per game for a closer look at pace.
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}
