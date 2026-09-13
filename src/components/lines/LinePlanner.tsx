"use client";

import { useMemo, useState } from "react";
import {
  type ChemistrySize,
  type ChemistryEvaluation,
} from "@/lib/line-chemistry";
import { LINE_RATING_DESCRIPTION, PLAYER_RATING_DESCRIPTION, PROJECTED_LINE_RATING_DESCRIPTION } from "@/lib/line-ratings";
import LabSelect from "@/components/ui/LabSelect";
import { evaluateGoalieLine, GOALIE_METHOD_DESCRIPTION, GOALIE_PAIR_METHOD_DESCRIPTION, type GoalieDataset } from "@/lib/goalie-lines";
import GoalieImpact, { GOALIE_STATS_NOTES, type GoalieImpactViewState } from "./GoalieImpact";
import GoalieCompatibility, { type GoalieCompatibilityViewState } from "./GoalieCompatibility";
import LineIdeas from "./LineIdeas";
import { getPlayerNumber } from "@/lib/player-numbers";
import { lineDraftKey, type LineDataset } from "./line-datasets";
import { evaluateBuilderLine, recommendBuilderLines, type BuilderSort } from "./line-builder";
import "./line-planner.css";

export type { LinePlayer } from "./line-datasets";
type Props = { dataset: LineDataset };
const EMPTY_GOALIES: GoalieDataset = { players: [], games: [] };
const positions: Record<ChemistrySize, string[]> = {
  2: ["Player one", "Player two"],
  3: ["Center", "Wing", "Defense"],
  5: ["Left wing", "Center", "Right wing", "Left defense", "Right defense"],
};
const shortPositions: Record<ChemistrySize, string[]> = { 2: ["01", "02"], 3: ["C", "W", "D"], 5: ["LW", "C", "RW", "LD", "RD"] };
const formats: { size: ChemistrySize; label: string }[] = [{ size: 2, label: "Pair" }, { size: 3, label: "3s line" }, { size: 5, label: "Full unit" }];
const number = (n: number | null, digits = 1) => n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits });

