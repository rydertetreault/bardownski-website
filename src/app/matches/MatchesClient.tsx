"use client";

import Image from "next/image";
import Link from "next/link";
import type { Match, ClubRecord } from "@/types";
import { getResult } from "./utils";

export default function MatchesClient({ matches, clubRecord }: { matches: Match[]; clubRecord: ClubRecord | null }) {
  const last = matches[0];

  return (
    <div className="match-archive">
      <header className="archive-hero">
        <div className="archive-hero-copy">
          <p className="archive-eyebrow">THE LEGACY EDITION · MATCHES</p>
          <h1>FINAL HORN.<br /><em>EVERY STORY.</em></h1>
          <p className="archive-intro">The ice is quiet. The results stay.<br />Revisit the record run from a season that belongs in the rafters.</p>
          <a className="archive-button" href="#streak">Relive the record run ↘</a>
          <p className="archive-season">NHL 26 <span>/</span> SEASON COMPLETE</p>
        </div>
        <figure className="archive-photo">
          <Image src="/images/bench.png" alt="Bardownski hockey players on the bench" fill priority sizes="(max-width: 850px) 100vw, 50vw" />
          <div className="archive-stamp">IN THE<br /><b>BOOKS.</b><small>NEWFOUNDLAND ROOTS. FOREVER OURS.</small></div>
          <figcaption>A SEASON TO REMEMBER / NHL 26</figcaption>
        </figure>
      </header>

      <section className="archive-totals" aria-label="Final season totals">
        <div><strong>{clubRecord ? <>{clubRecord.wins}<span>–{clubRecord.losses}–{clubRecord.otl}</span></> : "—"}</strong><small>FINAL RECORD · W–L–OTL</small></div>
        <div><strong>{clubRecord ? clubRecord.wins + clubRecord.losses + clubRecord.otl : "—"}</strong><small>GAMES IN THE BOOKS</small></div>
        <div><strong>Offseason</strong><small>NO NEW MATCHES BEING RECORDED</small></div>
      </section>

      {last && <section className="archive-feature" aria-labelledby="last-result">
        <div className="archive-feature-copy">
          <p className="archive-eyebrow">01 / THE LAST ENTRY</p>
          <h2 id="last-result">One last<br /><em>look back.</em></h2>
          <p>The most recent result in our saved match archive. A final snapshot of the team on the ice.</p>
          <span className="archive-caption">{last.date} · {last.matchType === "finals" ? "Club finals" : "Club match"}</span>
        </div>
        <article className="archive-scoreboard">
          <div className="archive-score-top"><span>LAST SAVED RESULT</span><span>{getResult(last) === "W" ? "VICTORY" : "DEFEAT"}{last.forfeit ? " · FORFEIT" : ""}</span></div>
          <div className="archive-score-team"><span>Bardownski<small>{last.homeAway}</small></span><strong>{last.scoreUs ?? "—"}</strong></div>
          <div className="archive-score-team opponent"><span>{last.opponent}<small>{last.homeAway === "home" ? "away" : "home"}</small></span><strong>{last.scoreThem ?? "—"}</strong></div>
          <div className="archive-score-bottom"><span>FINAL / NHL 26</span>{!last.id.startsWith("forfeit-") && <Link href={`/matches/${last.id}`}>Inside the match ↗</Link>}</div>
        </article>
      </section>}

      <section className="archive-streak" id="streak" aria-labelledby="streak-title">
        <div className="archive-streak-number" aria-label="24 consecutive wins">
          <span className="archive-eyebrow">NHL 26 / CLUB RECORD</span>
          <strong aria-hidden="true">24</strong>
          <span className="archive-streak-label">CONSECUTIVE WINS</span>
        </div>
        <div className="archive-streak-story">
          <p className="archive-eyebrow">02 / THE RECORD RUN</p>
          <h2 id="streak-title">The streak ended.<br /><em>The standard stayed.</em></h2>
          <p>Twenty-four straight wins. The longest winning streak in Bardownski history, and one of the defining runs of our NHL 26 season.</p>
          <p>A team that kept finding a way. A room that believed in the next shift, the next save, the next win. That is the part the record book keeps.</p>
          <div className="archive-streak-rule"><span>24 WINS IN A ROW</span><span>ONE CLUB STANDARD</span></div>
          <Link href="/records">Explore the record book ↗</Link>
          <small>The record stands even though the complete game-by-game history is no longer available.</small>
        </div>
      </section>
      <section className="archive-closing"><p className="archive-eyebrow">MORE THAN THE SCORELINE</p><h2>One season.<br /><em>Forever ours.</em></h2><Link className="archive-button" href="/">Relive the whole story ↗</Link><p>The results are only part of it. The championship, the standouts, the memories.</p></section>
    </div>
  );
}
