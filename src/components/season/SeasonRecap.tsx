/* eslint-disable @next/next/no-img-element */
// Static season content is server rendered; motion is a progressive enhancement.
import Link from "next/link";
import { RECAP_HONORS, SEASON_MVP, UNSUNG_HERO } from "@/lib/season-awards";
import SeasonMotion from "./SeasonMotion";
import "./season-recap.css";

export default function SeasonRecap() {
  return (
    <div
      id="season-recap"
      className="legacy-home concept-1 motion-demo motion-curtain"
    >
      <section className="hero" id="film-0">
        <div className="hero-copy">
          <p className="eyebrow">THE 2026–2027 EDITION</p>
          <h1>
            SAME CLUB.
            <br />
            <em>NEXT CHAPTER.</em>
          </h1>
          <p className="hero-description">
            New colors. The same Bardownski spirit. Building on our first
            championship as we move into 2026–2027.
          </p>
          <div className="actions">
            <a className="button" href="#next">
              The next chapter ↗
            </a>
            <a href="#mvp-stage">2025–2026 standouts ↓</a>
          </div>
          <span className="season-label">
            2026–2027 <span> / </span> THE NEXT CHAPTER
          </span>
          <div className="motion-guide">
            <a href="#mvp-stage">2025–2026 MVP reveal ↓</a>
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
            <small>2025–2026 / SEASON 4 CHAMPIONS</small>
          </div>
        </figure>
      </section>
      <div className="stats" id="film-1">
        <div className="scroll-reveal">
          <strong>
            207<span>–144–15</span>
          </strong>
          <small>2025–2026 RECORD · W–L–OTL</small>
        </div>
        <div className="scroll-reveal">
          <strong>366</strong>
          <small>2025–2026 GAMES PLAYED</small>
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
          <p className="eyebrow">01 / THE STANDARD WE CARRY</p>
          <h2>A championship to build on.</h2>
          <p>
            Bardownski enters 2026–2027 with a new look and a standard to chase.
            Our 2025–2026 campaign brought a <b>207–144–15</b> record across
            366 games and something we had been chasing for seven years:
            our first club championship.
          </p>
          <p>
            A 5–3 win over B A N G N A T I O N sealed the Season 4 Elite
            Division Club Finals title. A 16–2–1 championship run became a piece
            of club history.
          </p>
          <details>
            <summary>
              The championship story <span>↗</span>
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
                The 2025–2026 MVP and statistical team awards below preserve the
                performances that set our standard. Community honors remain
                team selections. Every shift, every late night, and every
                teammate helped build the club we take into the new season.
              </p>
              <p>
                Now we move forward in teal, purple, white and black. The captain
                and jersey announcement is coming soon, while 2026–2027 match
                and stats tracking are being prepared. Last season’s achievements
                stay in their own chapter.
              </p>
              <p>
                To everyone who takes the ice with Bardownski: the next chapter
                is ours to write.
              </p>
              <Link href="/news/season-finale-nhl26">
                Read the 2025–2026 championship recap ↗
              </Link>
            </div>
          </details>
        </article>
      </section>
      <section
        id="mvp-stage"
        className="mvp-stage"
        aria-label="2025–2026 Season MVP reveal"
      >
        <div className="stage-pin">
          <div className="stage-grid" aria-hidden="true"></div>
          <div className="stage-halo" aria-hidden="true"></div>
          <div className="stage-top">
            <span>THE LEGACY / 2025–2026</span>
            <span>2025–2026 HONORS</span>
          </div>
          <div className="stage-content">
            <p className="eyebrow">2025–2026 · AWARD WINNERS</p>
            <div className="stage-star" aria-hidden="true">
              ★
            </div>
            <p className="stage-title">SEASON MVP</p>
            <h2>
              <em>{SEASON_MVP.winners.join(" & ")}</em>
            </h2>
            <p className="stage-description">
              The highest-rated performance of 2025–2026.
              <br />
              The name we’ll remember.
            </p>
            <div className="stage-record">
              <span>
                {SEASON_MVP.result.split(" ")[0]} <small>PERFORMANCE SCORE</small>
              </span>
              <span>
                2025–2026 <small>ARCHIVED SEASON</small>
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
              2025–2026 stats · Position-adjusted MVP model
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
            <h2>2025–2026 award winners.</h2>
          </div>
          <p>2025–2026 stats and team-selected honors.<br />Transparent criteria. Shared honors for ties.</p>
        </div>
        <div className="awards">
          <article className="mvp supporting-mvp">
            <span className="tag">CALCULATED · SEASON MVP</span>
            <div className="award-mark" aria-hidden="true">★</div>
            <h3>{SEASON_MVP.winners.join(" & ")}</h3>
            <p>{SEASON_MVP.result}</p>
            <p className="mvp-description">
              The engine of Bardownski’s offense. Xavier Laflamme delivered 920 goals and
              490 assists for 1,410 points across 290 games, finishing at +483.
              With 43 game-winning goals and 2,189 hits, his impact went beyond
              the scoresheet—a season of production and physical presence that
              earned the highest score in our position-adjusted MVP model.
            </p>
            <div className="award-bottom">2025–2026 <b>FULL-SEASON PERFORMANCE</b></div>
          </article>
          <div className="award-stack">
            <article>
              <span className="tag">TEAM SELECTION · {UNSUNG_HERO.title}</span>
              <h3>{UNSUNG_HERO.winner}</h3>
              <p>{UNSUNG_HERO.detail}</p>

            </article>
            {RECAP_HONORS.map(award => (
              <article key={award.id}>
                <span className="tag">{award.selection === "editorial" ? "EDITORIAL · " : ""}{award.title}</span>
                <h3>{award.winners.join(" & ") || "To be announced"}</h3>
                <p>{award.result}</p>
                {award.description && <small>{award.description}</small>}
                {award.id === "individual-performance" && (
                  <small>Based on the 2025–2026 archived games</small>
                )}

              </article>
            ))}
          </div>
        </div>
        <details className="award-methodology">
          <summary>How the awards are calculated</summary>
          <p>Season MVP and the calculated awards are statistical honors, not vote results. Season MVP and positional honors use the same weighted performance model as the site’s MVP rankings, applied to the frozen 2025–2026 snapshot. Ranking scores are not vote counts or win probabilities. Defensemen receive position-specific weighting; goalies have a separate rate-and-workload model. Skater volume is dampened above 100 games. All exact ties share an award.</p>
          {RECAP_HONORS.map(award => (
            <p key={award.id}><b>{award.title}:</b> {award.criteria}</p>
          ))}
          <p>Slobby Robby is the team-approved Unsung Hero, recognizing the supporting work outside the scoring spotlight. This is a judgment-based selection rather than a model result.</p>
        </details>
        <div className="standouts">
          <p className="eyebrow">
            2025–2026 / STATISTICAL STANDOUTS, NOT VOTED AWARDS
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
            THE NEXT SHIFT.
            <br />
            <em>THE NEXT CHAPTER.</em>
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
            2026–2027 starts here.
          </p>
        </div>
        <div className="next-grid">
          <article className="scroll-reveal">
            <span className="number">01</span>
            <h3>A new set of colors.</h3>
            <div className="swatches" role="img" aria-label="Teal, purple, white and black">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </div>
            <p>
              Teal, purple, white and black. A fresh look for 2026–2027,
              with the same club behind every sweater.
            </p>
            <span className="tag">2026–2027 · NEW COLORS</span>
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
              The 2026–2027 captain and leadership group will be introduced
              in the upcoming captain and jersey announcement.
            </p>
            <span className="tag">ANNOUNCEMENT · COMING SOON</span>
          </article>
          <article className="scroll-reveal">
            <span className="number">03</span>
            <h3>Keep the history.</h3>
            <div className="archive-year">
              26<span>→</span>27
            </div>
            <p>
              The 2025–2026 record, honors and championship story stay with
              us. New-season tracking is being prepared for what comes next.
            </p>
            <Link href="/stats">2026–2027 stats & tracking ↗</Link>
          </article>
        </div>
        <p className="fine">
          The captain and jersey announcement is coming soon. The honors and
          totals above belong to 2025–2026; 2026–2027 tracking is being prepared.
        </p>
      </section>
      <SeasonMotion />
    </div>
  );
}
