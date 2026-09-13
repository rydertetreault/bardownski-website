"use client";

import { useId, useMemo, useState } from "react";
import LabSelect from "@/components/ui/LabSelect";
import {
  evaluateGoalieLine,
  type GoalieDataset,
  type GoalieLineEvaluation,
  type GoalieProfile,
} from "@/lib/goalie-lines";
import { getPlayerNumber } from "@/lib/player-numbers";
import "./goalie-impact.css";

type Props = {
  dataset: GoalieDataset;
  skaters: string[];
  selectedGoalie: string;
  season: string;
  onChoose: (id: string) => void;
  compact?: boolean;
  viewState?: GoalieImpactViewState;
  onViewStateChange?: (state: GoalieImpactViewState) => void;
};
type Mode = "season" | "line";
type Sort = "savePct" | "goalsAllowed" | "wins" | "games";
export type GoalieImpactViewState = { mode: Mode; sort: Sort };
export const GOALIE_STATS_NOTES = [
  "Save % uses total saves ÷ shots when available, otherwise the reported season percentage. GA / game is goals allowed per shared game, not time-adjusted GAA. Season GAA is the reported average.",
  "Win % is wins ÷ games. A dash means unavailable, not zero. Only games with every selected skater and this goalie count in ‘With this line’; no shared games means no rating or projection.",
  "Small samples change quickly. List order is not a recommendation, and team results do not isolate a goalie’s contribution.",
];
type GoalieRow = {
  goalie: GoalieProfile;
  evaluation: GoalieLineEvaluation | null;
  games: number | null;
  savePct: number | null;
  goalsAllowed: number | null;
  wins: number | null;
  winPct: number | null;
  saves: number | null;
  shotsAgainst: number | null;
};

const format = (value: number | null, digits = 0) =>
  value === null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number | null) => value === null ? "—" : `${format(value, 1)}%`;

function seasonRow(goalie: GoalieProfile): GoalieRow {
  const played = goalie.games > 0;
  // Weight by shots, never by the number of game-level percentages.
  const savePct = goalie.saves !== null && goalie.shotsAgainst !== null && goalie.shotsAgainst > 0
    ? goalie.saves / goalie.shotsAgainst * 100
    : goalie.savePct;
  return {
    goalie,
    evaluation: null,
    games: goalie.games,
    savePct: played ? savePct : null,
    goalsAllowed: played ? goalie.gaa : null,
    wins: played ? goalie.wins : null,
    winPct: played && goalie.wins !== null ? goalie.wins / goalie.games * 100 : null,
    saves: played ? goalie.saves : null,
    shotsAgainst: played ? goalie.shotsAgainst : null,
  };
}

function lineRow(goalie: GoalieProfile, evaluation: GoalieLineEvaluation | null): GoalieRow {
  const stats = evaluation?.stats;
  const played = stats !== undefined && stats.games > 0;
  return {
    goalie,
    evaluation,
    games: stats?.games ?? null,
    savePct: played ? stats.savePct : null,
    goalsAllowed: played ? stats.goalsAgainstPerGame : null,
    wins: played ? stats.wins : null,
    winPct: played ? stats.winPct : null,
    saves: played ? stats.saves : null,
    shotsAgainst: played ? stats.shotsAgainst : null,
  };
}

