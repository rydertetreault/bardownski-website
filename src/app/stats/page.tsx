import Image from "next/image";
import Link from "next/link";
import { fetchChannelMessages, parseAllSeasons } from "@/lib/discord";
import { fetchChelstatsData, chelstatsToSeasonData, computeMvpOddsFromMembers } from "@/lib/chelstats";
import { getNickname } from "@/lib/nicknames";
import StatsClient from "./StatsClient";
import "./stats.css";

export default async function StatsPage() {
  const [messages, chelstats] = await Promise.all([fetchChannelMessages(), fetchChelstatsData()]);
  const historical = parseAllSeasons(messages).filter(s => s.season !== "2025");
  const seasons = [...(chelstats ? [chelstatsToSeasonData(chelstats.members)] : []), ...historical];
  const standings = chelstats ? computeMvpOddsFromMembers(chelstats.members) : [];
  const winner = standings[0];
  return <div className="stats-edition">
    <header className="stats-hero">
      <div><p className="stats-eyebrow">THE LEGACY EDITION · STATISTICS</p><h1>THE GAME.<br /><em>BY NUMBERS.</em></h1><p className="stats-intro">Every point earned. Every save made.<br />The players behind the numbers, and the numbers behind the team.</p><a className="stats-button" href="#numbers">Explore player stats ↘</a><p className="stats-caption">BARDOWNSKI <span>/</span> THE STAT BOOK</p></div>
      <figure><Image src="/images/gallery/screenshots/Screenshot 2026-03-16 183710.webp" alt="An overhead view of the Bardownski goaltender defending the crease" fill priority sizes="(max-width: 850px) 100vw, 50vw" /><figcaption>THE SWEATER. THE WORK. THE NUMBERS.</figcaption></figure>
    </header>
    {winner && <section className="stats-standings" id="standings" aria-labelledby="standings-title">
      <div className="stats-section-heading"><div><p className="stats-eyebrow">01 / THE MVP TABLE</p><h2 id="standings-title">Final standings.</h2></div><p>NHL 26 · Ranked by performance.<br />The same position-adjusted model. No projections or betting odds.</p></div>
      <div className="stats-mvp-layout"><article className="stats-mvp"><span className="stats-eyebrow">SEASON MVP / NO. 01</span><span className="stats-watermark" aria-hidden="true">01</span><h3>{getNickname(winner.name)}</h3><p>{winner.isGoalie ? "Goaltender" : winner.position} · {winner.highlights.join(" · ")}</p><div><strong>{winner.score.toFixed(2)}</strong><span>PERFORMANCE SCORE</span></div></article>
      <div className="stats-ranking-wrap" tabIndex={0} role="region" aria-label="MVP final standings"><table className="stats-ranking"><thead><tr><th scope="col">Rank</th><th scope="col">Player / role</th><th scope="col">Score</th></tr></thead><tbody>{standings.map((entry, i) => <tr key={`${entry.name}-${entry.isGoalie}`}><td>{standings.findIndex(e => e.score === entry.score) + 1 < i + 1 ? "=" : ""}{standings.findIndex(e => e.score === entry.score) + 1}</td><th scope="row">{getNickname(entry.name)}<small>{entry.isGoalie ? "Goaltender" : entry.position}</small></th><td>{entry.score.toFixed(2)}</td></tr>)}</tbody></table></div></div>
      <details className="stats-method"><summary>How the standings are calculated</summary><p>Rankings use the existing position-adjusted MVP performance model, with a minimum of five games in the scored role. Skater and goalie roles are scored separately; a player may appear in both. The highest individual role score determines the MVP, not the sum. Scores are performance ratings, not vote totals or win probabilities. Exact ties share a rank.</p></details>
    </section>}
    <section className="stats-numbers" id="numbers"><div className="stats-section-heading"><div><p className="stats-eyebrow">02 / THE PLAYER LEDGER</p><h2>Every contribution counts.</h2></div><p>Explore the leaders, compare teammates,<br />and open a player’s full statistical profile.</p></div>{seasons.length ? <StatsClient seasons={seasons} /> : <p className="stats-empty">Player statistics are currently unavailable. Please check back later.</p>}</section>
    <section className="stats-end"><p className="stats-eyebrow">BEYOND THE NUMBERS</p><h2>The names behind<br /><em>the sweater.</em></h2><Link className="stats-button" href="/roster">Meet the roster ↗</Link></section>
  </div>;
}
