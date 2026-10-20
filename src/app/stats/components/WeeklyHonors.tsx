import type { ClubMember } from "@/lib/chelstats";
import type { WeeklyAwardEntry, WeeklyAwardHistory } from "@/lib/hockey-awards";
import { HOCKEY_SEASON } from "@/lib/hockey-season-state";
import { getDisplayName } from "@/lib/nicknames";
import { resolveNhl27Name } from "@/lib/nhl27-api";
import WeeklyResults, { type WeeklyResultWeek } from "./WeeklyResults";

/** Skaters: goals, assists, points. Goalies: record, SV%, GAA, shutouts. */
function statLine(entry: WeeklyAwardEntry): string[] {
  if (entry.isGoalie) return [`${entry.wins}-${entry.games - entry.wins}`,
    `${(entry.savePct / 100).toFixed(3).replace(/^0/, "")} SV%`, `${entry.gaa.toFixed(2)} GAA`, `${entry.shutouts} SO`];
  return [`${entry.goals} G`, `${entry.assists} A`, `${entry.points} PTS`];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 12–18" or "Sep 28–Oct 4", from a UTC Monday start. */
function weekLabel(startIso: string): string {
  const start = new Date(startIso), end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const first = `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const last = start.getUTCMonth() === end.getUTCMonth() ? `${end.getUTCDate()}` : `${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${first}–${last}`;
}

const identityName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

type WeeklyHonorsProps = {
  history: WeeklyAwardHistory | null;
  members: Pick<ClubMember, "username">[];
  stale: boolean;
};

export default function WeeklyHonors({ history, members, stale }: WeeklyHonorsProps) {
  // Award winners retain source IDs, including players no longer on the roster.
  // Add current members with no recorded wins without merging display nicknames.
  const rows: { id: string; name: string; wins: number | null; rank: number | null }[] =
    (history?.rankings ?? []).map(entry => ({ id: entry.playerId, name: entry.name, wins: entry.wins, rank: entry.rank }));
  const listed = new Set(rows.map(entry => identityName(entry.name)));
  const remaining = members.flatMap(member => {
    const name = resolveNhl27Name(member.username);
    const key = identityName(name);
    if (!key || listed.has(key)) return [];
    listed.add(key);
    return [{ id: `member:${key}`, name, wins: history ? 0 : null, rank: null }];
  }).sort((a, b) => getDisplayName(a.name).localeCompare(getDisplayName(b.name)));
  rows.push(...remaining);
  // Completed weeks that produced a winner, with every qualified player's points.
  const weeks: WeeklyResultWeek[] = (history?.weeks ?? []).filter(week => week.winners.length).map(week => {
    const winners = new Set(week.winners.map(w => w.playerId));
    let rank = 0;
    const qualified = week.standings.filter(entry => entry.eligible);
    return { id: week.start, label: weekLabel(week.start), rows: qualified.map((entry, i) => {
      // Competition ranks: tied points share a rank.
      if (i === 0 || entry.score !== qualified[i - 1].score) rank = i + 1;
      return { id: entry.playerId, name: getDisplayName(entry.name), position: entry.position, games: entry.games,
        points: entry.score, rank, winner: winners.has(entry.playerId), stats: statLine(entry) };
    }) };
  });

  return <section className="stats-weekly-honors" id="weekly-honors" aria-labelledby="weekly-honors-title">
    {/* Preserve old inbound links without retaining the former tracker UI. */}
    <div id="weekly-tracker" aria-hidden="true" />
    <div className="stats-section-heading">
      <div><p className="stats-eyebrow">03 / {HOCKEY_SEASON} · The honor roll</p><h2 id="weekly-honors-title">PLAYER OF<br /><em>THE WEEK.</em></h2></div>
      <p>Total wins this season.<br />One list. Every player’s weekly honors.</p>
    </div>
    <div className="stats-honors-board">
      {(!history || stale) && <p className="stats-honors-status" role="status">{history ? "Last saved data · Latest refresh unconfirmed." : "Award totals are temporarily unavailable. Missing history is not zero wins."}</p>}
      {rows.length ? <table className="stats-honors-table">
        <caption>{HOCKEY_SEASON} · Player of the Week wins</caption>
        <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Wins</th></tr></thead>
        <tbody>{rows.map(entry => <tr key={entry.id} data-winning={entry.wins !== null && entry.wins > 0}>
          <td>{entry.rank !== null && entry.wins !== null && entry.wins > 0 ? String(entry.rank).padStart(2, "0") : "—"}</td>
          <th scope="row">{getDisplayName(entry.name)}</th>
          <td><strong>{entry.wins === null ? "—" : entry.wins.toLocaleString("en-US")}</strong></td>
        </tr>)}</tbody>
      </table> : <p className="stats-honors-empty">{history ? "No Player of the Week wins recorded yet." : "Player win totals will appear when award history is available."}</p>}
      {history && <p className="stats-honors-note">Completed awards only. Shared winners each receive one win. Counts reflect recorded current-season games.</p>}
      <WeeklyResults weeks={weeks} />
    </div>
  </section>;
}
