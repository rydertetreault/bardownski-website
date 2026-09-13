import Link from "next/link";
import type { ClubMember } from "@/lib/chelstats";
import { calculateSeasonMvp } from "@/lib/hockey-awards";
import { HOCKEY_SEASON } from "@/lib/hockey-season-state";
import { getNickname } from "@/lib/nicknames";

export default function MvpRace({ members, available }: { members: ClubMember[]; available: boolean }) {
  const rankings = calculateSeasonMvp(members);
  const leaders = rankings.filter(entry => entry.rank === 1);
  return <div className="stats-mvp-layout">
    <article className="stats-mvp-feature">
      <span className="stats-mvp-watermark" aria-hidden="true" />
      <p className="stats-eyebrow">{leaders.length > 1 ? "Sharing the lead" : leaders.length ? "Setting the standard" : "A season to earn it"}</p>
      <h3>{leaders.length ? leaders.map(entry => getNickname(entry.name)).join(" / ") : "The race starts on the ice."}</h3>
      <p>{leaders.length ? "At the front of the season-long, position-adjusted performance race. Every game can change the order." : available ? "The leaderboard opens once players reach five games in a scored role. No head start from last season." : "Current-season rankings are unavailable. Last season’s scores are never substituted."}</p>
      <div className="stats-mvp-score"><strong>{leaders.length ? leaders[0].score.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</strong><span>Performance score<br />{HOCKEY_SEASON}</span></div>
      <Link href="/awards">Previous season’s award winners ↗</Link>
    </article>
    <div className="stats-mvp-board">
      {rankings.length ? <div className="stats-ranking-wrap" role="region" aria-label="MVP rankings, scroll for all players" tabIndex={0}>
        <table className="stats-ranking">
          <caption>{HOCKEY_SEASON} · MVP standings</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Player / role</th><th scope="col">Games</th><th scope="col">Score</th></tr></thead>
          <tbody>{rankings.map((entry, index) => <tr key={`${entry.name}-${index}`} data-leading={entry.rank === 1}>
            <td className="stats-rank-number">{String(entry.rank).padStart(2, "0")}</td>
            <th scope="row">{getNickname(entry.name)}<small>{entry.isGoalie ? "Goaltender" : entry.position}</small></th>
            <td>{entry.games.toLocaleString("en-US")}</td><td className="stats-rank-score">{entry.score.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="stats-empty"><h3>{available ? "No eligible performances yet." : "Rankings temporarily unavailable."}</h3><p>{available ? "Five games in a scored role unlock a place in the MVP race." : "The board will return when a verified current-season snapshot is available."}</p></div>}
      <details className="stats-method"><summary>How the MVP race is scored</summary><p>A season-long performance rating, not a final award, vote total or betting market. Players need at least five games in a scored role. Skater and goalie roles are evaluated separately using the existing position-adjusted model; each player’s strongest role counts, never their sum. Exact score ties share a rank. Displayed scores are rounded to two decimals.</p></details>
    </div>
  </div>;
}
