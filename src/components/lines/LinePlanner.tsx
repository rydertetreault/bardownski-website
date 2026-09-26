"use client";

import { useMemo, useState } from "react";
import { type ChemistrySize } from "@/lib/line-chemistry";
import { PLAYER_RATING_DESCRIPTION } from "@/lib/line-ratings";
import { CONNECTION_DESCRIPTION, connectionGameMode, ConnectionModel, SUGGESTION_SORTS, type ConnectionRecord, type ConnectionResult, type Position, type SlotRole, type Suggestion, type SuggestionSort, type UsedLine } from "@/lib/line-connection";
import LabSelect from "@/components/ui/LabSelect";
import { GOALIE_METHOD_DESCRIPTION, GOALIE_PAIR_METHOD_DESCRIPTION, type GoalieDataset } from "@/lib/goalie-lines";
import GoalieImpact, { GOALIE_STATS_NOTES, type GoalieImpactViewState } from "./GoalieImpact";
import GoalieCompatibility, { type GoalieCompatibilityViewState } from "./GoalieCompatibility";
import LineIdeas from "./LineIdeas";
import { getPlayerNumber } from "@/lib/player-numbers";
import { lineDraftKey, type LineDataset } from "./line-datasets";
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
/** Slot roles drive the position-fit check; the pair builder has no positions. */
const slotRoles: Record<ChemistrySize, SlotRole[]> = { 2: ["any", "any"], 3: ["C", "W", "D"], 5: ["LW", "C", "RW", "LD", "RD"] };
const positionNames: Record<Position, string> = { C: "center", LW: "left wing", RW: "right wing", D: "defense", G: "goal" };
const roleNames: Record<SlotRole, string> = { any: "this slot", C: "center", W: "wing", LW: "left wing", RW: "right wing", D: "defense", LD: "left defense", RD: "right defense" };
/** The card's headline: whatever the list is sorted by. */
const headline = (source: ConnectionRecord, result: ConnectionResult, sort: SuggestionSort): { value: string; unit?: string; label: string } => {
  const { games, wins, draws, goalsFor, goalsAgainst } = source;
  const perGame = (value: number) => (value / games).toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  if (sort === "connection") return { value: String(result.percentage), unit: "%", label: "CONNECTION" };
  if (sort === "games") return { value: String(games), label: games === 1 ? "GAME TOGETHER" : "GAMES TOGETHER" };
  if (!games) return { value: "—", label: "NO GAMES YET" };
  switch (sort) {
    case "wins": return { value: String(wins), label: wins === 1 ? "WIN TOGETHER" : "WINS TOGETHER" };
    case "win-pct": return { value: String(Math.round(100 * (wins + draws / 2) / games)), unit: "%", label: "WIN RATE" };
    case "goal-diff": return { value: `${goalsFor > goalsAgainst ? "+" : goalsFor < goalsAgainst ? "−" : ""}${perGame(Math.abs(goalsFor - goalsAgainst))}`, label: "GOAL DIFF / GAME" };
    case "goals-for": return { value: perGame(goalsFor), label: "GOALS FOR / GAME" };
    case "goals-against": return { value: perGame(goalsAgainst), label: "AGAINST / GAME" };
  }
};
const evidenceText = (result: ConnectionResult, goalie: string | undefined) => {
  const games = result.unit.games;
  const who = goalie ? ` with ${goalie} in net` : "";
  if (result.evidence === "proven" || result.evidence === "early") return `${games} ${games === 1 ? "game" : "games"} together${who}${result.evidence === "early" ? " · Early read" : ""}. Pair history fills in the rest.`;
  if (result.evidence === "pairs") return `No games as this exact group${who}. Built from the pairs that have played together.`;
  return `No games together yet${who}. Projected from each player's form and rating.`;
};
/** Goalie crease diagram (600×420, net at 300,400): the cone spans the shooting angles
 * the goalie cuts off (±34° from straight out), and waves pulse outward along it. */
