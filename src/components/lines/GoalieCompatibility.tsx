"use client";

import { useId, useMemo, useState } from "react";
import { evaluateGoaliePair, type GoalieDataset } from "@/lib/goalie-lines";
import { getPlayerNumber } from "@/lib/player-numbers";
import type { LinePlayer } from "./line-datasets";
import "./goalie-compatibility.css";

type Props = {
  dataset: GoalieDataset;
  players: LinePlayer[];
  skaters: string[];
  selectedGoalie: string;
  season: string;
  onChooseGoalie: (id: string) => void;
  compact?: boolean;
  viewState?: GoalieCompatibilityViewState;
  onViewStateChange?: (state: GoalieCompatibilityViewState) => void;
};
type Scope = "all" | "line";
type Sort = "compatibility" | "games";
export type GoalieCompatibilityViewState = { scope: Scope; sort: Sort; expandedGames: string[] };
const number = (value: number | null | undefined, digits = 0) =>
  value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
const percent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `${number(value, 1)}%`;

export default function GoalieCompatibility({ dataset, players, skaters, selectedGoalie, season, viewState, onViewStateChange }: Props) {
  const id = useId();
  const [localView, setLocalView] = useState<GoalieCompatibilityViewState>({ scope: "line", sort: "compatibility", expandedGames: [] });
  const view = viewState ?? localView;
  const { scope, sort } = view;
  const updateView = (patch: Partial<GoalieCompatibilityViewState>) => (onViewStateChange ?? setLocalView)({ ...view, ...patch });
  const inLine = useMemo(() => new Set(skaters.filter(player => player.trim())), [skaters]);
  // The picker belongs to the formation. Never preview or assign another goalie.
  const goalie = selectedGoalie ? dataset.players.find(player => player.id === selectedGoalie) : undefined;
  const roleConflict = Boolean(selectedGoalie && inLine.has(selectedGoalie));
  const rows = useMemo(() => {
    if (!goalie || roleConflict) return [];
    return players
      .filter(player => player.id !== goalie.id && (scope === "all" || inLine.has(player.id)))
      .map(player => ({ player, evaluation: evaluateGoaliePair(dataset, player.id, goalie.id) }))
      .sort((a, b) => {
        const left = sort === "games" ? a.evaluation?.stats.games : a.evaluation?.rating.percentage;
        const right = sort === "games" ? b.evaluation?.stats.games : b.evaluation?.rating.percentage;
        return (right ?? -1) - (left ?? -1)
          || (b.evaluation?.stats.games ?? -1) - (a.evaluation?.stats.games ?? -1)
          || a.player.name.localeCompare(b.player.name);
      });
  }, [dataset, players, goalie, roleConflict, scope, inLine, sort]);

  return (
    <aside id="goalie-compatibility" className="goalie-connection goalie-compatibility" aria-labelledby={`${id}-heading`}>
      <header className="gc-heading">
        <p className="gc-eyebrow">THE GOALIE CONNECTION</p>
        <h3 id={`${id}-heading`}>Player fit.</h3>
      </header>
      <div className="gc-scopes" role="group" aria-label="Skaters to compare">
        <button type="button" aria-pressed={scope === "line"} aria-controls={`${id}-results`} onClick={() => updateView({ scope: "line" })}>Your line</button>
        <button type="button" aria-pressed={scope === "all"} aria-controls={`${id}-results`} onClick={() => updateView({ scope: "all" })}>All skaters</button>
      </div>
      {goalie && !roleConflict && <p className="gc-context"><strong>{goalie.name}</strong> · {season}<span>Compatibility · each skater’s shared games</span></p>}
      <div id={`${id}-results`}>
        {!rows.length ? (
          <p className="gc-empty" role="status">{!selectedGoalie
            ? "Pick a goalie to see their fit with each skater."
            : !goalie ? `Your selected goalie is unavailable in ${season}. Pick another goalie.`
            : roleConflict ? "This player is also skating. Update your goalie in the lineup."
            : scope === "line" ? "Add a skater to your line, or choose All skaters."
            : "No skaters are available to compare."}</p>
        ) : (
          <>
            <div className="gc-scroll" role="region" aria-label="Player fit pairings; scroll to see more rows and expanded stats" tabIndex={0}>
              <ol className="gc-list" aria-label={`Sorted by ${sort === "games" ? "games together" : "compatibility"}`}>
                {rows.map(({ player, evaluation }, index) => {
                  const stats = evaluation?.stats;
                  const played = (stats?.games ?? 0) > 0;
                  const rawScore = played ? evaluation?.rating.percentage : null;
                  const score = rawScore != null && Number.isFinite(rawScore) ? rawScore : null;
                  const playerNumber = getPlayerNumber(player.name);
                  // Preserve existing source-game keys; fit disclosure keys share the
                  // planner-owned array so both disclosures survive tab changes.
                  const evidenceKey = `${goalie!.id}|${player.id}`;
                  const fitKey = `fit:${evidenceKey}`;
                  const expanded = view.expandedGames.includes(fitKey) || view.expandedGames.includes(evidenceKey);
                  const detailId = `${id}-pair-${index}`;
                  return (
                    <li className="gc-row" key={player.id}>
                      <button type="button" className="gc-pair-toggle" aria-expanded={expanded} aria-controls={detailId} onClick={() => updateView({
                        expandedGames: expanded
                          ? view.expandedGames.filter(key => key !== fitKey && key !== evidenceKey)
                          : [...view.expandedGames, fitKey],
                      })}>
                        <span className="gc-pair">
                          <span className="gc-player">{playerNumber !== null && <span className="gc-number">#{playerNumber} </span>}<strong>{player.name}</strong></span>
                          <span className="gc-sample">{stats ? `${number(stats.games)} shared ${stats.games === 1 ? "game" : "games"}` : "Sample unavailable"}{played && stats!.games < 5 && <span> · Low sample</span>}</span>
                        </span>
                        <span className={`gc-rating${score === null ? " is-unrated" : ""}`} aria-label={score === null ? "Compatibility: not rated" : `Compatibility: ${number(score)}%`}>{score === null ? "—" : `${number(score)}%`}</span>
                        <span className="gc-chevron" aria-hidden="true">{expanded ? "−" : "+"}</span>
                      </button>
                      <div className="gc-detail" id={detailId} hidden={!expanded}>
                        {score === null && <p className="gc-unrated">Not rated · {played ? "Rating unavailable" : "No shared games"}</p>}
                        <dl className="gc-stats">
                          <div><dt><abbr title="Save percentage">SV%</abbr></dt><dd>{percent(played ? stats?.savePct : null)}</dd></div>
                          <div><dt><abbr title="Recorded goalie goals against per shared game, not time-adjusted GAA">GA / game</abbr></dt><dd>{number(played ? stats?.goalsAgainstPerGame : null, 2)}</dd></div>
                          <div><dt>Record · W–L–D</dt><dd>{played && stats ? `${stats.wins}–${stats.losses}–${stats.draws}` : "—"}</dd></div>
                        </dl>
                        {evaluation && evaluation.matchingGames.length > 0 && (
                          <details className="gc-evidence" open={view.expandedGames.includes(evidenceKey)} onToggle={event => {
                            const open = event.currentTarget.open;
                            if (open !== view.expandedGames.includes(evidenceKey)) updateView({ expandedGames: open ? [...view.expandedGames, evidenceKey] : view.expandedGames.filter(key => key !== evidenceKey) });
                          }}>
                            <summary>Source games ({number(stats?.games)})</summary>
                            <p className="gc-totals">{stats?.saves != null && stats.shotsAgainst != null ? `${number(stats.saves)} saves / ${number(stats.shotsAgainst)} shots` : "Save / shot totals unavailable"}</p>
                            <ul aria-label={`Shared games with ${player.name}`}>
                              {evaluation.matchingGames.map(game => <li key={game.id}>
                                <span>{game.date} · <strong>vs {game.opponent}</strong></span>
                                <span className="gc-game-result">{game.goalsFor > game.goalsAgainst ? "W" : game.goalsFor < game.goalsAgainst ? "L" : "D"} · {game.goalsFor}–{game.goalsAgainst}</span>
                                <span>{number(game.saves)} saves / {number(game.shotsAgainst)} shots · {number(game.goalieGoalsAgainst)} GA</span>
                              </li>)}
                            </ul>
                          </details>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            {rows.length > 3 && <p className="gc-more">{rows.length} pairings · Scroll for more</p>}
          </>
        )}
      </div>
      <a className="gc-stats-link" href="#goalies">Goalie stats with this line ↗</a>
    </aside>
  );
}
