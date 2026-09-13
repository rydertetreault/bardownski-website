"use client";

import { useMemo, useState } from "react";
import {
  evaluateChemistrySelection,
  recommendChemistryLines,
  type ChemistrySize,
  type ChemistrySort,
  type ChemistryEvaluation,
} from "@/lib/line-chemistry";
import { lineDraftKey, type LineDataset } from "./line-datasets";
import "./line-planner.css";

export type { LinePlayer } from "./line-datasets";
type Props = { dataset: LineDataset };
const positions: Record<ChemistrySize, string[]> = { 2: ["Left", "Right"], 3: ["Left wing", "Center", "Right wing"], 5: ["Left wing", "Center", "Right wing", "Left defense", "Right defense"] };
const shortPositions: Record<ChemistrySize, string[]> = { 2: ["A", "B"], 3: ["LW", "C", "RW"], 5: ["LW", "C", "RW", "LD", "RD"] };
const formats: { size: ChemistrySize; label: string }[] = [{ size: 2, label: "Pair" }, { size: 3, label: "Trio" }, { size: 5, label: "Five skaters" }];
const number = (n: number | null, digits = 2) => n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits });
const evidence = (games: number) => games === 0 ? "No shared sample" : games < 5 ? "Very small sample" : "Limited recorded evidence";

