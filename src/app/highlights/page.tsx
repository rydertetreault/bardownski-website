import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HighlightsClient from "./HighlightsClient";
import { players } from "./highlights-data";
import "./highlights.css";

export const metadata: Metadata = {
  title: "Highlights | Bardownski Hockey",
  description: "The goals, the saves, and the plays worth another look. Explore Bardownski’s highlight collection, player by player.",
};

export default function HighlightsPage() {
  const totalClips = players.reduce((sum, player) => sum + player.clips.length, 0);
  return (
    <div className="highlights-edition">
      <header className="film-hero" aria-labelledby="film-title">
        <div className="film-hero-image">
          <Image src="/images/homepage/bench-wide.webp" alt="Bardownski players together on the bench" fill priority sizes="100vw" />
        </div>
        <div className="film-hero-copy film-inner">
          <p className="film-eyebrow">Bardownski hockey / The film room</p>
          <h1 id="film-title">Worth<br /><em>another look.</em></h1>
          <p className="film-hero-intro">The goals. The saves. The plays we keep coming back to. This is Bardownski, on tape.</p>
          <a className="film-text-link" href="#collection">Explore the collection <span aria-hidden="true">↓</span></a>
          <p className="film-library-note">{String(players.length).padStart(2, "0")} players <span aria-hidden="true">/</span> {totalClips} clips <span aria-hidden="true">/</span> One club</p>
        </div>
      </header>

      <section id="collection" className="film-index" aria-labelledby="collection-title">
        <div className="film-inner">
          <div className="film-index-heading">
            <div><p className="film-eyebrow">The player collection</p><h2 id="collection-title">Pick a name.<br /><em>Roll the tape.</em></h2></div>
            <p>Individual plays and full edits from the club collection.<br />Choose a player, then press play.</p>
          </div>
          <nav className="film-player-nav" aria-label="Jump to player highlights">
            {players.map((player, index) => <a key={player.id} href={`#highlights-${player.id}`}><span className="film-nav-index">{String(index + 1).padStart(2, "0")}</span><span>{player.name}</span><span aria-hidden="true">↘</span></a>)}
          </nav>
        </div>
      </section>

      <HighlightsClient players={players} />

      <section className="film-outro club-mark-panel" aria-labelledby="film-outro-title">
        <div className="film-inner">
          <p className="film-eyebrow">Beyond the replay</p>
          <h2 id="film-outro-title">The plays.<br /><em>The people.</em></h2>
          <div className="film-outro-links"><Link className="film-text-link" href="/roster">Meet the roster <span aria-hidden="true">↗</span></Link><Link href="/matches">Follow the games <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>
    </div>
  );
}