export default function GoalieImpact({ dataset, skaters, selectedGoalie, season, onChoose, compact = false, viewState, onViewStateChange }: Props) {
  const id = useId();
  const [localView, setLocalView] = useState<GoalieImpactViewState>({ mode: "season", sort: "savePct" });
  const { mode, sort } = viewState ?? localView;
  const updateView = (patch: Partial<GoalieImpactViewState>) => (onViewStateChange ?? setLocalView)({ mode, sort, ...patch });
  // Keep empty slots: filtering them would turn an unfinished trio into a pair.
  const complete = [2, 3, 5].includes(skaters.length)
    && skaters.every(Boolean)
    && skaters.every(player => player.trim().length > 0)
    && new Set(skaters).size === skaters.length;
  const pool = useMemo(() => dataset.players.filter(player => !skaters.includes(player.id)), [dataset.players, skaters]);
  const rows = useMemo(() => {
    const candidates = pool.map(goalie => mode === "season"
      ? seasonRow(goalie)
      : lineRow(goalie, complete ? evaluateGoalieLine(dataset, skaters, goalie.id) : null));
    return candidates.sort((a, b) => {
      const left = a[sort];
      const right = b[sort];
      // Unknown values stay last even when sorting goals allowed ascending.
      if (left === null && right !== null) return 1;
      if (left !== null && right === null) return -1;
      const difference = left !== null && right !== null
        ? (sort === "goalsAllowed" ? left - right : right - left)
        : 0;
      return difference || (b.games ?? -1) - (a.games ?? -1) || a.goalie.name.localeCompare(b.goalie.name);
    });
  }, [pool, mode, complete, dataset, skaters, sort]);
  const selected = pool.find(goalie => goalie.id === selectedGoalie);
  const roleConflict = Boolean(selectedGoalie) && skaters.includes(selectedGoalie);
  const unavailableLine = mode === "line" && complete && rows.length > 0 && rows.every(row => row.evaluation === null);
  const showRows = pool.length > 0 && (mode === "season" || (complete && !unavailableLine));
  const sortOptions = [
    { value: "savePct", label: "Save % · highest first" },
    { value: "goalsAllowed", label: `${mode === "line" ? "GA / game" : "GAA"} · lowest first` },
    { value: "wins", label: "Wins · most first" },
    { value: "games", label: "Games · most first" },
  ];

  return (
    <section className={`goalie-impact${compact ? " is-compact" : ""}`} id="goalies" aria-labelledby={compact ? undefined : `${id}-heading`} aria-label={compact ? "Goalie stats" : undefined}>
      {!compact && <header className="goalie-impact-heading">
        <div>
          <p className="goalie-impact-kicker">THE SEASON LEDGER</p>
          <h2 id={`${id}-heading`}>Goalie <em>numbers.</em></h2>
          <p className="goalie-impact-intro">The bigger picture behind the net. Compare season totals or games with your full skater selection.</p>
        </div>
        <p className="goalie-impact-season">{season}<span>{pool.length} {pool.length === 1 ? "goalie available" : "goalies available"}</span></p>
      </header>}

      <div className="goalie-impact-toolbar">
        <div className="goalie-impact-modes" role="group" aria-label="Goalie statistics scope">
          <button type="button" aria-pressed={mode === "season"} aria-controls={`${id}-results`} onClick={() => updateView({ mode: "season" })}>Season stats</button>
          <button type="button" aria-pressed={mode === "line"} aria-controls={`${id}-results`} onClick={() => updateView({ mode: "line" })}>With this line</button>
        </div>
        {(!compact || (showRows && rows.length > 1)) && <div className="goalie-impact-sort">
          <LabSelect id={`${id}-sort`} label="Order goalies by" searchable={false} value={sort} onChange={value => updateView({ sort: value as Sort })} options={sortOptions} disabled={!showRows || rows.length < 2} />
        </div>}
      </div>

      <p className="goalie-impact-context" role="status" aria-atomic="true">
        {mode === "season" ? "Season totals · all goalie appearances." : complete && !unavailableLine ? "Shared games only · this goalie and every selected skater." : "With this line · a complete, valid skater selection is needed."}
        {!compact && selected && <span>In your lineup: <strong>{selected.name}</strong>.</span>}
        {roleConflict && <span>A player cannot skate and play goal in the same line. Choose another goalie or change your skaters.</span>}
      </p>

      <div id={`${id}-results`}>
        {!pool.length ? (
          <div className="goalie-impact-empty">
            <h3>{dataset.players.length ? "Already on the ice." : "No goalies on the sheet. Yet."}</h3>
            <p>{dataset.players.length ? "Every goalie in this season is currently selected as a skater. Free a skater slot to use that player in goal." : `There are no goalie profiles available for ${season}. Try another season when available.`}</p>
          </div>
        ) : mode === "line" && (!complete || unavailableLine) ? (
          <div className="goalie-impact-empty">
            <h3>{!complete ? "Build the line. Then see the fit." : "This line can’t be evaluated yet."}</h3>
            <p>{!complete ? "Fill every slot with a different skater in a pair, 3s line or five-player unit to see shared-game stats." : "Check your skater selection and keep each player in one role. You can still explore season stats."}</p>
            <button type="button" onClick={() => updateView({ mode: "season" })}>See season stats <span aria-hidden="true">↗</span></button>
          </div>
        ) : (
          <>
            {!compact && pool.length === 1 && <p className="goalie-impact-single">One goalie available. Their numbers are here to explore, not a head-to-head ranking.</p>}
            <ol className="goalie-impact-list" aria-label={`${mode === "line" ? "With this line" : "Season"} goalies, ordered by ${sortOptions.find(option => option.value === sort)?.label}`}>
              {rows.map((row, index) => {
                const { goalie, evaluation } = row;
                const active = selectedGoalie === goalie.id;
                const playerNumber = getPlayerNumber(goalie.name);
                const record = mode === "line" && evaluation && evaluation.stats.games > 0
                  ? `${evaluation.stats.wins}W–${evaluation.stats.losses}L${evaluation.stats.draws ? `–${evaluation.stats.draws}D` : ""}`
                  : format(row.wins);
                return (
                  <li className={`goalie-impact-row${active ? " is-selected" : ""}`} key={goalie.id}>
                    <div className="goalie-impact-identity">
                      <span className="goalie-impact-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <span className="goalie-impact-number">GOALIE{playerNumber !== null && <> / <span aria-label={`Number ${playerNumber}`}>#{playerNumber}</span></>}</span>
                        <h3>{goalie.name}</h3>
                        <p className="goalie-impact-sample">{row.games === null ? "Line unavailable" : row.games === 0 ? mode === "line" ? "No shared games yet" : "No season appearances yet" : `${row.games} ${mode === "line" ? "shared " : ""}${row.games === 1 ? "game" : "games"}${row.games < 5 ? " · Small sample" : ""}`}</p>
                      </div>
                    </div>
                    <dl className="goalie-impact-stats">
                      <div className={sort === "games" ? "is-sorted" : undefined}><dt>{mode === "line" ? "Shared games" : "Games"}</dt><dd>{format(row.games)}</dd></div>
                      <div className={sort === "savePct" ? "is-sorted" : undefined}><dt>Save %</dt><dd>{percent(row.savePct)}</dd></div>
                      <div className={sort === "goalsAllowed" ? "is-sorted" : undefined}><dt><abbr title={mode === "line" ? "Goals against per shared game" : "Season goals-against average"}>{mode === "line" ? "GA / game" : "GAA"}</abbr></dt><dd>{format(row.goalsAllowed, 2)}</dd></div>
                      <div className={`goalie-impact-record${sort === "wins" ? " is-sorted" : ""}`}><dt>{mode === "line" ? "Team record" : "Wins"}</dt><dd>{record}</dd></div>
                      <div><dt>Win %</dt><dd>{percent(row.winPct)}</dd></div>
                    </dl>
                    <button className="goalie-impact-choose" type="button" onClick={() => onChoose(goalie.id)} aria-pressed={active} aria-label={`${active ? "Selected goalie" : "Use goalie"}: ${goalie.name}`}>
                      {active ? "In your lineup" : "Use goalie"}<span aria-hidden="true">{active ? "✓" : "↗"}</span>
                    </button>
                    <p className="goalie-impact-evidence">{row.games === 0 ? mode === "line" ? "No games together yet." : "No season games yet." : row.games === null ? "Shared-game stats unavailable." : row.saves !== null && row.shotsAgainst !== null ? `${format(row.saves)} saves / ${format(row.shotsAgainst)} shots against` : "Save / shot totals unavailable."}</p>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      {!compact && <footer className="goalie-impact-notes">
        <p>Team results are context, not isolated goalie impact.</p>
        <details className="goalie-impact-about">
          <summary>About goalie stats</summary>
          <div>
            {GOALIE_STATS_NOTES.map(note => <p key={note}>{note}</p>)}
          </div>
        </details>
      </footer>}
    </section>
  );
}
