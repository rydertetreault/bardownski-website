/* eslint-disable @next/next/no-img-element */
// Static season content is server rendered; motion is a progressive enhancement.
import Link from "next/link";
import { SEASON_AWARDS, SEASON_MVP, UNSUNG_HERO } from "@/lib/season-awards";
import SeasonMotion from "./SeasonMotion";
import "./season-recap.css";

export default function SeasonRecap() {
  return (
    <div
      id="season-recap"
      className="legacy-home concept-1 motion-demo motion-curtain"
    >
      <nav className="recap-nav" aria-label="Season chapters">
        <span>NHL 26 / SEASON COMPLETE</span>
        <nav aria-label="Recap sections">
          <a href="#story">The recap</a>
          <a href="#mvp-stage">MVP &amp; honors</a>
          <a href="#next">What’s next ↗</a>
        </nav>
      </nav>
      <section className="hero" id="film-0">
        <div className="hero-copy">
          <p className="eyebrow">THE LEGACY EDITION</p>
          <h1>
            ONE SEASON.
            <br />
            <em>FOREVER OURS.</em>
          </h1>
          <p className="hero-description">
            366 games. Our first championship. A season that belongs in the
            rafters.
          </p>
          <div className="actions">
            <a className="button" href="#story">
              Relive the season ↗
            </a>
            <a href="#mvp-stage">Meet the standouts ↓</a>
          </div>
          <span className="season-label">
            NHL 26 <span> / </span> FINAL SEASON RECAP
          </span>
          <div className="motion-guide">
            <a href="#mvp-stage">Jump to the MVP reveal ↓</a>
            <button
              className="motion-toggle"
              type="button"
              aria-pressed="false"
            >
              Pause animations
            </button>
          </div>
        </div>
        <figure>
          <img
            src="/images/team pic.png"
            alt="Bardownski hockey team on the ice"
          />
          <figcaption>NEWFOUNDLAND ROOTS. BARDOWNSKI FOREVER.</figcaption>
          <div className="photo-stamp">
            FIRST
            <br />
            <b>CLASS.</b>
            <small>CHAMPIONS / SEASON 4</small>
          </div>
        </figure>
      </section>
      <div className="stats" id="film-1">
        <div className="scroll-reveal">
          <strong>
            207<span>–144–15</span>
          </strong>
          <small>FINAL RECORD · W–L–OTL</small>
        </div>
        <div className="scroll-reveal">
          <strong>366</strong>
          <small>GAMES IN THE BOOKS</small>
        </div>
        <div className="scroll-reveal">
          <strong>01</strong>
          <small>FIRST CLUB CHAMPIONSHIP</small>
        </div>
      </div>
      <div className="film-interlude">
        <div className="interlude-inner">
          <span>THE MOMENT THAT CHANGED THE CLUB</span>
          <p>
            SEVEN YEARS.
            <br />
            <em>ONE FIRST TITLE.</em>
          </p>
          <div className="interlude-line" aria-hidden="true"></div>
        </div>
      </div>
      <section id="story" className="section story">
        <div className="story-image">
          <img
            src="/images/club finals.png"
            alt="Bardownski club finals celebration"
            loading="lazy"
          />
          <span>SEASON 4 / ELITE DIVISION CLUB FINALS</span>
        </div>
        <article className="scroll-reveal">
          <p className="eyebrow">01 / CLUB NEWS · SEASON RECAP</p>
          <h2>A championship deserves a curtain call.</h2>
          <p>
            The NHL 26 season is officially in the books. Bardownski closes the
            year at <b>207–144–15</b> across 366 games, with something we had
            been chasing for seven years: our first club championship.
          </p>
          <p>
            A 5–3 win over B A N G N A T I O N sealed the Season 4 Elite
            Division Club Finals title. A 16–2–1 championship run became a piece
            of club history.
          </p>
          <details>
            <summary>
              Read the full season-ending article <span>↗</span>
            </summary>
            <div className="article-body">
              <p>
                On championship night, it was the defensive game that carried
                us. Sticks in lanes, bodies in front of pucks, and a team
                willing to do the work without the puck. JRT IV delivered
                between the pipes, and Xavier Laflamme finished the bracket as
                the championship-run MVP.
              </p>
              <p>
                Season MVP and statistical team awards are now calculated from
                the final-season snapshot using the criteria below. Community
                honors remain team selections. Until then, the final numbers
                tell part of the story—but not all of it. Every shift, every
                late night, and every teammate helped make this season ours.
              </p>
              <p>
                Now comes the annual reset. New colors and a new leadership
                chapter are ahead, with reveal details still to come. This
                season’s identity and achievements deserve to be preserved as we
                prepare for what follows.
              </p>
              <p>
                To everyone who took the ice with Bardownski: thank you. Season
                over. History made.
              </p>
              <Link href="/news/season-finale-nhl26">
                Read the season-ending article ↗
              </Link>
            </div>
          </details>
        </article>
      </section>
      <section
        id="mvp-stage"
        className="mvp-stage"
        aria-label="Season MVP reveal"
      >
        <div className="stage-pin">
          <div className="stage-grid" aria-hidden="true"></div>
          <div className="stage-halo" aria-hidden="true"></div>
          <div className="stage-top">
            <span>THE LEGACY / NHL 26</span>
            <span>SEASON HONORS</span>
          </div>
          <div className="stage-content">
            <p className="eyebrow">NHL 26 · FINAL SEASON AWARDS</p>
            <div className="stage-star" aria-hidden="true">
              ★
            </div>
            <p className="stage-title">SEASON MVP</p>
            <h2>
              <em>{SEASON_MVP.winners.join(" & ")}</em>
            </h2>
            <p className="stage-description">
              The season’s highest-rated performance.
              <br />
              The name we’ll remember.
            </p>
            <div className="stage-record">
              <span>
                {SEASON_MVP.result.split(" ")[0]} <small>PERFORMANCE SCORE</small>
              </span>
              <span>
                NHL 26 <small>FINAL SEASON</small>
              </span>
            </div>
          </div>
          <div className="stage-curtain curtain-left" aria-hidden="true">
            <span>FOR THE</span>
          </div>
          <div className="stage-curtain curtain-right" aria-hidden="true">
            <span>LEGACY.</span>
          </div>
          <div className="stage-bottom">
            <span>
              Calculated from final-season stats · Position-adjusted MVP model
            </span>
            <a href="#awards">All team honors ↓</a>
            <button className="replay-curtain">Replay curtain reveal ↻</button>
          </div>
          <div className="stage-progress" aria-hidden="true"></div>
        </div>
      </section>
      <section id="awards" className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">02 / THE PEOPLE WHO MADE IT</p>
            <h2>The team behind the legacy.</h2>
          </div>
          <p>Final NHL 26 stats and team-selected honors.<br />Transparent criteria. Shared honors for ties.</p>
        </div>
        <div className="awards">
          <article className="mvp supporting-mvp">
            <span className="tag">CALCULATED · SEASON MVP</span>
            <div className="award-mark" aria-hidden="true">★</div>
            <h3>{SEASON_MVP.winners.join(" & ")}</h3>
            <p>{SEASON_MVP.result}</p>
            <div className="award-bottom">NHL 26 <b>FULL-SEASON PERFORMANCE</b></div>
            <p>{SEASON_MVP.criteria}</p>
          </article>
          <div className="award-stack">
            <article>
              <span className="tag">TEAM SELECTION · {UNSUNG_HERO.title}</span>
              <h3>{UNSUNG_HERO.winner}</h3>
              <p>{UNSUNG_HERO.detail}</p>
              <small>{UNSUNG_HERO.description}</small>
            </article>
            {SEASON_AWARDS.slice(1).map(award => (
              <article key={award.id}>
                <span className="tag">{award.title}</span>
                <h3>{award.winners.join(" & ") || "No eligible players"}</h3>
                <p>{award.result}</p>
                <small>{award.criteria}</small>
              </article>
            ))}
          </div>
        </div>
        <details className="award-methodology">
          <summary>How the awards are calculated</summary>
          <p>Season MVP and the calculated awards are statistical honors, not vote results. Season MVP and positional honors use the same weighted performance model as the site’s MVP rankings, applied to the frozen final-season snapshot. Ranking scores are not vote counts or win probabilities. Defensemen receive position-specific weighting; goalies have a separate rate-and-workload model. Skater volume is dampened above 100 games. All exact ties share an award.</p>
          <p>The remaining awards use raw season totals. A player can earn multiple awards; no winner is forced into a different category just to distribute honors.</p>
          <p>Slobby Robby is the team-approved Unsung Hero, a judgment-based selection rather than a model result. Teammate of the Year remains a team selection and has not been announced.</p>
        </details>
        <div className="standouts">
          <p className="eyebrow">
            BY THE NUMBERS / STATISTICAL STANDOUTS, NOT VOTED AWARDS
          </p>
          <div>
            <article className="scroll-reveal">
              <b>Xavier Laflamme</b>
              <strong>1,410</strong>
              <small>POINTS · 920 GOALS</small>
            </article>
            <article className="scroll-reveal">
              <b>Matt Hut</b>
              <strong>801</strong>
              <small>POINTS · 329 ASSISTS</small>
            </article>
            <article className="scroll-reveal">
              <b>Jene Rene Tetreau IV</b>
              <strong>2,135</strong>
              <small>SAVES · 21 SHUTOUTS</small>
            </article>
            <article className="scroll-reveal">
              <b>Slobby Robby</b>
              <strong>170</strong>
              <small>ASSISTS · 123 BLOCKED SHOTS</small>
            </article>
          </div>
        </div>
      </section>
      <div className="film-interlude">
        <div className="interlude-inner">
          <span>NEW COLORS. NEW LEADERSHIP. SAME CLUB.</span>
          <p>
            THIS CHAPTER CLOSES.
            <br />
            <em>THE NEXT ONE IS OURS.</em>
          </p>
          <div className="interlude-line" aria-hidden="true"></div>
        </div>
      </div>
      <section id="next" className="section next">
        <div className="section-head">
          <div>
            <p className="eyebrow">03 / THE NEXT CHAPTER</p>
            <h2>Same club. New era.</h2>
          </div>
          <p>
            Every season, we make it ours again.
            <br />
            No reveals announced yet.
          </p>
        </div>
        <div className="next-grid">
          <article className="scroll-reveal">
            <span className="number">01</span>
            <h3>A new set of colors.</h3>
            <div className="swatches">
              <i></i>
              <i></i>
              <i></i>
              <span>?</span>
            </div>
            <p>
              The next identity is still under wraps. This season’s colors stay
              in the archive.
            </p>
            <span className="tag">COLOR REVEAL · PENDING</span>
          </article>
          <article className="scroll-reveal">
            <span className="number">02</span>
            <h3>Who wears the letters?</h3>
            <div className="letters">
              <b>C</b>
              <b>A</b>
              <b>A</b>
            </div>
            <p>
              A fresh leadership chapter. Meet the next captain and leadership
              group when selections are official.
            </p>
            <span className="tag">LEADERSHIP · PENDING</span>
          </article>
          <article className="scroll-reveal">
            <span className="number">03</span>
            <h3>Keep the history.</h3>
            <div className="archive-year">
              26<span>→</span>?
            </div>
            <p>
              A home for the season’s record, honors, and championship story as
              the club moves forward.
            </p>
            <a href="#story">Revisit the season ↗</a>
          </article>
        </div>
        <p className="fine">
          Next season’s colors and leadership have not been announced. This
          season’s identity stays in the archive.
        </p>
      </section>
      <SeasonMotion />
    </div>
  );
}
