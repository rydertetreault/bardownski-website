import type { HockeyAwards } from "@/lib/hockey-awards";
import { getDisplayNameFromGamertag, getNickname } from "@/lib/nicknames";
import "./weekly-tracker.css";

export type WeeklyTrackerProps = { awards: HockeyAwards | null; stale?: boolean };

function playerName(name: string) {
  return getNickname(getDisplayNameFromGamertag(name));
}

function WeekRange({ start, end }: { start: string; end: string }) {
  const first = new Date(start);
  const last = new Date(end);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime())) return <>Week dates unavailable</>;
  const format = (date: Date) => date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  return <><time dateTime={first.toISOString()}>{format(first)} 00:00</time>{" – "}<time dateTime={last.toISOString()}>{format(last)} 00:00</time> UTC (end exclusive)</>;
}

/** Calendar labels only; all standings and selections come from the current-season data layer. */
function currentWeek() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return { start: start.toISOString(), end: new Date(start.getTime() + 7 * 86400000).toISOString() };
}

function Highlights({ entry }: { entry: HockeyAwards["currentWeek"]["standings"][number] }) {
  return entry.isGoalie
    ? <>{entry.saves} saves · {entry.shotsAgainst > 0 ? `${entry.savePct.toFixed(1)}% save percentage` : "Save percentage unavailable (no shots faced)"}<br />{entry.gaa.toFixed(2)} GAA · {entry.shutouts} shutouts</>
    : <>{entry.points} points · {entry.goals} goals · {entry.assists} assists</>;
}

export function WeeklyTracker({ awards, stale = false }: WeeklyTrackerProps) {
  const calendar = currentWeek();
  const previousStart = new Date(Date.parse(calendar.start) - 7 * 86400000).toISOString();
  // A stale snapshot can cross Monday's cutoff. Never relabel its old race as the current week.
  const current = awards?.currentWeek.start === calendar.start ? awards.currentWeek : null;
  const previous = awards?.lastCompletedWeek.start === previousStart ? awards.lastCompletedWeek : null;
  const leaders = current?.leaders ?? [];
  const standings = current?.standings ?? [];
  const provisional = leaders.length > 0 && leaders.every(entry => !entry.eligible);
  const saved = stale || (!!awards && !current);

  return <section id="weekly-tracker" className="weekly-tracker" aria-labelledby="weekly-tracker-title">
    <header className="weekly-heading">
      <div><p className="weekly-eyebrow">NHL 27 · 2026–2027 / Weekly performance</p><h2 id="weekly-tracker-title">Player of the Week</h2></div>
      <p className="weekly-period">Current UTC week<br /><WeekRange {...calendar} /></p>
    </header>
    <div className="weekly-panel">
      {saved && <p className="weekly-stale" role="status">Saved snapshot — not live. The latest refresh is not confirmed; only data matching the displayed weeks is shown.</p>}
      <div className="weekly-lead">
        <p className="weekly-status">In progress · Not a final award</p>
        <h3>{leaders.length
          ? <>{provisional ? "Provisional " : "In-progress "}{leaders.length > 1 ? "leaders" : "leader"}: {leaders.map(entry => playerName(entry.name)).join(" / ")}</>
          : current ? "Awaiting qualifying performances" : "This week’s standings are unavailable"}</h3>
        <p>{current ? `${current.games.toLocaleString("en-US")} observed ${current.games === 1 ? "game" : "games"} this week.` : "Observed games: unavailable."}{" "}
          Minimum {current?.minimumGames ?? 3} appearances in a scored role to qualify. {provisional && "No player has qualified yet. "}Recorded coverage may be incomplete.</p>
      </div>
      {standings.length ? <div className="weekly-scroll" role="region" aria-label="Player of the Week standings, scroll horizontally for all columns" tabIndex={0}>
        <table>
          <caption>Current-week standings · Observed performances only. Equal scores share a rank; provisional entries are not eligible selections.</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Player / role</th><th scope="col">Games</th><th scope="col">Score</th><th scope="col">Stat highlights</th></tr></thead>
          <tbody>{standings.map(entry => <tr key={entry.playerId}>
            <td className="weekly-number">{entry.rank}</td>
            <th scope="row">{playerName(entry.name)}<small>{entry.isGoalie ? "Goaltender" : entry.position === "D" ? "Defense" : "Forward"}</small><small className={entry.eligible ? undefined : "weekly-provisional"}>{entry.eligible ? "Qualified · 3+ appearances" : "Provisional · Below 3 appearances"}</small></th>
            <td className="weekly-number">{entry.games}</td><td className="weekly-number">{entry.score.toFixed(1)}</td>
            <td className="weekly-highlights"><Highlights entry={entry} /></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="weekly-empty">{current ? "No scored player appearances recorded for this week yet." : "No verified current-week standings are available. Missing statistics are not zero; previous-season awards are not used as a substitute."}</p>}
      <div className="weekly-previous" aria-labelledby="weekly-previous-title">
        <h3 id="weekly-previous-title">Last completed week</h3>
        <p className="weekly-period"><WeekRange start={previousStart} end={calendar.start} /></p>
        {previous ? <>
          <p className={previous.winners.length ? "weekly-winners" : undefined}>{previous.winners.length
            ? <>{previous.winners.length > 1 ? "Shared winners" : "Winner"}: {previous.winners.map(entry => playerName(entry.name)).join(" / ")} · {previous.winners[0].score.toFixed(1)} performance score</>
            : "No eligible selection in the last completed week"}</p>
          <p>{previous.games.toLocaleString("en-US")} observed {previous.games === 1 ? "game" : "games"} · Selection based on recorded coverage.</p>
        </> : <p>Last completed-week selection unavailable. No verified data for this period.</p>}
      </div>
      <details>
        <summary>How Player of the Week is tracked</summary>
        <p>The historical position-aware weekly formula scores forwards, defensemen and goaltenders separately. It weighs scoring, plus/minus, physical and defensive contributions for skaters; save percentage, goals-against average, saves, wins and weighted shutouts for goalies, with a games-played workload adjustment. Scores are performance ratings, not votes or probabilities.</p>
        <p>Each unique player appears once, using their strongest qualifying scored role (or strongest provisional role if none qualifies), never the sum of roles. At least three recorded appearances in that role are required for selection. Equal scores share a rank and eligible ties share the award. Provisional standings and in-progress leaders are not final awards.</p>
        <p>Only recorded games and valid recorded player appearances contribute, including recorded partial games; the tracker may not capture every game. Weeks run Monday 00:00 UTC inclusive to the following Monday 00:00 UTC exclusive. The award cutoff is Monday 00:00 UTC. This tracker uses current NHL 27 data only, not old Player of the Week selections.</p>
      </details>
    </div>
  </section>;
}

export default WeeklyTracker;