export default function LinePlanner({ dataset }: Props) {
  const { games, players, season } = dataset;
  const draftKey = lineDraftKey(dataset);
  const goalieDataset = dataset.goalies ?? EMPTY_GOALIES;
  const [goalieId, setGoalieId] = useState("");
  const [size, setSize] = useState<ChemistrySize>(3);
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [available, setAvailable] = useState(() => players.map(player => player.id));
  const [minGames, setMinGames] = useState(0);
  const [sort, setSort] = useState<BuilderSort>("chemistry");
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Keep companion filters and lower-view choices alongside the draft.
  const [pairingView, setPairingView] = useState<GoalieCompatibilityViewState>({ scope: "line", sort: "compatibility", expandedGames: [] });
  const [goalieView, setGoalieView] = useState<GoalieImpactViewState>({ mode: "line", sort: "savePct" });
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [pairsOpen, setPairsOpen] = useState(false);
  const filled = slots.filter(Boolean).length;
  const complete = filled === size;
  const selected = useMemo(() => evaluateBuilderLine(games, complete ? slots : [], players), [games, slots, complete, players]);
  const selectedGoalie = goalieDataset.players.find(goalie => goalie.id === goalieId);
  const goalieLine = useMemo(() => evaluateGoalieLine(goalieDataset, complete ? slots : [], goalieId), [goalieDataset, slots, complete, goalieId]);
  const rating = goalieId ? goalieLine?.rating ?? { percentage: null, grade: null } : selected.rating;
  const evaluatedStats = goalieId ? goalieLine?.stats : selected.stats;
  const supportingGames = goalieId ? goalieLine?.matchingGames ?? [] : selected.matchingGames;
  const projected = !goalieId && selected.ratingSource === "projected";
  const recommendations = useMemo(() => recommendBuilderLines(games, players, size, { available, minGames, sort }), [games, players, size, available, minGames, sort]);
  const display = (id: string) => players.find(player => player.id === id)?.name ?? id;
  const pairs = useMemo(() => slots.flatMap((player, i) => player ? slots.slice(i + 1).filter(Boolean).map(other => evaluateBuilderLine(games, [player, other], players)) : []), [slots, games, players]);

  function changeSize(next: ChemistrySize) {
    if (next === size) return;
    setSize(next);
    setSlots(current => Array.from({ length: next }, (_, index) => current[index] ?? ""));
    setShowAll(false);
    setMessage("");
  }
  function choose(index: number, id: string) {
    if (id && id === goalieId) setGoalieId("");
    setSlots(current => {
      const next = [...current];
      const duplicate = id ? next.indexOf(id) : -1;
      if (duplicate >= 0 && duplicate !== index) next[duplicate] = next[index];
      next[index] = id;
      return next;
    });
    setMessage("");
  }
  function chooseGoalie(id: string) {
    if (id && !goalieDataset.players.some(goalie => goalie.id === id)) return;
    setGoalieId(id);
    if (id) setSlots(current => current.map(player => player === id ? "" : player));
    setMessage("");
  }
  function availability(id: string) {
    const removing = available.includes(id);
    setAvailable(current => removing ? current.filter(value => value !== id) : [...current, id]);
    if (removing) setSlots(current => current.map(value => value === id ? "" : value));
    setShowAll(false);
  }
  function apply(line: ChemistryEvaluation) {
    if (line.players.includes(goalieId)) setGoalieId("");
    setSlots([...line.players]);
    setMessage("Line loaded. Switch any player to try a different fit.");
    document.getElementById("line-board")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function save() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ datasetId: dataset.id, season, size, slots, available, goalieId }));
      setMessage(`${season} draft saved on this device.`);
    } catch { setMessage("Your browser couldn’t save this draft. You can keep building here."); }
  }
  function restore() {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) { setMessage(`No saved ${season} draft yet.`); return; }
      const draft = JSON.parse(stored);
      if (draft.datasetId !== dataset.id || draft.season !== season || ![2, 3, 5].includes(draft.size) || !Array.isArray(draft.slots) || !Array.isArray(draft.available)) throw new Error("Invalid draft");
      const ids = new Set(players.map(player => player.id));
      const pool: string[] = [...new Set<string>(draft.available.filter((id: unknown) => typeof id === "string" && ids.has(id)))];
      const used = new Set<string>();
      const restored = Array.from({ length: draft.size }, (_, index) => {
        const id = draft.slots[index];
        if (typeof id !== "string" || !pool.includes(id) || used.has(id)) return "";
        used.add(id); return id;
      });
      const restoredGoalie = typeof draft.goalieId === "string" && goalieDataset.players.some(goalie => goalie.id === draft.goalieId) && !used.has(draft.goalieId) ? draft.goalieId : "";
      setSize(draft.size); setSlots(restored); setAvailable(pool); setGoalieId(restoredGoalie); setShowAll(false);
      setMessage(`${season} draft restored.`);
    } catch { setMessage("That draft couldn’t be restored. Pick your players to start again."); }
  }

  return <div className="line-planner">
    <div className="line-workspace" id="line-board">
      <div className="line-draft">
        <div className="line-draft-heading"><div><span className="line-micro">MAKE THE CONNECTION</span><h3>Build your <em>line.</em></h3></div><div className="line-formats" role="group" aria-label="Combination size">{formats.map(format => <button type="button" key={format.size} aria-pressed={size === format.size} onClick={() => changeSize(format.size)}>{format.label}</button>)}</div></div>
        <div className={`line-formation line-formation-${size}`}>
          <div className="line-connections" aria-hidden="true">
            <svg viewBox="0 0 600 410" preserveAspectRatio="none"><path className="line-triangle" d={size === 3 ? "M150 50 450 50 300 255Z" : "M300 50 150 255 450 255Z"} /><path className="line-pair-link" d="M150 50H450" /></svg>
          </div>
          <div className="line-slots">
            {positions[size].map((position, index) => {
              const player = players.find(player => player.id === slots[index]);
              const playerNumber = player ? getPlayerNumber(player.name) : null;
              return <div className={`line-slot ${player ? "is-selected" : ""}`} key={position} data-position={shortPositions[size][index]}>
                <LabSelect id={`line-slot-${index}`} label={position} compact variant="player" playerNumber={playerNumber} value={slots[index]} onChange={id => choose(index, id)} disabled={!available.length} placeholder="Pick a player" searchable triggerContent={<>
                  <span className="line-player-node" aria-hidden="true">{player ? playerNumber ?? "—" : "+"}<span className="line-position">{shortPositions[size][index]}</span></span>
                  <span className="line-player-name">{player?.name ?? "Add player"}</span>
                  <span className="line-player-edit">{player ? "Change player" : "Choose your player"}<span aria-hidden="true">↗</span></span>
                </>} options={[
                  { value: "", label: "Empty slot", description: "Remove this player" },
                  ...players.filter(player => available.includes(player.id)).map(player => ({ value: player.id, label: player.name, number: getPlayerNumber(player.name), description: `${player.position}${slots.includes(player.id) ? " · In your line" : ""}`, badge: player.grade ? `${player.grade} grade` : undefined })),
                ]} />
                <p className="line-player-grade">{player && <>{player.gradeSource === "lab-performance" ? "Lab grade" : "Grade"} <strong>{player.grade ?? "—"}</strong>{player.overallRating !== null && <span> · {number(player.overallRating)} OVR</span>}</>}</p>
              </div>;
            })}
          </div>
          <p className="line-formation-caption"><span>{filled} / {size} skaters selected</span><span>{season}</span></p>
        </div>
        {!players.length && <p className="line-inline-empty">No skaters in this season yet. Try the archive to build a line.</p>}
      </div>
      <aside className="line-evaluation player-connection" aria-label="Player connection" aria-live="polite" aria-atomic="true">
        <div className="line-evaluation-top"><span className="line-micro">THE PLAYER CONNECTION</span><span className="line-live-dot" aria-hidden="true" /></div>
        <h3>{goalieId ? "Unit chemistry" : "Line chemistry"}</h3>
        <div className={`line-chemistry-dial ${rating.percentage !== null ? "has-rating" : ""}`}>
          <svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="78" /><circle cx="90" cy="90" r="78" pathLength="100" strokeDasharray={`${rating.percentage ?? 0} 100`} /></svg>
          <div><strong>{rating.percentage ?? "—"}{rating.percentage !== null && <small>%</small>}</strong><span>{projected ? "PROJECTED FIT" : "CHEMISTRY INDEX"}</span></div>
        </div>
        <div className="line-overall-grade"><span>{projected ? "Projected grade" : goalieId ? "Unit grade" : "Line grade"}</span><strong>{rating.grade ?? "—"}</strong></div>
        <p className="line-score-caption">{!complete ? `Choose ${size - filled} more ${size - filled === 1 ? "skater" : "skaters"} to see how your line stacks up.` : goalieId ? goalieLine?.stats.games ? `${goalieLine.stats.games} games with ${selectedGoalie?.name}.` : "No full-unit games yet. Individual goalie–skater pairings are shown below." : selected.stats.games ? `Based on ${selected.stats.games} shared ${selected.stats.games === 1 ? "game" : "games"}${selected.stats.games < 5 ? " · Early chemistry" : ""}.` : projected ? "Projected from player season stats. No shared games yet." : "Not enough player stats to rate this combination yet."}</p>
        <div className="line-stat-grid">
          <div><strong>{complete ? evaluatedStats?.games ?? 0 : "—"}</strong><span>Games together</span></div>
          <div><strong>{evaluatedStats?.games ? `${evaluatedStats.wins}–${evaluatedStats.losses}${evaluatedStats.draws ? `–${evaluatedStats.draws}` : ""}` : "—"}</strong><span>Team record</span></div>
          <div><strong>{goalieId ? `${number(goalieLine?.stats.savePct ?? null)}${goalieLine?.stats.savePct != null ? "%" : ""}` : number(selected.stats.gfPerGame)}</strong><span>{goalieId ? "Goalie save %" : "Goals for / game"}</span></div>
          <div><strong>{number(goalieId ? goalieLine?.stats.goalsAgainstPerGame ?? null : selected.stats.gaPerGame)}</strong><span>{goalieId ? "Goalie GA / game" : "Against / game"}</span></div>
        </div>
        <a className="line-score-link" href="#chemistry-method" onClick={() => { const method = document.getElementById("chemistry-method"); if (method instanceof HTMLDetailsElement) method.open = true; }}>How chemistry &amp; grades work <span aria-hidden="true">↗</span></a>
        <p className="line-score-source">Bardownski index · not a win prediction</p>
      </aside>
      <div className="line-goalie-slot">
        <div className="line-goalie-intro"><span className="line-micro">COMPLETE THE UNIT</span><h4>In the <em>crease.</em></h4><p>Pick a goalie. See who they click with.</p><a href="#goalie-compatibility">Player compatibility <span aria-hidden="true">↘</span></a></div>
        <div className={`line-slot line-netminder ${selectedGoalie ? "is-selected" : ""}`} data-position="G">
          <LabSelect id="line-goalie" label="Goalie" compact variant="player" playerNumber={selectedGoalie ? getPlayerNumber(selectedGoalie.name) : null} value={goalieId} onChange={chooseGoalie} disabled={!goalieDataset.players.length} placeholder="Add goalie" triggerContent={<>
            <span className="line-player-node" aria-hidden="true">{selectedGoalie ? getPlayerNumber(selectedGoalie.name) ?? "—" : "+"}<span className="line-position">G</span></span>
            <span className="line-player-name">{selectedGoalie?.name ?? "Add goalie"}</span>
            <span className="line-player-edit">{selectedGoalie ? "Change goalie" : "Optional"}<span aria-hidden="true">↗</span></span>
          </>} options={[
            { value: "", label: "No goalie", description: "Compare skaters only" },
            ...goalieDataset.players.map(goalie => ({ value: goalie.id, label: goalie.name, number: getPlayerNumber(goalie.name), description: `${goalie.games} goalie games${slots.includes(goalie.id) ? " · Move from skater slot" : ""}`, badge: goalie.savePct === null ? undefined : `${number(goalie.savePct)}% SV` })),
          ]} />
          <p className="line-player-grade">{selectedGoalie ? `${number(selectedGoalie.savePct)}${selectedGoalie.savePct === null ? "" : "%"} SV · ${number(selectedGoalie.gaa, 2)} GAA · Season` : goalieDataset.players.length ? "Pick your last line of defense" : "No goalies in this season yet"}</p>
        </div>
      </div>
      <GoalieCompatibility compact dataset={goalieDataset} players={players} skaters={slots} selectedGoalie={goalieId} season={season} onChooseGoalie={chooseGoalie} viewState={pairingView} onViewStateChange={setPairingView} />
      <div className="line-workspace-actions">
        <div className="line-draft-actions"><button type="button" onClick={save} disabled={!filled && !goalieId}>Save line <span aria-hidden="true">↗</span></button><button type="button" onClick={restore}>Load saved</button><button type="button" onClick={() => { setSlots(Array(size).fill("")); setGoalieId(""); setMessage("Line cleared."); }} disabled={!filled && !goalieId}>Clear line</button><span>YOUR LINE. YOUR CALL.</span></div>
        <p className="line-message" role="status">{message}</p>
      </div>
    </div>

    <LineIdeas season={season} panels={{
      stats: <GoalieImpact compact dataset={goalieDataset} skaters={slots} selectedGoalie={goalieId} season={season} onChoose={chooseGoalie} viewState={goalieView} onViewStateChange={setGoalieView} />,
      ideas: <section className="line-recommendations" id="recommendations-title" aria-label="Line ideas">
      <div className="line-section-head"><p className="line-ideas-intro">Try a skater combination, then add your goalie to test the full unit.</p><div className="line-rank-filters">
        <LabSelect id="line-rank-sort" searchable={false} label="Sort combinations" value={sort} onChange={value => { setSort(value as typeof sort); setShowAll(false); }} options={[{ value: "chemistry", label: "Chemistry" }, { value: "reliable", label: "Sample-adjusted wins" }, { value: "win-rate", label: "Win percentage" }, { value: "goal-difference", label: "Goal difference" }, { value: "attack", label: "Goals per game" }]} />
        <LabSelect id="line-min-games" searchable={false} label="Games together" value={String(minGames)} onChange={value => { setMinGames(Number(value)); setShowAll(false); }} options={[{ value: "0", label: "Any / new lines" }, ...[1, 3, 5, 10].map(value => ({ value: String(value), label: `${value}+ ${value === 1 ? "game" : "games"}` }))]} />
      </div></div>
      <details className="line-availability" open={availabilityOpen} onToggle={event => setAvailabilityOpen(event.currentTarget.open)}><summary>Who’s playing? <span>{available.length} / {players.length} available</span></summary><div className="line-pool"><fieldset><legend className="line-sr-only">Available skaters</legend>{players.map(player => <label key={player.id}><input type="checkbox" checked={available.includes(player.id)} onChange={() => availability(player.id)} /><span>{player.name}</span><b>{player.grade ?? "—"}</b></label>)}</fieldset><div className="line-pool-actions"><button type="button" onClick={() => setAvailable(players.map(player => player.id))}>Select all</button><button type="button" onClick={() => { setAvailable([]); setSlots(Array(size).fill("")); setShowAll(false); }}>Clear pool</button></div></div></details>
      {recommendations.length ? <><div className="line-combination-grid">{recommendations.slice(0, showAll ? undefined : 3).map((line, index) => {
        const lineRating = line.rating;
        const active = complete && line.players.every(id => slots.includes(id));
        return <article className={`line-combination ${active ? "is-active" : ""}`} key={line.players.join("|")}>
          <div className="line-combination-top"><span>{String(index + 1).padStart(2, "0")}</span><strong aria-label={`Line grade ${lineRating.grade}`}>{lineRating.grade}</strong></div>
          <p className="line-combination-score">{lineRating.percentage}<span>%</span><small>{line.ratingSource === "projected" ? "PROJECTED FIT" : "CHEMISTRY"}</small></p>
          <ul>{line.players.map(id => <li key={id}><span className="line-combination-number">{getPlayerNumber(display(id)) ?? "—"}</span>{display(id)}<span className="line-combination-player-grade">{players.find(player => player.id === id)?.grade ?? "—"}</span></li>)}</ul>
          <p className="line-combination-record">{line.ratingSource === "projected" ? "New combination · Season-stat projection" : <>{line.stats.games} together <span>·</span> {line.stats.wins}W – {line.stats.losses}L{line.stats.draws ? ` – ${line.stats.draws}D` : ""}</>}</p>
          <button type="button" onClick={() => apply(line)} aria-label={`Use combination ${line.players.map(display).join(", ")}`}>{active ? "In your lineup" : "Try this line"}<span aria-hidden="true">{active ? "✓" : "↗"}</span></button>
        </article>;
      })}</div>{recommendations.length > 3 && <button className="line-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show top three" : `Explore all ${recommendations.length} combinations`} <span aria-hidden="true">{showAll ? "−" : "+"}</span></button>}</> : <div className="line-empty"><h4>No lines here. Yet.</h4><p>{available.length < size ? `Choose at least ${size} available players for this formation.` : "Try fewer games together or a smaller formation to find a combination."}</p></div>}
      {pairs.length > 0 && <details className="line-pair-details" id="line-pair-title" open={pairsOpen} onToggle={event => setPairsOpen(event.currentTarget.open)}><summary>Skater pair details <span>{pairs.length} pairings</span></summary><div className="line-pairs">{pairs.map(pair => {
        const pairRating = pair.rating;
        return <div key={pair.players.join("|")}><span>{pair.players.map(display).join(" + ")}</span><strong>{pairRating.percentage === null ? "—" : `${pairRating.percentage}%`}</strong><small>{pair.ratingSource === "projected" ? "Projected fit · no shared games" : `${pair.stats.games} shared ${pair.stats.games === 1 ? "game" : "games"}`}</small></div>;
      })}</div></details>}
    </section>,
    }} method={<details className="line-method line-ideas-method" id="chemistry-method"><summary>How ratings work</summary><div>
        <details className="line-method-topic"><summary>Skater chemistry &amp; projected fit</summary><div>
          <p>{LINE_RATING_DESCRIPTION}</p>
          <p>{PROJECTED_LINE_RATING_DESCRIPTION}</p>
          <p>Only games with every selected skater count toward a line. Results are team outcomes, not isolated on-ice stats. Position slots are your assignments; swapping the same players between positions does not change their chemistry. Pair samples overlap and are not added together. Small samples can change quickly.</p>
          <p>Each season stands on its own. Your saved line stays on this device and never publishes a team lineup.</p>
        </div></details>
        <details className="line-method-topic"><summary>Individual player grades</summary><div><p>{PLAYER_RATING_DESCRIPTION}</p></div></details>
        <details className="line-method-topic"><summary>Goalie–skater compatibility</summary><div>
          <p>{GOALIE_PAIR_METHOD_DESCRIPTION}</p>
          <p>Every row is one goalie + one skater. Early pairings have fewer than five shared games. Open a pairing’s details beside the goalie for its source results.</p>
        </div></details>
        <details className="line-method-topic"><summary>Goalie stats &amp; shared-unit results</summary><div>
          <p>{GOALIE_METHOD_DESCRIPTION}</p>
          {GOALIE_STATS_NOTES.map(note => <p key={note}>{note}</p>)}
        </div></details>
        {complete && supportingGames.length > 0 && <details className="line-evidence"><summary>Games behind this line <span>{supportingGames.length} games</span></summary><ul>{supportingGames.map(game => <li key={game.id}><span>{game.opponent}<small>{game.date}</small></span><strong>{game.goalsFor}–{game.goalsAgainst}</strong><span>{game.goalsFor > game.goalsAgainst ? "WIN" : game.goalsFor < game.goalsAgainst ? "LOSS" : "DRAW"}</span></li>)}</ul></details>}
      </div></details>} />
  </div>;
}
