import Link from "next/link";
import { type ClubMember } from "@/lib/chelstats";
import { calculateSeasonMvp } from "@/lib/hockey-awards";
import { getDisplayNameFromGamertag, getNickname } from "@/lib/nicknames";
import { HOCKEY_SEASON, type HockeySeasonState } from "@/lib/hockey-season-state";
import "./season-tracking.css";

export function TopPerformers({ members }: { members: ClubMember[] }) {
  const categories = [
    { label: "Points leader", key: "points" as const, unit: "PTS", eligible: (m: ClubMember) => m.gamesPlayed > 0 },
    { label: "Goal scorer", key: "goals" as const, unit: "G", eligible: (m: ClubMember) => m.gamesPlayed > 0 },
    { label: "Playmaker", key: "assists" as const, unit: "A", eligible: (m: ClubMember) => m.gamesPlayed > 0 },
    { label: "Between the pipes", key: "goalieSaves" as const, unit: "SVS", eligible: (m: ClubMember) => m.goalieGP > 0 },
  ];
  return <div className="season-performers">{categories.map(({ label, key, unit, eligible }, index) => {
    const candidates = members.filter(eligible);
    const best = candidates.length ? Math.max(...candidates.map(m => m[key])) : null;
    const leaders = candidates.filter(m => m[key] === best);
    return <article key={key}>
      <div className="tracking-card-label"><span>{label}</span><span>0{index + 1}</span></div>
      <strong>{best === null ? "—" : best.toLocaleString("en-US")} <small>{unit}</small></strong>
      <h3>{leaders.length ? leaders.map(m => getDisplayNameFromGamertag(m.username)).join(" / ") : "A new name to earn it."}</h3>
      <p>{leaders.length ? `${HOCKEY_SEASON} · ${leaders.length > 1 ? "Joint leaders" : "Season leader"}` : "Leaders appear as games are played."}</p>
    </article>;
  })}</div>;
}

export function MvpTracker({ members }: { members: ClubMember[] }) {
  const rankings = calculateSeasonMvp(members);
  return <div className="season-mvp-tracker">
    <div className="tracker-intro">
      <span className="tracking-card-label">{HOCKEY_SEASON} / PERFORMANCE RANKINGS</span>
      <h3>{rankings.length ? "The race is on." : "The race starts on the ice."}</h3>
      <p>{rankings.length ? "A running view of the season’s strongest performances. Not a final award or a vote." : "No favorite. No head start. The new MVP race begins with this season’s numbers—not last year’s totals."}</p>
      <Link href="/awards">2025–2026 award winners ↗</Link>
    </div>
    <div className="tracker-table-wrap">
      {rankings.length ? <table className="tracker-table"><caption>Current season MVP rankings</caption><thead><tr><th scope="col">Rank</th><th scope="col">Player / role</th><th scope="col">Score</th></tr></thead><tbody>{rankings.map(entry => <tr key={`${entry.name}-${entry.isGoalie}`}><td>{entry.rank}</td><th scope="row">{getNickname(entry.name)}<small>{entry.isGoalie ? "Goaltender" : entry.position}</small></th><td>{entry.score.toFixed(2)}</td></tr>)}</tbody></table> : <div className="tracker-waiting"><span className="tracker-letters" aria-hidden="true">MVP</span><b>Awaiting eligible performances</b><p>Rankings unlock after players reach five games in a scored role.</p></div>}
      <details className="tracker-method"><summary>How the MVP tracker works</summary><p>The position-adjusted performance model requires at least five games in a scored role. Skater and goalie roles are scored separately; the highest role score counts, not their sum. Exact ties share a rank. Scores are performance ratings—not betting odds, vote totals, or win probabilities.</p></details>
    </div>
  </div>;
}

function TrackingTime({ value }: { value: string }) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <>Timestamp unavailable</>;
  return <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  })} UTC</time>;
}

/** Optional state preserves existing pending-only callers. Never substitute archive data. */
export function TrackingNotice({ state }: { state?: HockeySeasonState } = {}) {
  const status = state?.status ?? "awaiting-setup";
  // A healthy feed is plumbing, not a public announcement.
  if (status === "connected") return null;
  const titles = {
    stale: "tracking is stale — showing the last saved snapshot.",
    unavailable: "tracking is currently unavailable.",
    "awaiting-setup": "tracking is being prepared.",
  };
  const descriptions = {
    stale: "The latest refresh could not be confirmed. Saved current-season totals and results remain available; these are not live numbers.",
    unavailable: "No verified current-season stats snapshot is available. Missing numbers are not zero, and previous-season totals are not used as a substitute.",
    "awaiting-setup": "Match results, player totals and rankings will appear once the new-season feed is connected. Previous-season numbers stay in the archive.",
  };
  return <div className={`season-tracking-notice tracking-${status}`} role="status">
    <span className="tracking-dot" aria-hidden="true" />
    <div>
      <p><strong>{state?.season ?? HOCKEY_SEASON} {titles[status]}</strong> {descriptions[status]}</p>
      {state && <p className="tracking-freshness">
        <span>Feed checked: {state.updatedAt ? <TrackingTime value={state.updatedAt} /> : "Not available"}.</span>{" "}
        <span>Last stored sync: {state.syncedAt ? <TrackingTime value={state.syncedAt} /> : "Not confirmed"}.</span>{" "}
        <span>Stored matches: {state.coverage.storedMatches.toLocaleString("en-US")} / {state.coverage.totalGames === null ? "unknown season total" : `${state.coverage.totalGames.toLocaleString("en-US")} season games`}.</span>
      </p>}
    </div>
  </div>;
}