export default function LinePlanner({ dataset }: Props) {
  const { games, players, sourceTotal, excluded, season, kind, totalGames } = dataset;
  const draftKey = lineDraftKey(dataset);
  const [size, setSize] = useState<ChemistrySize>(3);
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [available, setAvailable] = useState(() => players.map(player => player.id));
  const [minGames, setMinGames] = useState(3);
  const [sort, setSort] = useState<ChemistrySort>("reliable");
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const complete = slots.every(Boolean);
  const selected = useMemo(() => evaluateChemistrySelection(games, complete ? slots : []), [games, slots, complete]);
  const recommendations = useMemo(() => recommendChemistryLines(games, size, { availablePlayers: available, minGames, sort }), [games, size, available, minGames, sort]);
  const counts = useMemo(() => new Map(players.map(player => [player.id, games.filter(game => game.skaters.includes(player.id)).length])), [games, players]);
  const display = (id: string) => players.find(player => player.id === id)?.name ?? id;
  const pairs = useMemo(() => slots.flatMap((player, i) => player ? slots.slice(i + 1).filter(Boolean).map(other => evaluateChemistrySelection(games, [player, other])) : []), [slots, games]);

  function changeSize(next: ChemistrySize) {
    setSize(next);
    setSlots(Array(next).fill(""));
    setShowAll(false);
    setMessage("Line cleared for the new formation.");
  }
  function choose(index: number, id: string) {
    setSlots(current => {
      const next = [...current];
      const duplicate = id ? next.indexOf(id) : -1;
      if (duplicate >= 0 && duplicate !== index) next[duplicate] = next[index];
      next[index] = id;
      return next;
    });
    setMessage("");
  }
  function availability(id: string) {
    const removing = available.includes(id);
    setAvailable(current => removing ? current.filter(value => value !== id) : [...current, id]);
    if (removing) setSlots(current => current.map(value => value === id ? "" : value));
    setShowAll(false);
  }
  function apply(line: ChemistryEvaluation) {
    setSlots([...line.players]);
    setMessage("Combination loaded. Slot order is a draft—reassign positions to suit your team.");
  }
  function save() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ datasetId: dataset.id, season, size, slots, available }));
      setMessage(`Draft saved for ${season} in this browser only. No team lineup was published.`);
    } catch { setMessage("This browser could not save the draft. You can keep working here."); }
  }
  function restore() {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) { setMessage(`No saved ${season} draft in this browser yet.`); return; }
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
      setSize(draft.size); setSlots(restored); setAvailable(pool); setShowAll(false);
      setMessage(`Saved ${season} draft restored. Results use this dataset’s currently available games.`);
    } catch { setMessage("That saved draft could not be restored. Choose your players to start again."); }
  }

  return <section className="line-planner" aria-labelledby="line-title">
    <header className="line-heading"><div><p className="line-eyebrow">02 / THE LINE BUILDER</p><h2 id="line-title">Find your<br /><em>combination.</em></h2></div><p>Pick who’s available. Try a line.<br />See what the saved games can tell you.</p></header>
    <div className="line-archive-note"><strong>{season} {kind === "archive" ? "ARCHIVE" : "CURRENT SEASON"}</strong><p>{games.length} usable games from {sourceTotal} available records ({excluded} excluded). {totalGames === null ? "The full season game total is unavailable." : `Season total: ${totalGames} games.`} Player coverage may be incomplete; shared-game counts are not full-season totals. {kind === "archive" ? "This dataset uses the preserved previous season only." : "Only current-season data is used. No bundled archive fills missing games or players."}</p></div>
    {!games.some(game => game.skaters.length > 0) && <div className="line-empty"><h3>No recorded skater evidence yet.</h3><p>{kind === "current" ? "Current-season chemistry is not available from the recorded games. An empty sample is not zero chemistry. Choose the archive explicitly to explore last season." : "The available archive does not contain usable skater appearances."}</p></div>}
    <div className="line-workspace">
      <aside className="line-availability">
        <h3>Who’s available?</h3><p>Choose a pool for recommendations. Uncheck a player to remove them from your draft.</p>
        {!players.length && <p>No eligible skaters are available in this dataset.</p>}
        <fieldset><legend className="line-sr-only">Available skaters</legend>{players.map(player => <label key={player.id}><input type="checkbox" checked={available.includes(player.id)} onChange={() => availability(player.id)} /><span><strong>{player.name}</strong><small>{counts.get(player.id) || 0} recorded skater appearances</small></span></label>)}</fieldset>
        <div className="line-pool-actions"><button type="button" onClick={() => setAvailable(players.map(player => player.id))}>Select all</button><button type="button" onClick={() => { setAvailable([]); setSlots(Array(size).fill("")); }}>Clear pool</button></div>
      </aside>
      <div className="line-draft">
        <div className="line-draft-heading"><h3>Your line</h3><div className="line-formats" role="group" aria-label="Combination size">{formats.map(format => <button type="button" key={format.size} aria-pressed={size === format.size} onClick={() => changeSize(format.size)}>{format.label}</button>)}</div></div>
        <p className="line-slot-note">Positions are your assignments, not verified historical positions. Selecting someone twice swaps their slots. Skaters only; goalies are outside this model.</p>
        <div className={`line-ice line-ice-${size}`}>
          <div className="line-ice-mark" aria-hidden="true">B</div>
          {positions[size].map((position, index) => <div className="line-slot" key={position}><span aria-hidden="true">{shortPositions[size][index]}</span><label htmlFor={`line-slot-${index}`}>{position}</label><select id={`line-slot-${index}`} value={slots[index]} onChange={event => choose(index, event.target.value)} disabled={!available.length}><option value="">Choose a skater</option>{players.filter(player => available.includes(player.id)).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}</select></div>)}
        </div>
        <div className="line-draft-actions"><button type="button" onClick={save}>Save draft</button><button type="button" onClick={restore}>Restore draft</button><button type="button" onClick={() => { setSlots(Array(size).fill("")); setMessage("Draft cleared. Your available-player pool is unchanged."); }}>Reset line</button><span>Saved only on this device.</span></div>
        <p className="line-message" role="status">{message}</p>
        <div className="line-evaluation" aria-live="polite" aria-atomic="true">
          <div className="line-evaluation-heading"><h3>{complete ? `Together in ${season}` : "Build a line to see its record"}</h3><span>{complete ? evidence(selected.stats.games) : `${slots.filter(Boolean).length} / ${size} slots filled`}</span></div>
          {!complete ? <p>Choose all {size} skaters. We won’t turn a partial draft into a full-line score.</p> : <>
            <div className="line-stat-grid"><div><strong>{selected.stats.games}</strong><span>Shared games</span></div><div><strong>{selected.stats.games ? `${selected.stats.wins}–${selected.stats.losses}${selected.stats.draws ? `–${selected.stats.draws}` : ""}` : "—"}</strong><span>Club W–L{selected.stats.draws ? "–D" : ""}</span></div><div><strong>{number(selected.stats.winPct, 1)}{selected.stats.winPct !== null && "%"}</strong><span>Observed win rate</span></div><div><strong>{number(selected.stats.gdPerGame)}</strong><span>Club GD / game</span></div></div>
            <p>{selected.stats.games ? `Club goals for/game: ${number(selected.stats.gfPerGame)} · against/game: ${number(selected.stats.gaPerGame)}. These are team results in games where all selected players are listed, not on-ice line totals.` : "No usable games list this entire combination. That means missing evidence—not zero chemistry or a bad line."}</p>
          </>}
        </div>
        {pairs.length > 0 && <details className="line-pair-details"><summary>Pair evidence within your draft <span>{pairs.filter(pair => pair.stats.games).length} / {pairs.length} pairs observed</span></summary><ul>{pairs.map(pair => <li key={pair.players.join("|")}><span>{pair.players.map(display).join(" + ")}</span><strong>{pair.stats.games} shared {pair.stats.games === 1 ? "game" : "games"}</strong></li>)}</ul><p>Pair counts overlap. They are never added together or presented as full-line games.</p></details>}
      </div>
    </div>
    <section className="line-recommendations" aria-labelledby="recommendations-title">
      <div className="line-section-head"><div><p className="line-eyebrow">EXPLORE YOUR AVAILABLE POOL</p><h3 id="recommendations-title">Combinations to try.</h3></div><div className="line-rank-filters"><label htmlFor="line-rank-sort">Rank by<select id="line-rank-sort" value={sort} onChange={event => { setSort(event.target.value as ChemistrySort); setShowAll(false); }}><option value="reliable">Sample-adjusted wins</option><option value="win-rate">Observed win rate</option><option value="goal-difference">Club goal difference / game</option><option value="attack">Club goals for / game</option></select></label><label htmlFor="line-min-games">Minimum shared games<select id="line-min-games" value={minGames} onChange={event => { setMinGames(Number(event.target.value)); setShowAll(false); }}><option value={1}>1 game</option><option value={3}>3 games</option><option value={5}>5 games</option><option value={10}>10 games</option></select></label></div></div>
      <p className="line-rank-note">Ranked only among your available players. These are historical coappearances, not a prediction, positional recommendation, or confirmed 3s/6s formation.</p>
      <p className="line-result-count" role="status">{recommendations.length} {recommendations.length === 1 ? "combination meets" : "combinations meet"} this sample minimum.</p>
      {recommendations.length ? <><div className="line-table-wrap" role="region" aria-label="Ranked combinations" tabIndex={0}><table><caption className="line-sr-only">{season} {size}-skater combinations and club outcomes</caption><thead><tr><th scope="col">Combination</th><th scope="col">Games</th><th scope="col">Win %</th><th scope="col">GF / game</th><th scope="col">GA / game</th><th scope="col">Try line</th></tr></thead><tbody>{recommendations.slice(0, showAll ? undefined : 8).map((line, index) => <tr key={line.players.join("|")}><th scope="row"><span className="line-rank">{String(index + 1).padStart(2, "0")}</span><span>{line.players.map(display).join(" / ")}<small>{evidence(line.stats.games)}</small></span></th><td>{line.stats.games}</td><td>{number(line.stats.winPct, 1)}%</td><td>{number(line.stats.gfPerGame)}</td><td>{number(line.stats.gaPerGame)}</td><td><button type="button" onClick={() => apply(line)} aria-label={`Use combination ${line.players.map(display).join(", ")}`}>Use line ↗</button></td></tr>)}</tbody></table></div>{recommendations.length > 8 && <button className="line-more" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show top eight" : `Show all ${recommendations.length}`}</button>}</> : <div className="line-empty"><h4>No qualifying combinations.</h4><p>{available.length < size ? `Select at least ${size} available skaters to explore this format.` : "Try a smaller group or a lower sample minimum. We won’t fill the gaps with projected chemistry."}</p></div>}
    </section>
    {complete && selected.matchingGames.length > 0 && <details className="line-evidence"><summary>See the {selected.stats.games} supporting games</summary><ul>{selected.matchingGames.map(game => <li key={game.id}><span>{game.date}<small>{game.opponent}</small></span><strong>{game.goalsFor}–{game.goalsAgainst}</strong><span>{game.coverage === "partial-scoresheet" ? "Partial scoresheet" : "Recorded players"}</span></li>)}</ul></details>}
    <details className="line-method" id="chemistry-method"><summary>How this tool works <span>Evidence, not a promise ↗</span></summary><div><p>Every selected skater must be listed in the same saved game. Additional teammates may also have played. Missing names are unknown—not proof a player was absent. Role labels in this draft do not change the shared-game evidence.</p><p>Only usable regular/finals games from the selected season count. Duplicates, private games, forfeits, missing scores and detected score inconsistencies are excluded. {kind === "archive" ? "Full saved player lists are preferred over the bundled partial archive when available." : "Current-season player lists come only from recorded current matches; the bundled archive is never used."} No records are written or repaired by this page.</p><p>“Sample-adjusted wins” ranks the Wilson lower bound (95% interval) of the observed win rate, so a one-game streak does not automatically outrank a larger sample. Other modes sort the displayed team rate. Equal values prefer more shared games, then alphabetical order. This is descriptive sorting, not a calibrated win prediction or a chemistry percentage.</p><p>Samples under five games are very small. Larger samples are still limited by recording gaps, opponents, other teammates and unknown ice time. The saved season ratings and unrecovered playstyle fields are not used to manufacture forecasts.</p></div></details>
  </section>;
}
