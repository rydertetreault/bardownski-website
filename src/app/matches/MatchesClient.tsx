"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";
import OpponentCrest from "./components/OpponentCrest";
import MatchDialog, { type SelectedMatch } from "./components/MatchDialog";
import type { Match, ClubRecord } from "@/types";
import { HOCKEY_SEASON, HOCKEY_ARCHIVE_SEASON, type HockeySeasonState } from "@/lib/hockey-season-state";
import { getResult } from "./utils";
import { currentWinRun, filterMatches, matchDetailHref, PREVIOUS_SEASON_WIN_STREAK, sortMatches, type MatchFilter, type MatchSeason } from "./hub-utils";

function matchLabel(match: Match) {
  return `${match.status === "final" ? "Final" : match.status === "live" ? "In progress" : "Upcoming"} · ${match.forfeit ? "Forfeit" : match.matchType === "finals" ? "Club finals" : match.matchType === "private" ? "Private game" : "Club match"}`;
}

function resultLabel(match: Match) {
  const result = getResult(match);
  return result === "W" ? "Win" : result === "L" ? "Loss" : match.status === "live" ? "Live" : "—";
}

type OpenReport = (event: MouseEvent<HTMLAnchorElement>, match: Match, season: MatchSeason) => void;

function MatchRow({ match, season, onOpen }: { match: Match; season: MatchSeason; onOpen: OpenReport }) {
  const href = matchDetailHref(match, season);
  const result = getResult(match);
  const content = <>
    <span className="hub-match-date">{match.date}<small>{matchLabel(match)}</small></span>
    <span className="hub-result" data-result={result ?? "pending"} aria-label={resultLabel(match)}>{result ?? "—"}</span>
    <span className="hub-match-teams"><strong>Bardownski <small>{match.homeAway === "home" ? "Home" : "Away"}</small></strong><span>{match.opponent}</span></span>
    <span className="hub-match-score"><strong>{match.scoreUs ?? "—"}</strong><span>{match.scoreThem ?? "—"}</span></span>
    <span className="hub-match-cta">{href ? <>Match report <span aria-hidden="true">↗</span></> : match.forfeit ? "Forfeit result" : "Report pending"}</span>
  </>;
  return <li>{href ? <Link className="hub-match-row" href={href} prefetch={false} onClick={event => onOpen(event, match, season)} aria-haspopup="dialog" aria-label={`Match report: Bardownski ${match.scoreUs ?? "—"}–${match.scoreThem ?? "—"} ${match.opponent}, ${match.date}`}>{content}</Link> : <div className="hub-match-row hub-match-static">{content}</div>}</li>;
}

