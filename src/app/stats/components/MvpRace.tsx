import Link from "next/link";
import type { ClubMember } from "@/lib/chelstats";
import { calculateSeasonMvp, type SeasonMvpEntry } from "@/lib/hockey-awards";
import { HOCKEY_SEASON } from "@/lib/hockey-season-state";
import { getNickname } from "@/lib/nicknames";

const int = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const dec = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Public role stats for the race board. Skaters: GP G A PTS. Goalies: GP SV% GAA SO. */
export function mvpStatLine(entry: SeasonMvpEntry): [string, string][] {
  return entry.isGoalie
    ? [["GP", int(entry.games)], ["SV%", pct(entry.savePct)], ["GAA", dec(entry.gaa)], ["SO", int(entry.shutouts)]]
    : [["GP", int(entry.games)], ["G", int(entry.goals)], ["A", int(entry.assists)], ["PTS", int(entry.points)]];
}
export const roleLabel = (entry: Pick<SeasonMvpEntry, "isGoalie" | "position">) => entry.isGoalie ? "G" : entry.position;

export default function MvpRace({ members, available }: { members: ClubMember[]; available: boolean }) {
  const rankings = calculateSeasonMvp(members);
  const leaders = rankings.filter(entry => entry.rank === 1);
  const feature = leaders[0] ? mvpStatLine(leaders[0]) : [];
  return <div className="stats-mvp-layout">
    <article className="stats-mvp-feature">
      <span className="stats-mvp-watermark" aria-hidden="true" />
      <p className="stats-eyebrow">{leaders.length > 1 ? "Sharing the lead" : leaders.length ? "Setting the standard" : "A season to earn it"}</p>
      <h3>{leaders.length ? leaders.map(entry => getNickname(entry.name)).join(" / ") : "The race starts on the ice."}</h3>
      <p>{leaders.length ? "At the front of the season-long, position-adjusted performance race. Every game can change the order." : available ? "The leaderboard opens once players reach five games in a scored role. No head start from last season." : "Current-season rankings are unavailable. Last season’s scores are never substituted."}</p>
      {feature.length ? <dl className="stats-mvp-line" aria-label={`${getNickname(leaders[0].name)} season stats`}>
        {feature.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl> : null}
      <Link href="/awards">Previous season’s award winners ↗</Link>
    </article>
    <div className="stats-mvp-board">
      {rankings.length ? <div className="stats-ranking-wrap" role="region" aria-label="MVP rankings, scroll for all players" tabIndex={0}>
        <table className="stats-ranking">
          <caption>{HOCKEY_SEASON} · MVP standings</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Player / role</th><th scope="col">Stats</th></tr></thead>
          <tbody>{rankings.map((entry, index) => <tr key={`${entry.name}-${index}`} data-leading={entry.rank === 1}>
            <td className="stats-rank-number">{String(entry.rank).padStart(2, "0")}</td>
            <th scope="row">{getNickname(entry.name)}<small>{roleLabel(entry)}</small></th>
            <td className="stats-rank-stats">
              <dl>{mvpStatLine(entry).map(([label, value]) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}</dl>
            </td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="stats-empty"><h3>{available ? "No eligible performances yet." : "Rankings temporarily unavailable."}</h3><p>{available ? "Five games in a scored role unlock a place in the MVP race." : "The board will return when a verified current-season snapshot is available."}</p></div>}
      <details className="stats-method"><summary>How the MVP race is ordered</summary><p>A season-long performance rating, not a final award, vote total or betting market. Players need at least five games in a scored role. Skater and goalie roles are evaluated separately using the existing position-adjusted model; each player’s strongest role counts, never their sum. Exact ties share a rank. The board shows season totals for that role: games, goals, assists and points for skaters; games, save percentage, goals-against average and shutouts for goalies.</p></details>
    </div>
  </div>;
}
