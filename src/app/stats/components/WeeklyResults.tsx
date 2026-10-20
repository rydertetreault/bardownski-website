"use client";

import { useState } from "react";

export type WeeklyResultRow = {
  id: string; name: string; position: string; games: number; points: number; rank: number; winner: boolean;
  /** Stat items, e.g. ["16 G", "9 A", "25 PTS"] or ["5-6", ".765 SV%", "3.45 GAA", "2 SO"]. */
  stats: string[];
};
export type WeeklyResultWeek = { id: string; label: string; rows: WeeklyResultRow[] };

/** Completed Player of the Week results, one week at a time (latest first). */
export default function WeeklyResults({ weeks }: { weeks: WeeklyResultWeek[] }) {
  const [index, setIndex] = useState(0);
  const [showMath, setShowMath] = useState(false);
  if (!weeks.length) return null;
  const active = Math.min(index, weeks.length - 1);
  const week = weeks[active];

  return <section className="stats-week-results" aria-labelledby="weekly-results-title">
    <div className="stats-week-head">
      <div className="stats-week-title">
        <h3 id="weekly-results-title">Week by week</h3>
        <button type="button" className="stats-week-info" aria-expanded={showMath} aria-controls="weekly-math"
          aria-label="How Player of the Week points work" onClick={() => setShowMath(open => !open)}
          onKeyDown={event => { if (event.key === "Escape") setShowMath(false); }}>i</button>
      </div>
      <div className="stats-week-controls">
        <button type="button" className="stats-week-step" onClick={() => setIndex(active + 1)} disabled={active >= weeks.length - 1} aria-label="Earlier week">←</button>
        <select className="stats-week-select" aria-label="Week" value={week.id} onChange={event => setIndex(Math.max(0, weeks.findIndex(w => w.id === event.target.value)))}>
          {weeks.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
        </select>
        <button type="button" className="stats-week-step" onClick={() => setIndex(active - 1)} disabled={active <= 0} aria-label="Later week">→</button>
      </div>
    </div>
    {showMath && <WeeklyMath />}
    <table className="stats-week-table">
      <caption>{week.label} · Player of the Week points</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">GP</th><th scope="col">Points</th></tr></thead>
      <tbody>{week.rows.map(row => <tr key={row.id} data-winner={row.winner}>
        <td>{String(row.rank).padStart(2, "0")}</td>
        <th scope="row">{row.name}<span className="stats-week-pos">{row.position}</span>{row.winner && <span className="stats-week-badge">Winner</span>}
          <span className="stats-week-line">{row.stats.map(item => <span key={item}>{item}</span>)}</span></th>
        <td>{row.games}</td>
        <td><strong>{row.points.toFixed(1)}</strong></td>
      </tr>)}</tbody>
    </table>
    <p className="stats-honors-note">Minimum three games in a role to qualify for the week.</p>
  </section>;
}

/** Mirrors the weekly scoring in src/lib/hockey-awards.ts. */
function WeeklyMath() {
  return <div className="stats-week-math" id="weekly-math" role="region" aria-label="How Player of the Week points work">
    <p>Each player gets a per-game rate from that week’s stats. It is multiplied by the square root of games played, so a strong week over more games is worth more. You need three games in a role to qualify.</p>
    <div className="stats-week-math-grid">
      <div><h4>Forwards · per game</h4><ul>
        <li>Points × 20</li><li>Goals × 15</li><li>Game-winning goals × 30</li><li>Plus/minus (if positive) × 8</li>
        <li>Shooting % × 0.3</li><li>Hits × 0.5</li><li>Takeaways × 0.5</li><li>Giveaways × −0.3</li>
      </ul></div>
      <div><h4>Defense · per game</h4><ul>
        <li>Points × 28</li><li>Goals × 22</li><li>Plus/minus (if positive) × 18</li><li>Blocked shots × 2</li>
        <li>Takeaways × 1.5</li><li>Hits × 1.2</li><li>Giveaways × −0.8</li>
      </ul></div>
      <div><h4>Goalies · per game</h4><ul>
        <li>Each SV% point above .650 × 5</li><li>(5.00 − GAA) × 3, if positive</li><li>Shutouts × 20 (forfeit shutouts count less)</li>
        <li>Scoreless periods × 30</li><li>Win % × 0.3</li>
      </ul></div>
    </div>
    <p><strong>Week total</strong> = per-game rate × √games. Goalies also get 1 point for every SV% point above .700, for each game they played that week. Just playing earns nothing on its own: a goalie at .650 or below who loses scores 0, like a skater with an empty sheet. Skaters use the same formulas as the MVP race.</p>
  </div>;
}