function MatchBoard({ matches, season, emptyTitle, emptyMessage, onOpen, archive = false }: {
  matches: Match[];
  season: MatchSeason;
  emptyTitle: string;
  emptyMessage: string;
  archive?: boolean;
  onOpen: OpenReport;
}) {
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [query, setQuery] = useState("");
  const pageSize = archive ? 6 : 10;
  const [page, setPage] = useState(1);
  const board = useRef<HTMLDivElement>(null);
  const filtered = filterMatches(matches, filter, query.trim());
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pages);
  const start = (activePage - 1) * pageSize;
  function changePage(value: number) {
    setPage(value);
    board.current?.focus({ preventScroll: true });
    board.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  const filters: { value: MatchFilter; label: string }[] = [
    { value: "all", label: "All matches" }, { value: "W", label: "Wins" }, { value: "L", label: "Losses" },
    ...(!archive ? [{ value: "upcoming" as const, label: "Upcoming" }] : []),
  ];
  const id = archive ? "archive" : "current";
  return <div className="hub-board" ref={board} tabIndex={-1} role="region" aria-label={`${archive ? HOCKEY_ARCHIVE_SEASON : HOCKEY_SEASON} match board`}>
    <div className="hub-board-tools">
      <div className="hub-filters" role="group" aria-label={`${archive ? HOCKEY_ARCHIVE_SEASON : HOCKEY_SEASON} match filters`}>
        {filters.map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPage(1); }}>{item.label}</button>)}
      </div>
      <div className="hub-search"><label htmlFor={`hub-search-${id}`}>Find an opponent</label><input id={`hub-search-${id}`} type="search" placeholder="Search opponents…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
    </div>
    <div className="hub-board-meta"><p role="status" aria-live="polite">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}` : "0"} {filtered.length === 1 ? "match" : "matches"}{filter !== "all" || query.trim() ? " in this view" : " available"}</p><span>Newest first <span aria-hidden="true">↓</span></span></div>
    {filtered.length ? <ul className="hub-match-list">{filtered.slice(start, start + pageSize).map(match => <MatchRow key={match.id} match={match} season={season} onOpen={onOpen} />)}</ul> : <div className="hub-empty">
      <span className="hub-empty-mark" aria-hidden="true">—</span>
      <div><h3>{matches.length ? "No matches in this view." : emptyTitle}</h3><p>{matches.length ? "Try another opponent or choose a different result." : emptyMessage}</p>
        {matches.length > 0 && <button className="hub-text-button" type="button" onClick={() => { setFilter("all"); setQuery(""); setPage(1); }}>Clear filters ↗</button>}
      </div>
    </div>}
    {filtered.length > 0 && <nav className="hub-pagination" aria-label={`${archive ? HOCKEY_ARCHIVE_SEASON : HOCKEY_SEASON} match pages`}>
      <button type="button" disabled={activePage === 1} onClick={() => changePage(activePage - 1)}>← Previous</button>
      <div>{Array.from({ length: pages }, (_, index) => index + 1).filter(number => number === 1 || number === pages || Math.abs(number - activePage) <= 1).map((number, index, numbers) => <span key={number}>{index > 0 && number - numbers[index - 1] > 1 && <span className="hub-page-gap" aria-hidden="true">…</span>}<button type="button" aria-label={`Page ${number}`} aria-current={number === activePage ? "page" : undefined} onClick={() => changePage(number)}>{number}</button></span>)}</div>
      <button type="button" disabled={activePage === pages} onClick={() => changePage(activePage + 1)}>Next →</button>
      <p role="status">Page {activePage} of {pages}</p>
    </nav>}
  </div>;
}

function LatestResult({ match, onOpen }: { match: Match; onOpen: OpenReport }) {
  const href = matchDetailHref(match, "2026-2027");
  const content = <>
    <div className="hub-feature-top"><span>Latest result / {match.date}</span><span className="hub-feature-outcome" data-result={getResult(match)}>{resultLabel(match)}{match.forfeit ? " · Forfeit" : " · Final"}</span></div>
    <div className="hub-feature-score"><div><span className="hub-team-monogram hub-team-logo"><Image data-brand-mark src="/images/logo/B-logo.png" alt="Bardownski B logo" width={48} height={48} /></span><strong>Bardownski</strong><small>{match.homeAway === "home" ? "Home ice" : "On the road"}</small></div><p><b>{match.scoreUs ?? "—"}</b><span>–</span><b>{match.scoreThem ?? "—"}</b></p><div><OpponentCrest opponent={match.opponent} crest={match.opponentCrest} className="hub-opponent-crest" /><strong>{match.opponent}</strong><small>Opposition</small></div></div>
    <div className="hub-feature-bottom"><span>{match.matchType === "finals" ? "Club finals" : match.matchType === "private" ? "Private game" : "Club match"} · {HOCKEY_SEASON}</span><strong>{href ? "Open match report ↗" : "Forfeit result · No match report"}</strong></div>
  </>;
  return href ? <Link href={href} className="hub-feature" prefetch={false} onClick={event => onOpen(event, match, "2026-2027")} aria-haspopup="dialog" aria-label={`Latest match report: Bardownski ${match.scoreUs ?? "score unavailable"}–${match.scoreThem ?? "score unavailable"} ${match.opponent}, ${match.date}`}>{content}</Link> : <div className="hub-feature">{content}</div>;
}

export default function MatchesClient({ season, archivedMatches, archivedRecord }: { season: HockeySeasonState; archivedMatches: Match[]; archivedRecord: ClubRecord | null }) {
  const [selected, setSelected] = useState<SelectedMatch | null>(null);
  const openReport: OpenReport = (event, match, matchSeason) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSelected({ match, season: matchSeason });
  };
  const record = season.data?.clubStats;
  const matches = sortMatches(season.matches);
  const archive = sortMatches(archivedMatches);
  const latest = matches.find(match => match.status === "final");
  const form = matches.filter(match => match.matchType !== "private" && getResult(match) !== null).slice(0, 5).reverse();
  const run = currentWinRun(matches);
  const emptyTitle = season.status === "unavailable" ? "Results are temporarily unavailable." : "The next chapter starts here.";
  const emptyMessage = season.status === "unavailable"
    ? "Please try again later. You can still revisit last season’s matches below."
    : record && record.totalGames > 0
      ? "Individual match results aren’t available right now. Explore last season’s games while we get the latest scores."
      : "The first results of the season will appear here. Until then, revisit the games from 2025–2026 below.";

  return <div className="matches-hub">
    {selected && <MatchDialog key={`${selected.season}:${selected.match.id}`} selected={selected} onClose={() => setSelected(null)} />}
    <header className="hub-hero">
      <div className="hub-hero-copy"><p className="hub-eyebrow">{HOCKEY_SEASON} / The match centre</p><h1>EVERY GAME.<br /><em>EVERY DETAIL.</em></h1><p className="hub-intro">From the opening faceoff to the final horn. The scores, the standouts and the story behind every Bardownski match.</p><div className="hub-hero-actions"><a className="hub-button" href="#results">Explore the matches <span aria-hidden="true">↘</span></a><a className="hub-text-link" href="#archive">Last season ↗</a></div><p className="hub-hero-caption">Newfoundland roots. <span>All in, every shift.</span></p></div>
      <div className="hub-hero-visual"><figure className="hub-hero-photo"><Image src="/images/bench.png" alt="Bardownski players ready for the next shift on the bench" fill priority sizes="(max-width: 800px) 100vw, 48vw" /><figcaption>Bardownski hockey / Between the boards</figcaption></figure>
        <section className="hub-streak" aria-labelledby="hub-streak-title"><div className="hub-streak-heading"><h2 id="hub-streak-title">THE WIN STREAK</h2><span aria-hidden="true">↗</span></div><div className="hub-streak-numbers"><div><strong>{run ?? "—"}</strong><span>{season.status === "stale" ? "Last saved results" : "Latest results"}<small>{run === null ? "Waiting for a final score" : run === 1 ? "Win in a row" : "Wins in a row"}</small></span></div><div className="hub-streak-benchmark"><strong>{PREVIOUS_SEASON_WIN_STREAK}</strong><span>Last season’s best<small>{HOCKEY_ARCHIVE_SEASON}</small></span></div></div><div className="hub-streak-ticks" aria-hidden="true">{Array.from({ length: PREVIOUS_SEASON_WIN_STREAK }, (_, index) => <i key={index} data-filled={run !== null && index < run} />)}</div><p>Based on available competitive results. <Link href="/records">The record book ↗</Link></p></section>
      </div>
    </header>

    <section className="hub-pulse" aria-label="Season at a glance">
      <div className="hub-pulse-stat"><span>{HOCKEY_SEASON} record</span><strong>{record ? `${record.wins}–${record.losses}–${record.otl}` : "—"}</strong><small>W–L–OTL</small></div><div className="hub-pulse-stat"><span>Games played</span><strong>{record ? record.totalGames : "—"}</strong><small>This season</small></div><div className="hub-form"><span>Recent form <small>Oldest → newest</small></span>{form.length ? <ol aria-label="Last five available competitive results, oldest to newest">{form.map(match => <li key={match.id} data-result={getResult(match)} title={`${resultLabel(match)} · ${match.date} · ${match.opponent}`}><span aria-label={`${resultLabel(match)} against ${match.opponent}, ${match.date}`}>{getResult(match)}</span></li>)}</ol> : <p>Next game. Fresh start.</p>}<small>Available competitive results</small></div>
    </section>

    <section className="hub-results" id="results" aria-labelledby="results-title">
      <div className="hub-section-heading"><div><p className="hub-eyebrow">01 / On the scoreboard</p><h2 id="results-title">RECENT MATCHES.</h2></div><p>Pick a game. Get the full picture.<br />Team stats, player performances and the match recap.</p></div>
      {season.status === "stale" && <p className="hub-data-note">Showing the last available results. Newer scores may be delayed.</p>}
      {latest && <LatestResult match={latest} onOpen={openReport} />}
      <MatchBoard onOpen={openReport} matches={matches} season="2026-2027" emptyTitle={emptyTitle} emptyMessage={emptyMessage} />
    </section>

    <section className="hub-archive" id="archive" aria-labelledby="archive-title">
      <div className="hub-section-heading"><div><p className="hub-eyebrow">02 / Worth another look</p><h2 id="archive-title">LAST SEASON.<br /><em>STILL OUR STORY.</em></h2></div><div className="hub-archive-record"><span>{HOCKEY_ARCHIVE_SEASON} / Final record</span><strong>{archivedRecord ? `${archivedRecord.wins}–${archivedRecord.losses}–${archivedRecord.otl}` : "—"}</strong><small>W–L–OTL · Previous season</small></div></div>
      <div className="hub-archive-intro"><p>A 24-win run. A season to remember. Revisit the available match reports from {HOCKEY_ARCHIVE_SEASON}.</p><Link className="hub-text-link" href="/records">Explore the record book ↗</Link></div>
      <MatchBoard onOpen={openReport} matches={archive} season="2025-2026" archive emptyTitle="The scorebook is taking a breather." emptyMessage="Previous-season match reports are unavailable right now. The final club record is preserved above." />
      <p className="hub-archive-note">The game-by-game archive is incomplete; the final season record includes games without individual reports.</p>
    </section>

    <section className="hub-closing club-mark-panel"><p className="hub-eyebrow">Beyond the final horn</p><h2>THE SCORE IS ONLY<br /><em>HALF THE STORY.</em></h2><div><Link className="hub-button" href="/stats">Meet the standouts ↗</Link><Link className="hub-text-link" href="/highlights">Watch the highlights ↗</Link></div></section>
  </div>;
}