const CREASE_ANGLE = 34 * Math.PI / 180;
const creasePoint = (radius: number, side: -1 | 1) => `${(300 + side * radius * Math.sin(CREASE_ANGLE)).toFixed(1)} ${(400 - radius * Math.cos(CREASE_ANGLE)).toFixed(1)}`;
const CREASE_CONE = `M300 400L${creasePoint(380, -1)}A380 380 0 0 1 ${creasePoint(380, 1)}Z`;
const CREASE_EDGES = `M300 400L${creasePoint(380, -1)}M300 400L${creasePoint(380, 1)}`;
const CREASE_WAVE = `M${creasePoint(380, -1)}A380 380 0 0 1 ${creasePoint(380, 1)}`;

/** Node centres in slot order: 3s (C, W, D) in 600×410, 6s (LW, C, RW, LD, RD) in 600×520. */
const DIAGRAM: Record<3 | 5, { height: number; nodes: readonly (readonly [number, number])[] }> = {
  3: { height: 410, nodes: [[150, 50], [450, 50], [300, 255]] },
  5: { height: 520, nodes: [[150, 253], [300, 48], [450, 253], [150, 458], [450, 458]] },
};
/** Every pair is linked (every pair counts). data-a/data-b are 1-based slot numbers so CSS
 * can light up the links of the slot whose picker is open. */
const diagramEdges = (size: 3 | 5) => DIAGRAM[size].nodes.flatMap(([x1, y1], i) =>
  DIAGRAM[size].nodes.slice(i + 1).map(([x2, y2], k) => ({ a: i + 1, b: i + k + 2, d: `M${x1} ${y1}L${x2} ${y2}` })));
/** Two build modes; each rates players only on games from that mode. */
const formats: { size: ChemistrySize; label: string }[] = [{ size: 3, label: "3s" }, { size: 5, label: "6s" }];
const number = (n: number | null, digits = 1) => n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits });

export default function LinePlanner({ dataset }: Props) {
  const { players, season } = dataset;
  const draftKey = lineDraftKey(dataset);
  const goalieDataset = dataset.goalies ?? EMPTY_GOALIES;
  const [goalieId, setGoalieId] = useState("");
  const [countGoalie, setCountGoalie] = useState(true);
  /** Exact number of our skaters per idea line; "any" fills every slot. */
  const [skaterCount, setSkaterCount] = useState<"any" | number>("any");
  const [size, setSize] = useState<ChemistrySize>(3);
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [available, setAvailable] = useState(() => players.map(player => player.id));
  const [minGames, setMinGames] = useState(0);
  const [sort, setSort] = useState<SuggestionSort>("connection");
  const [ideasView, setIdeasView] = useState<"fits" | "used">("fits");
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Keep companion filters and lower-view choices alongside the draft.
  const [pairingView, setPairingView] = useState<GoalieCompatibilityViewState>({ scope: "line", sort: "compatibility", expandedGames: [] });
  const [goalieView, setGoalieView] = useState<GoalieImpactViewState>({ mode: "line", sort: "savePct" });
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const filled = slots.filter(Boolean).length;
  const complete = filled === size;
  const selectedGoalie = goalieDataset.players.find(goalie => goalie.id === goalieId);
  const mode = size === 5 ? "6s" : "3s";
  // Every number in a mode comes from that mode's games only.
  const model = useMemo(() => new ConnectionModel((dataset.connection?.games ?? []).filter(game => connectionGameMode(game) === mode), dataset.connection?.players ?? []), [dataset.connection, mode]);
  // Drop-in guests have no club profile; they stay in results but not the picker.
  const pickable = useMemo(() => dataset.connection ? players.filter(player => model.player(player.id)?.member) : players, [dataset.connection, players, model]);
  const roles = slotRoles[size];
  // "Skaters only" keeps your goalie pick but leaves him out of every number.
  const activeGoalie = countGoalie ? goalieId : "";
  const connection = useMemo(() => model.evaluate(slots.map((id, index) => ({ id, role: roles[index] })), activeGoalie || null), [model, slots, roles, activeGoalie]);
  const selectedCount = filled + (activeGoalie ? 1 : 0);
  const supportingGames = connection?.unit.matchingGames ?? [];
  // Suggestions keep your picks (and goalie) and fill the open slots. A full
  // line compares every alternative instead.
  const recommendations = useMemo(() => {
    const fixed = complete ? Array(size).fill("") : slots;
    const options = { minGames, limit: 30, sort, skaters: skaterCount === "any" ? undefined : skaterCount };
    if (!countGoalie) return model.suggest(roles, fixed, null, available, options);
    // Build around the picked goalie, or find each line's best goalie.
    return goalieId ? model.suggest(roles, fixed, goalieId, available, options)
      : model.suggestWithGoalies(roles, fixed, goalieDataset.players.map(goalie => goalie.id), available, options);
  }, [model, roles, complete, size, slots, goalieId, available, minGames, sort, countGoalie, goalieDataset, skaterCount]);
  // Lineups that really played together; filled slots and the goalie narrow the list.
  const usedLines = useMemo(() => model.usedLines(roles, complete ? Array(size).fill("") : slots, goalieId || null, { minGames, limit: 30, sort, withGoalie: countGoalie, skaters: skaterCount === "any" ? undefined : skaterCount }),
    [model, roles, complete, size, slots, goalieId, minGames, sort, countGoalie, skaterCount]);
  const ideaLines: (Suggestion | UsedLine)[] = ideasView === "used" ? usedLines : recommendations;
  const display = (id: string) => players.find(player => player.id === id)?.name ?? goalieDataset.players.find(goalie => goalie.id === id)?.name ?? id;

  function chooseSkaterCount(value: string) {
    setSkaterCount(value === "any" ? "any" : Number(value));
    setShowAll(false);
  }
  function changeSize(next: ChemistrySize) {
    if (next === size) return;
    setSize(next);
    if (skaterCount !== "any" && skaterCount > next) setSkaterCount("any");
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
  function apply(line: Suggestion | UsedLine) {
    setSlots([...line.slots]);
    // A used line brings its own goalie; an AI/unrecorded goalie clears the crease.
    // With goalies shown, the line brings its goalie. Skaters-only ideas leave
    // your goalie pick alone.
    if (countGoalie && line.goalie && goalieDataset.players.some(goalie => goalie.id === line.goalie)) setGoalieId(line.goalie);
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
      // Older pair drafts (size 2) open in 3s mode.
      const draftSize: ChemistrySize = draft.size === 5 ? 5 : 3;
      const restored = Array.from({ length: draftSize }, (_, index) => {
        const id = draft.slots[index];
        if (typeof id !== "string" || !pool.includes(id) || used.has(id)) return "";
        used.add(id); return id;
      });
      const restoredGoalie = typeof draft.goalieId === "string" && goalieDataset.players.some(goalie => goalie.id === draft.goalieId) && !used.has(draft.goalieId) ? draft.goalieId : "";
      setSize(draftSize); setSlots(restored); setAvailable(pool); setGoalieId(restoredGoalie); setShowAll(false);
      setMessage(`${season} draft restored.`);
    } catch { setMessage("That draft couldn’t be restored. Pick your players to start again."); }
  }

  return <div className="line-planner">
    <div className="line-workspace" id="line-board">
      {/* Two independent columns: the builder (+ pair list) and its connection panels. */}
      <div className="line-col line-col-main">
        <div className="line-draft">
          <div className="line-draft-heading"><div><span className="line-micro">MAKE THE CONNECTION</span><h3>Build your <em>line.</em></h3></div><div className="line-formats" role="group" aria-label="Game mode">{formats.map(format => <button type="button" key={format.size} aria-pressed={size === format.size} onClick={() => changeSize(format.size)}>{format.label}</button>)}</div></div>
          <div className={`line-formation line-formation-${size}`}>
            <div className="line-connections" aria-hidden="true">
              <svg viewBox={`0 0 600 ${DIAGRAM[size === 5 ? 5 : 3].height}`} preserveAspectRatio="none"><defs><filter id="line-edge-glow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="680" height="600"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>{diagramEdges(size === 5 ? 5 : 3).map(edge => <path key={`${edge.a}-${edge.b}`} className="line-edge" data-a={edge.a} data-b={edge.b} d={edge.d} />)}</svg>
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
                    ...pickable.filter(player => available.includes(player.id)).map(player => {
                      const usual = model.usualPosition(player.id);
                      return { value: player.id, label: player.name, number: getPlayerNumber(player.name), description: `${usual ? `Plays ${positionNames[usual]}` : player.position}${slots.includes(player.id) ? " · In your line" : ""}`, badge: player.grade ? `${player.grade} grade` : undefined };
                    }),
                  ]} />
                  <p className="line-player-grade">{player && <>{player.gradeSource === "lab-performance" ? "Lab grade" : "Grade"} <strong>{player.grade ?? "—"}</strong>{player.overallRating !== null && <span> · {number(player.overallRating)} OVR</span>}</>}</p>
                </div>;
              })}
            </div>
          </div>
          <div className="line-goalie-slot">
            <div className="line-goalie-intro"><span className="line-micro">COMPLETE THE UNIT</span><h4>In the <em>crease.</em></h4><p>Pick a goalie. See who they click with.</p><a href="#goalie-compatibility">Player compatibility <span aria-hidden="true">↘</span></a></div>
            <div className={`line-slot line-netminder ${selectedGoalie ? "is-selected" : ""} ${selectedGoalie && !countGoalie ? "is-not-counted" : ""}`} data-position="G">
              {/* The crease, plus the shooting angles the goalie takes away (radiating toward the
                  shooters only while the goalie picker is open). */}
              <svg className="line-crease" viewBox="0 0 600 420" aria-hidden="true">
                <path className="line-crease-cone" d={CREASE_CONE} />
                {[0, 1, 2].map(ring => <path key={ring} className="line-crease-wave" style={{ animationDelay: `${ring * 0.45}s` }} d={CREASE_WAVE} />)}
                <path className="line-crease-edge" d={CREASE_EDGES} />
                <path className="line-crease-zone" d="M230 400A70 70 0 0 1 370 400Z" />
                <path className="line-crease-goal-line" d="M120 400H480" />
              </svg>
              <LabSelect id="line-goalie" label="Goalie" compact variant="player" playerNumber={selectedGoalie ? getPlayerNumber(selectedGoalie.name) : null} value={goalieId} onChange={chooseGoalie} disabled={!goalieDataset.players.length} placeholder="Add goalie" triggerContent={<>
                <span className="line-player-node" aria-hidden="true">{selectedGoalie ? getPlayerNumber(selectedGoalie.name) ?? "—" : "+"}<span className="line-position">G</span></span>
                <span className="line-player-name">{selectedGoalie?.name ?? "Add goalie"}</span>
                <span className="line-player-edit">{selectedGoalie ? "Change goalie" : "Optional"}<span aria-hidden="true">↗</span></span>
              </>} options={[
                { value: "", label: "No goalie", description: "Compare skaters only" },
                ...goalieDataset.players.map(goalie => ({ value: goalie.id, label: goalie.name, number: getPlayerNumber(goalie.name), description: `${goalie.games} goalie games${slots.includes(goalie.id) ? " · Move from skater slot" : ""}`, badge: goalie.savePct === null ? undefined : `${number(goalie.savePct)}% SV` })),
              ]} />
              <p className="line-player-grade">{selectedGoalie && !countGoalie ? "Not counted · Skaters only" : selectedGoalie ? `${number(selectedGoalie.savePct)}${selectedGoalie.savePct === null ? "" : "%"} SV · ${number(selectedGoalie.gaa, 2)} GAA · Season` : goalieDataset.players.length ? "Pick your last line of defense" : "No goalies in this season yet"}</p>
            </div>
          </div>
          <p className="line-formation-caption"><span>{filled} / {size} skaters{goalieId ? " + goalie" : ""} selected</span><span>{season}</span></p>
          {!players.length && <p className="line-inline-empty">No skaters in this season yet. Try the archive to build a line.</p>}
        </div>
        {connection && connection.pairs.length > 1 && <section className="line-connection-pairs" aria-label="Pair connections"><span className="line-micro">HOW THEY CONNECT · {connection.pairs.length} PAIRS</span><ul>{[...connection.pairs].sort((a, b) => b.percentage - a.percentage).map(pair => <li key={pair.players.join("|")} data-goalie={pair.withGoalie || undefined}><span>{pair.players.map(display).join(" + ")}<small>{pair.record.games ? `${pair.record.games} ${pair.record.games === 1 ? "game" : "games"} · ${pair.record.wins}–${pair.record.losses}${pair.record.draws ? `–${pair.record.draws}` : ""}` : "Projected · no games yet"}</small></span><strong>{pair.percentage}</strong></li>)}</ul></section>}
      </div>
      <div className="line-col line-col-side">
        <aside className="line-evaluation player-connection" aria-label="Player connection" aria-live="polite" aria-atomic="true">
          <div className="line-evaluation-top"><span className="line-micro">THE PLAYER CONNECTION</span><span className="line-live-dot" aria-hidden="true" /></div>
          <h3>{activeGoalie ? "Unit connection" : "Line connection"}</h3>
          <div className="line-ideas-views line-formats line-count-goalie" role="group" aria-label="Count the goalie">{([[true, "With goalie"], [false, "Skaters only"]] as const).map(([value, label]) => <button type="button" key={label} aria-pressed={countGoalie === value} onClick={() => { setCountGoalie(value); setShowAll(false); }}>{label}</button>)}</div>
          <div className={`line-chemistry-dial ${connection ? "has-rating" : ""}`}>
            <svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="78" /><circle cx="90" cy="90" r="78" pathLength="100" strokeDasharray={`${connection?.percentage ?? 0} 100`} /></svg>
            <div><strong>{connection?.percentage ?? "—"}{connection && <small>%</small>}</strong><span>CONNECTION</span></div>
          </div>
          <div className="line-overall-grade"><span>{activeGoalie ? "Unit grade" : "Line grade"}</span><strong>{connection?.grade ?? "—"}</strong></div>
          <p className="line-score-caption">{connection ? `${evidenceText(connection, activeGoalie ? selectedGoalie?.name : undefined)}${goalieId && !countGoalie ? ` Skaters only: ${selectedGoalie?.name ?? "the goalie"} isn't counted.` : ""}` : selectedCount === 1 ? "Add one more player to see how they connect." : "Pick any two players, or a goalie and a skater, to see how they connect."}</p>
          {connection && connection.outOfPosition.length > 0 && <ul className="line-position-notes">{connection.outOfPosition.map(note => <li key={note.id}><strong>{display(note.id)}</strong> {note.usual === "G" ? "is a goalie" : note.usual ? `usually plays ${positionNames[note.usual]}` : "has no recorded position"}{note.role !== "any" ? `, not ${roleNames[note.role]}` : ""}.</li>)}{connection.positionPenalty > 0 && <li className="line-position-cost">Position fit: −{connection.positionPenalty}</li>}</ul>}
          <div className="line-stat-grid">
            <div><strong>{connection ? connection.unit.games : "—"}</strong><span>Games together</span></div>
            <div><strong>{connection?.unit.games ? `${connection.unit.wins}–${connection.unit.losses}${connection.unit.draws ? `–${connection.unit.draws}` : ""}` : "—"}</strong><span>Team record</span></div>
            <div><strong>{connection?.unit.games ? number(connection.unit.goalsFor / connection.unit.games) : "—"}</strong><span>Goals for / game</span></div>
            <div><strong>{activeGoalie ? `${number(connection?.unit.savePct ?? null)}${connection?.unit.savePct != null ? "%" : ""}` : connection?.unit.games ? number(connection.unit.goalsAgainst / connection.unit.games) : "—"}</strong><span>{activeGoalie ? "Goalie save %" : "Against / game"}</span></div>
          </div>
          <a className="line-score-link" href="#chemistry-method" onClick={() => { const method = document.getElementById("chemistry-method"); if (method instanceof HTMLDetailsElement) method.open = true; }}>How connection &amp; grades work <span aria-hidden="true">↗</span></a>
          <p className="line-score-source">Bardownski index · club average = 60 · not a win prediction</p>
        </aside>
        <GoalieCompatibility compact dataset={goalieDataset} players={players} skaters={slots} selectedGoalie={goalieId} season={season} onChooseGoalie={chooseGoalie} viewState={pairingView} onViewStateChange={setPairingView} />
      </div>
      <div className="line-workspace-actions">
        <div className="line-draft-actions"><button type="button" onClick={save} disabled={!filled && !goalieId}>Save line <span aria-hidden="true">↗</span></button><button type="button" onClick={restore}>Load saved</button><button type="button" onClick={() => { setSlots(Array(size).fill("")); setGoalieId(""); setMessage("Line cleared."); }} disabled={!filled && !goalieId}>Clear line</button><span>YOUR LINE. YOUR CALL.</span></div>
        <p className="line-message" role="status">{message}</p>
      </div>
    </div>

    <LineIdeas season={season} panels={{
      stats: <GoalieImpact compact dataset={goalieDataset} skaters={slots} selectedGoalie={goalieId} season={season} onChoose={chooseGoalie} viewState={goalieView} onViewStateChange={setGoalieView} />,
      ideas: <section className="line-recommendations" id="recommendations-title" aria-label="Line ideas">
      <div className="line-ideas-views line-formats" role="group" aria-label="Line ideas view">{([["fits", "Best fits"], ["used", "Lines we've used"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={ideasView === value} onClick={() => { setIdeasView(value); setShowAll(false); }}>{label}</button>)}</div>
      <div className="line-ideas-views line-formats" role="group" aria-label="Goalie in line ideas">{([[true, "With goalie"], [false, "Skaters only"]] as const).map(([value, label]) => <button type="button" key={label} aria-pressed={countGoalie === value} onClick={() => { setCountGoalie(value); setShowAll(false); }}>{label}</button>)}</div>
      <div className="line-section-head"><p className="line-ideas-intro">{ideasView === "used"
        ? <>{`Every ${mode} line that has actually played together this season`}{filled && !complete ? ", including your picks" : ""}{countGoalie && goalieId ? `, with ${selectedGoalie?.name ?? "your goalie"} in net` : ""}. {size > 2 ? "Open spots were AI or drop-in skaters." : ""} {countGoalie ? "Each line is shown with the goalie who was in net. Skaters only counts every game, including AI goalies." : "Skaters only: every game counts, whoever was in net."}</>
        : <>{complete ? `Your line is full. Here are the best ${mode} alternatives` : filled || goalieId ? "Keeping your picks. Here's who fits best in the open spots" : `The best-connected ${mode} lines`}{!countGoalie ? ". Skaters only." : goalieId ? `, with ${selectedGoalie?.name ?? "your goalie"} in net.` : ", each with its best goalie in net."}</>}</p><div className="line-rank-filters">
        <LabSelect id="line-rank-sort" searchable={false} label="Sort combinations" value={sort} onChange={value => { setSort(value as SuggestionSort); setShowAll(false); }} options={SUGGESTION_SORTS.map(option => ({ ...option }))} />
        <LabSelect id="line-skater-count" searchable={false} label="Skaters in line" value={String(skaterCount)} onChange={chooseSkaterCount} options={[{ value: "any", label: ideasView === "used" ? "Any" : "Fill every spot" }, ...Array.from({ length: size }, (_, index) => index + 1).map(count => ({ value: String(count), label: `${count} ${count === 1 ? "skater" : "skaters"}`, description: count < size ? `${size - count} open ${size - count === 1 ? "spot" : "spots"} (AI)` : undefined }))]}  />
        <LabSelect id="line-min-games" searchable={false} label="Games together" value={String(minGames)} onChange={value => { setMinGames(Number(value)); setShowAll(false); }} options={[{ value: "0", label: "Any / new lines" }, ...[1, 3, 5, 10].map(value => ({ value: String(value), label: `${value}+ ${value === 1 ? "game" : "games"}` }))]} />
      </div></div>
      <details className="line-availability" open={availabilityOpen} onToggle={event => setAvailabilityOpen(event.currentTarget.open)}><summary>Who’s playing? <span>{available.filter(id => pickable.some(player => player.id === id)).length} / {pickable.length} available</span></summary><div className="line-pool"><fieldset><legend className="line-sr-only">Available skaters</legend>{pickable.map(player => <label key={player.id}><input type="checkbox" checked={available.includes(player.id)} onChange={() => availability(player.id)} /><span>{player.name}</span><b>{player.grade ?? "—"}</b></label>)}</fieldset><div className="line-pool-actions"><button type="button" onClick={() => setAvailable(players.map(player => player.id))}>Select all</button><button type="button" onClick={() => { setAvailable([]); setSlots(Array(size).fill("")); setShowAll(false); }}>Clear pool</button></div></div></details>
      {ideaLines.length ? <><div className="line-combination-grid">{ideaLines.slice(0, showAll ? undefined : 3).map((line, index) => {
        const used = "lineup" in line ? line : null;
        const shown = used ? used.lineup : line.result.unit;
        const active = line.slots.every((id, slot) => slots[slot] === id) && (!countGoalie || (line.goalie ?? "") === goalieId);
        return <article className={`line-combination ${active ? "is-active" : ""}`} key={`${ideasView}:${line.slots.join("|")}#${countGoalie ? line.goalie ?? "ai" : "skaters"}`}>
          <div className="line-combination-top"><span>{String(index + 1).padStart(2, "0")}</span><strong aria-label={`Line grade ${line.result.grade}`}>{line.result.grade}</strong></div>
          {(() => { const head = headline(shown, line.result, sort); return <p className="line-combination-score">{head.value}{head.unit && <span>{head.unit}</span>}<small>{head.label}</small></p>; })()}
          <ul>{line.slots.map((id, slot) => !id ? <li key={`ai-${slot}`} className="line-combination-ai"><span className="line-combination-number">AI</span>Open spot<span className="line-combination-player-grade">{shortPositions[size][slot]}</span></li> : <li key={id}><span className="line-combination-number">{getPlayerNumber(display(id)) ?? "—"}</span>{display(id)}<span className="line-combination-player-grade">{roles[slot] === "any" ? players.find(player => player.id === id)?.grade ?? "—" : shortPositions[size][slot]}</span></li>)}{(() => {
            if (!countGoalie) return null;
            const netminder = line.goalie;
            return netminder ? <li key="goalie" className="line-combination-goalie"><span className="line-combination-number">{getPlayerNumber(display(netminder)) ?? "—"}</span>{display(netminder)}<span className="line-combination-player-grade">G</span></li> : null;
          })()}</ul>
          <p className="line-combination-record">{shown.games ? <>{shown.games} {used ? (size === 2 ? "together" : "as this line") : "together"} <span>·</span> {shown.wins}W – {shown.losses}L{shown.draws ? ` – ${shown.draws}D` : ""}</> : line.result.evidence === "pairs" ? "New group · built from pair history" : "New group · projected"}{!used && line.result.positionPenalty > 0 ? ` · fit −${line.result.positionPenalty}` : ""}{sort !== "connection" ? <> <span>·</span> {line.result.percentage}% connection</> : null}</p>
          <button type="button" onClick={() => apply(line)} aria-label={`Use combination ${line.slots.filter(Boolean).map(display).join(", ")}`}>{active ? "In your lineup" : "Try this line"}<span aria-hidden="true">{active ? "✓" : "↗"}</span></button>
        </article>;
      })}</div>{ideaLines.length > 3 && <button className="line-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show top three" : `Explore all ${ideaLines.length} ${ideasView === "used" ? "lines" : "combinations"}`} <span aria-hidden="true">{showAll ? "−" : "+"}</span></button>}</> : <div className="line-empty"><h4>No lines here. Yet.</h4><p>{skaterCount === 1 && !countGoalie ? "A one-skater line needs a goalie. Switch to With goalie, or choose more skaters." : ideasView === "used" ? (minGames > 0 ? "No line has played that many games together. Try fewer games together." : filled || goalieId ? "No recorded lines match your picks yet. Clear a slot or the goalie to see more." : `No recorded ${mode} lines yet this season.`) : minGames > 0 ? "No group has played that many games together. Try fewer games together." : "Not enough available skaters for the open spots. Add players to the pool or choose fewer skaters."}</p></div>}
    </section>,
    }} method={<details className="line-method line-ideas-method" id="chemistry-method"><summary>How ratings work</summary><div>
        <details className="line-method-topic"><summary>Line &amp; unit connection</summary><div>
          <p>{CONNECTION_DESCRIPTION}</p>
          <p>Any two players can be rated, including a goalie and one skater, and the number updates with every player you add, swap or remove. Results are team outcomes, not isolated on-ice stats. Suggestions never use a goalie as a skater, keep the players you have already picked, and place each player in the slot that suits them best.</p>
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
