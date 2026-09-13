"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Match, ClubRecord } from "@/types";
import { HOCKEY_SEASON, type HockeySeasonState } from "@/lib/hockey-season-state";
import { TrackingNotice } from "@/components/season/SeasonTracking";
import { getResult } from "./utils";

function ResultsList({ matches, season }: { matches: Match[]; season: "2026-2027" | "2025-2026" }) {
  return <ul className="archive-match-list">{matches.map(match => {
    const result = getResult(match);
    return <li key={match.id}>
      <div className="archive-match-date">{match.date}<small>{match.status === "final" ? "Final" : match.status === "live" ? "In progress" : "Upcoming"} · {match.matchType === "finals" ? "Club finals" : match.matchType === "private" ? "Private game" : "Club match"}{match.forfeit ? " · Forfeit" : ""}</small></div>
      <span className={`archive-result-mark ${result === "W" ? "won" : ""}`} aria-label={result === "W" ? "Win" : result === "L" ? "Loss" : "Not final"}>{result ?? "—"}</span>
      <div className="archive-match-teams"><span>Bardownski</span><span>{match.opponent}</span></div>
      <div className="archive-match-score"><strong>{match.scoreUs ?? "—"}</strong><strong>{match.scoreThem ?? "—"}</strong></div>
      <span className="archive-match-link">{match.status === "final" && !match.forfeit && <Link href={`/matches/${encodeURIComponent(match.id)}?season=${season}`}>Match details ↗</Link>}</span>
    </li>;
  })}</ul>;
}

export default function MatchesClient({ season, archivedMatches, archivedRecord }: { season: HockeySeasonState; archivedMatches: Match[]; archivedRecord: ClubRecord | null }) {
  const [filter, setFilter] = useState("all");
  const record = season.data?.clubStats;
  const matches = [...season.matches].sort((a, b) => b.timestamp - a.timestamp);
  const filtered = matches.filter(match => filter === "all" || (filter === "upcoming" ? match.status === "upcoming" : getResult(match) === filter));
  const archive = [...archivedMatches].sort((a, b) => b.timestamp - a.timestamp);
  const last = archive[0];
  const trackingStatus = { connected: "Connected", stale: "Last saved data", unavailable: "Unavailable", "awaiting-setup": "Setup pending" }[season.status];
  const emptyTitle = filter !== "all" ? "No matches in this view." : season.status === "unavailable" ? "The match feed is unavailable." : "No current-season matches are available yet.";
  const emptyMessage = season.status === "unavailable"
    ? "Current-season results could not be loaded. This is not a zero-game record; previous-season results remain separate below."
    : season.status === "awaiting-setup"
      ? "Match tracking is not connected yet. New-season results will appear here once it is ready; confirmed fixtures will be listed when available."
      : season.status === "stale"
        ? "No matching games are available in the last saved current-season data. The latest refresh could not be confirmed."
        : "No matching games are available in the accumulated current-season history. Missing individual results are not assumed or replaced with archive games.";
  return <div className="match-archive">
    <header className="archive-hero"><div className="archive-hero-copy"><p className="archive-eyebrow">{HOCKEY_SEASON} · THE MATCH CENTRE</p><h1>NEXT SHIFT.<br /><em>NEXT STORY.</em></h1><p className="archive-intro">A fresh season on the ice.<br />Follow the results, the turning points and the nights that define our next chapter.</p><a className="archive-button" href="#results">Season matches ↘</a><p className="archive-season">BARDOWNSKI <span>/</span> {HOCKEY_SEASON}</p></div><figure className="archive-photo"><Image src="/images/bench.png" alt="Bardownski hockey players on the bench" fill priority sizes="(max-width: 850px) 100vw, 50vw" /><div className="archive-stamp">THE NEXT<br /><b>SHIFT.</b><small>NEWFOUNDLAND ROOTS. SAME CLUB.</small></div><figcaption>A NEW CHAPTER / {HOCKEY_SEASON}</figcaption></figure></header>
    <section className="archive-totals" aria-label="Current season totals"><div><strong>{record ? <>{record.wins}<span>–{record.losses}–{record.otl}</span></> : "—"}</strong><small>{HOCKEY_SEASON} RECORD · W–L–OTL</small></div><div><strong>{record ? record.totalGames : "—"}</strong><small>SEASON GAMES</small></div><div><strong>{trackingStatus}</strong><small>CURRENT-SEASON TRACKING</small></div></section>
    <section className="archive-results" id="results" aria-labelledby="results-title">
      <div className="archive-section-head"><div><p className="archive-eyebrow">01 / THE CURRENT SEASON</p><h2 id="results-title">The match board.</h2></div><p>All accumulated current-season results.<br />No missing games or fixtures have been assumed.</p></div>
      <TrackingNotice state={season} />
      <div className="archive-toolbar"><p>{HOCKEY_SEASON} / MATCHES ({filtered.length} of {matches.length})</p><div><label htmlFor="match-filter">Show</label><select id="match-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All matches</option><option value="upcoming">Upcoming</option><option value="W">Wins</option><option value="L">Losses</option></select></div></div>
      {filtered.length ? <ResultsList matches={filtered} season="2026-2027" /> : <div className="archive-empty"><h3>{emptyTitle}</h3><p>{emptyMessage}</p><Link href="/">Back to the season hub ↗</Link></div>}
    </section>
    <section className="archive-results archive-history" id="archive" aria-labelledby="history-title">
      <div className="archive-section-head"><div><p className="archive-eyebrow">02 / THE HISTORY STAYS</p><h2 id="history-title">2025–2026 archive.</h2></div><p>Previous-season results, kept separate.<br />The saved match history is incomplete.</p></div>
      <div className="archive-history-summary"><strong>{archivedRecord ? `${archivedRecord.wins}–${archivedRecord.losses}–${archivedRecord.otl}` : "—"}<small>FINAL 2025–2026 RECORD · W–L–OTL</small></strong><p>24 consecutive wins. A club record.<br />The standard for the season ahead.</p><Link href="/records">The record book ↗</Link></div>
      {last && <p className="archive-footnote">Last saved result: {last.date} · Bardownski {last.scoreUs}–{last.scoreThem} {last.opponent}</p>}
      <details className="archive-history-details"><summary>Browse saved 2025–2026 matches ({archive.length})</summary>{archive.length ? <ResultsList matches={archive} season="2025-2026" /> : <p className="archive-footnote">Saved game-by-game results are currently unavailable. The final club record is preserved above.</p>}<p className="archive-footnote">These are the available saved results, not the complete season. The archived record includes games that are not available individually.</p></details>
    </section>
    <section className="archive-closing"><p className="archive-eyebrow">THE NEXT CHAPTER</p><h2>Same club.<br /><em>More to write.</em></h2><Link className="archive-button" href="/">Back to the season hub ↗</Link><p>New colors. New leadership. Bardownski hockey.</p></section>
  </div>;
}
