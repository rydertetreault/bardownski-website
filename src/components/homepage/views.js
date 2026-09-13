// Approved Variation 4 markup; server-rendered and progressively enhanced.
// Archive values never masquerade as live current-season data.
export const escape = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
import { getNickname } from "@/lib/nicknames";
import { SEASON_REVEAL } from "@/lib/season-reveal";
import { homeArchive as a } from "./home-data";
// Published articles use both ISO dates and long English calendar dates.
export const articleDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
export const num = (n) => Number(n).toLocaleString("en-US");
export const photo = (file, alt, cls = "", eager = false, position = "center") =>
  `<img class="${cls}" src="/images/homepage/${file}.webp" alt="${escape(alt)}" style="object-position:${position}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
const name = (p) => (p.name === "JENE RENE TETREAU IV" ? "JRT IV" : p.name);
const role = (p) =>
  p.role === "G" ? "GOALTENDER" : p.role === "D" ? "DEFENSE" : "FORWARD";
const won = (m) => m.scoreUs > m.scoreThem;
const tag = (t) => `<p class="eyebrow">${t}</p>`;
const head = (k, t, link = "") =>
  `<div class="section-head" data-reveal><div>${tag(k)}<h2>${t}</h2></div>${link}</div>`;
const archiveNote = `<small class="fine">2025–2026 archive · Archived weekly selection.</small>`;
const weeklyStats = () =>
  `<div class="mini-stats"><div><strong>55</strong><small>SAVES</small></div><div><strong>.809</strong><small>SV%</small></div><div><strong>5–0</strong><small>RECORD</small></div></div>`;
export const playerButton = (id, text, cls = "text-link") =>
  `<button class="${cls}" data-player="${id}">${text} <span aria-hidden="true">↗</span></button>`;

export function dialogs() {
  return `<dialog class="detail-modal" aria-labelledby="dialog-title"><button class="close-modal" aria-label="Close details">×</button><div class="modal-body"></div></dialog>`;
}

export function mvpRows(limit = 3) {
  return a.players
    .slice(0, limit)
    .map((p) => {
      const rank = a.players.findIndex((o) => o.score === p.score) + 1;
      return `<button class="standing-row" data-player="${p.short}"><span>${String(rank).padStart(2, "0")}</span><b>${name(p)}<small>${role(p)} · ${p.games} GP</small></b><strong>${num(p.score)}</strong><i class="rank-meter" style="--score:${p.score / a.players[0].score}" aria-hidden="true"></i></button>`;
    })
    .join("");
}
export function resultRow(m, i, cls = "") {
  return `<button class="result-row ${cls}" data-match="${i}"><span class="result-letter ${won(m) ? "win" : "loss"}">${won(m) ? "W" : "L"}</span><span class="result-team"><b>${m.opponent}</b><small>${m.date}</small></span><strong>${m.scoreUs}<i>–</i>${m.scoreThem}</strong><span class="result-arrow" aria-hidden="true">↗</span></button>`;
}
function results(variant = "", title = "Recent matches") {
  return `<section class="results-card module ${variant}" id="results" data-module="matches" data-reveal>${head("RECENT MATCHES / 2025–2026 ARCHIVE", title, '<button class="text-link" data-games>Match archive ↗</button>')}<div class="result-rows">${a.matches
    .slice(0, 4)
    .map((m, i) => resultRow(m, i))
    .join(
      "",
    )}</div><small class="fine">Latest four saved matches · 2025–2026 archive.</small></section>`;
}
function weekly(variant = "", title = "JRT IV") {
  return `<section class="weekly-story ${variant}" id="weekly" data-module="weekly" data-scroll><div class="weekly-image" data-reveal>${photo("goalie-purple", "Archival goaltending imagery, not a verified portrait of JRT IV")}<span class="image-caption">GOALTENDING / CLUB ARCHIVE</span><span class="weekly-seal" aria-hidden="true">PLAYER<br>OF THE<br>WEEK ★</span></div><article class="weekly-copy" data-reveal>${tag("PLAYER OF THE WEEK / APR 22, 2026")}<h2>${title}</h2><p>JRT IV earned Player of the Week with five wins from five starts. He made 55 saves on 68 shots, recorded a 2.60 GAA and finished the week with a shutout.</p>${weeklyStats()}<button class="text-link" data-weekly>Read the weekly feature ↗</button>${archiveNote}</article></section>`;
}
function highlightList() {
  const previews = [
    {
      id: "finish",
      image: "finish-preview",
      title: "Matt’s highlight",
      label: "MATT / CLUB HIGHLIGHT",
      length: "0:10",
      note: "Archived club gameplay.",
      alt: "Still from Matt’s archived highlight: a skater moving up the ice",
    },
    {
      id: "crease",
      image: "crease-preview",
      title: "Ryder’s highlight",
      label: "RYDER / GOALTENDING",
      length: "0:12",
      note: "Archived goaltending highlight.",
      alt: "Still from Ryder’s archived highlight: a goaltender in the crease",
    },
  ];
  return `<section class="highlights section cut-highlights highlight-list-section" id="highlights" data-module="highlights">${head("CLUB VIDEO", "Highlights", '<a class="text-link" href="/highlights">All highlights ↗</a>')}<p class="highlight-list-intro">Watch recent moments from the club archive.</p><div class="highlight-list">${previews.map((clip, i) => `<button class="clip highlight-item" data-video="${clip.id}" aria-label="Watch ${clip.title}, ${clip.length}"><span class="highlight-item-number" aria-hidden="true">0${i + 1}</span><span class="clip-thumb">${photo(clip.image, clip.alt)}<span class="highlight-duration">${clip.length}</span></span><span class="highlight-item-copy"><small>${clip.label}</small><strong>${clip.title}</strong><span>${clip.note}</span></span><span class="highlight-watch"><span>Watch clip</span><b aria-hidden="true">▶</b></span><span class="highlight-item-rule" aria-hidden="true"></span></button>`).join("")}</div><small class="fine">2025–2026 archive · Select a clip to open the player.</small></section>`;
}
/** @param {string} variant @param {string} title @param {import("@/lib/news").Article[]} items */
function news(variant = "", title = "Recent news", items = a.news) {
  const imgs = ["goalie-purple", "player-purple", "championship"];
  const artwork = (item, index) => item.id === SEASON_REVEAL.articleId
    ? `<img src="${SEASON_REVEAL.poster}" alt="The 2027 Bardownski home, away and alternate jerseys" loading="lazy" decoding="async">`
    : photo(imgs[index], "Club archive imagery accompanying " + item.category);
  return `<section class="news-section section ${variant}" id="news" data-module="news">${head("RECENT CLUB NEWS", title, '<a class="text-link" href="/news">All news ↗</a>')}<div class="news-grid" data-reveal-group>${items.slice(0, 3).map((n, i) => `<article class="news-item${n.featured ? " featured-news" : ""}" data-reveal><a href="/news/${encodeURIComponent(n.id)}" data-news="${escape(n.id)}" class="news-button"><span class="news-image">${artwork(n, i)}<span>${n.featured ? "FEATURED FILM" : `0${i + 1}`}</span></span><span class="news-meta">${escape(n.category)} / <time${articleDate(n.date) ? ` datetime="${articleDate(n.date)}"` : ""}>${escape(n.date)}</time></span><h3>${escape(n.title)}</h3><p>${escape(n.summary.split(/\.\s/)[0] + ".")}</p><span class="text-link">Read the story ↗</span></a></article>`).join("")}</div></section>`;
}
export function seasonContent(year) {
  const s = a.seasons.find((x) => x.year === year);
  const title =
    {
      2025: "First club championship",
      2024: "JRT IV named captain",
      2023: "Roster additions and new uniforms",
      2020: "Club established",
    }[s.year] || "Roster development";
  return `<figure class="history-image" data-reveal>${photo(s.image, s.imageAlt, "", false, s.imagePosition)}<figcaption>${s.imageCaption}</figcaption></figure><article data-reveal><span class="season-year">${s.label}</span><div class="captain-line"><b aria-hidden="true">C</b><span>CAPTAIN<strong>${s.captain}</strong></span><span>ROSTER<strong>${s.rosterSize} players</strong></span></div><h3>${title}</h3><p>${s.accomplishment}</p>${s.year === "2025" ? '<button class="text-link" data-news="10">Read the championship story ↗</button>' : ""}</article>`;
}
function history(variant = "", title = "Past seasons") {
  return `<section class="season-register section ${variant}" id="history" data-module="history">${head("PAST SEASONS / THE CAPTAINS & THEIR STORIES", title)}<div class="history-workspace"><div class="season-selector" role="group" aria-label="Choose a previous season">${a.seasons.map((s, i) => `<button data-season="${s.year}" aria-pressed="${i === 0}" aria-controls="season-panel"><b>${s.label}</b><small>C / ${s.captain}</small><span aria-hidden="true">↗</span></button>`).join("")}</div><div class="season-detail" id="season-panel" data-season-panel aria-live="polite">${seasonContent("2025")}</div></div><small class="fine">Captain assignments follow the club register. Labels use the season’s start and end year; player photos are from the club archive and may be from a later season.</small></section>`;
}
function archivedAwards() {
  return `<section class="awards-shelf section" id="awards" data-module="awards">${head("PREVIOUS AWARD WINNERS / 2025–2026", "Previous award winners", `<button class="text-link" data-awards>All ${a.honors.length} honors ↗</button>`)}<p class="awards-note">Last season’s honorees stay here until this season’s awards are presented.</p><div class="award-grid" data-reveal-group>${[
    "mvp",
    "defense",
    "goalie",
    "unsung",
  ]
    .map((id) => a.honors.find((h) => h.id === id))
    .map(
      (h, i) =>
        `<button class="award-tile" data-award="${h.id}" data-reveal><span class="award-symbol" aria-hidden="true">${["★", "✳", "✦", "✹"][i]}</span><span class="eyebrow">${h.title}</span><h3>${h.winners.map((n) => (n === "JENE RENE TETREAU IV" ? "JRT IV" : n)).join(" & ")}</h3><small>${h.id === "unsung" ? "Team-selected honor" : h.result}</small><span class="text-link">View award ↗</span></button>`,
    )
    .join("")}</div></section>`;
}
function scrapbook() {
  return `<section class="scrapbook section" id="scrapbook" data-module="scrapbook"><div class="scrapbook-copy" data-reveal>${tag("TEAM PHOTOS")}<h2>Club photos</h2><p>Browse photos of the team, from games together to our first championship.</p><small class="fine">Archival club images · use the arrows or swipe.</small></div><div class="photo-album" data-reveal><div class="album-stage"><figure data-album-image>${photo("bench-wide", "Bardownski bench")}<figcaption>01 / ON THE BENCH</figcaption></figure></div><div class="album-controls"><button data-album-prev aria-label="Previous scrapbook photo">←</button><span data-album-label aria-live="polite">1 / 3</span><button data-album-next aria-label="Next scrapbook photo">→</button></div></div></section>`;
}
function cinemaHero(extraClass = "") {
  return `<section class="cinema-hero${extraClass ? ` ${extraClass}` : ""}" data-load><div class="cinema-backdrop"><img src="${SEASON_REVEAL.poster}" alt="Bardownski’s 2027 home, away and alternate jerseys" fetchpriority="high" decoding="async"></div><div class="cinema-topline"><span><i aria-hidden="true">▶</i> BARDOWNSKI HOCKEY CLUB</span><span>THE 2027 REVEAL / NOW SHOWING</span></div><div class="hero-copy">${tag("NEW JERSEYS. NEW LEADERSHIP.")}<h1>BARDOWNSKI<br><em>2027.</em></h1><p>The new home, away and alternate jerseys.<br>A new leadership chapter. The same club.</p><div class="actions"><a class="button" href="/news/${SEASON_REVEAL.articleId}#reveal-film" data-video="reveal">▶ &nbsp; WATCH THE REVEAL</a><a href="/news/${SEASON_REVEAL.articleId}" class="text-link">Read the announcement ↗</a></div></div><div class="cinema-credits"><span>FEATURED FILM / ${SEASON_REVEAL.durationLabel}</span><strong>BARDOWNSKI 2027</strong><span>THE JERSEYS. THE LETTERS. THE NEXT CHAPTER.</span></div><div class="cinema-bottom"><span>2026–2027 SEASON REVEAL</span><span>SELECT TO WATCH WITH SOUND</span><span>BARDOWNSKI HOCKEY</span></div></section>`;
}

function openRankings() {
  return `<div class="section cut-desk open-rank-section"><section class="mvp-card open-rankings" id="standings" data-module="mvp"><div class="rank-intro" data-reveal><div>${tag("MVP TRACKER / 2025–2026 ARCHIVE")}<h2>MVP tracker</h2><p>Explore the top three players. Select a name to expand their season statistics.</p></div><div class="rank-leader-note"><span>ARCHIVED MODEL LEADER</span><strong>${name(a.players[0])}</strong><small>${num(a.players[0].points)} points in ${a.players[0].games} games</small></div></div><div class="rank-column-labels" aria-hidden="true"><span>RANK</span><span>PLAYER / ROLE</span><span>MODEL SCORE</span></div><div class="standings-preview rank-disclosures">${a.players
    .slice(0, 3)
    .map((p, i) => {
      const rank = a.players.findIndex((other) => other.score === p.score) + 1;
      const stats =
        p.role === "G"
          ? [
              ["Saves", num(p.saves)],
              ["Shutouts", num(p.shutouts)],
              ["Games", num(p.games)],
            ]
          : [
              ["Points", num(p.points)],
              ["Goals", num(p.goals)],
              ["Assists", num(p.assists)],
            ];
      return `<details class="rank-entry" name="mvp-preview" ${i === 0 ? "open" : ""}><summary class="standing-row"><span class="rank-number">${String(rank).padStart(2, "0")}</span><b>${name(p)}<small>${role(p)} · ${p.games} GP</small></b><strong>${num(p.score)}</strong><span class="rank-toggle-icon" aria-hidden="true">+</span><i class="rank-meter" style="--score:${p.score / a.players[0].score}" aria-hidden="true"></i></summary><div class="rank-details"><dl>${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl><p>${p.role === "G" ? "Goaltender totals for the scored role." : "Archived skater totals for the season."}</p>${playerButton(p.short, "Full player profile")}</div></details>`;
    })
    .join(
      "",
    )}</div><div class="rank-footer"><button class="text-link" data-standings>Full standings & scoring ↗</button><small class="fine">Final 2025–2026 position-adjusted model scores. Not votes or odds.</small></div></section></div>`;
}
/** @param {import("@/lib/hockey-awards").HockeyAwards|null} awards @param {boolean} stale */
function currentWeekly(awards, stale) {
  const week = awards?.currentWeek;
  const leaders = week?.leaders ?? [];
  const title = leaders.length ? leaders.map(p => escape(getNickname(p.name))).join(" / ") : "The week is open.";
  const player = leaders[0];
  const qualifier = player?.eligible ? "CURRENT WEEK LEADER" : player ? "PROVISIONAL LEADER" : "PLAYER OF THE WEEK TRACKER";
  const stats = player ? [["ROLE GAMES",player.games],[player.isGoalie?"SAVES":"POINTS",player.isGoalie?player.saves:player.points],["MODEL SCORE",player.score]] : [];
  return `<section class="weekly-story section film-weekly cut-weekly" id="weekly" data-module="weekly" data-scroll><div class="weekly-image" data-reveal>${photo(player?.isGoalie ? "goalie-purple" : "player-purple", "Club archive imagery, not a verified portrait of the current weekly leader")}<span class="image-caption">CLUB IMAGERY / CURRENT TRACKER</span><span class="weekly-seal" aria-hidden="true">PLAYER<br>OF THE<br>WEEK ★</span></div><article class="weekly-copy" data-reveal>${tag(`${qualifier} / 2026–2027`)}<h2>${title}</h2><p>${week ? `Week of ${escape(week.start.slice(0,10))} UTC. Rankings use ${week.games} usable saved games. The week is in progress; this is not a final award.` : "A verified current-season snapshot is not available. No past-season selection is substituted."}${stale ? " The latest refresh is unavailable; these rankings use the last saved data." : ""}</p><div class="mini-stats">${stats.map(([label,value])=>`<div><strong>${num(value)}</strong><small>${label}</small></div>`).join("")}</div><a class="text-link" href="/stats#weekly-tracker">Weekly standings & criteria ↗</a><small class="fine">Three recorded games in a scored role are required for selection. Weeks close Monday at 00:00 UTC. Coverage may be incomplete.</small></article></section>`;
}
/** @param {import("@/lib/hockey-awards").HockeyAwards|null} awards @param {boolean} stale */
function currentRankings(awards, stale) {
  const players = awards?.seasonMvp ?? [];
  return `<div class="section cut-desk open-rank-section"><section class="mvp-card open-rankings" id="standings" data-module="mvp"><div class="rank-intro" data-reveal><div>${tag("MVP TRACKER / 2026–2027")}<h2>MVP tracker</h2><p>Current-season position-adjusted performance scores. Five games in a scored role unlock eligibility.${stale ? " Showing the last saved current-season totals." : ""}</p></div><div class="rank-leader-note"><span>CURRENT MODEL LEADER</span><strong>${players[0] ? escape(getNickname(players[0].name)) : "Awaiting eligible players"}</strong><small>Not a final season award</small></div></div><div class="rank-column-labels" aria-hidden="true"><span>RANK</span><span>PLAYER / ROLE</span><span>MODEL SCORE</span></div><div class="standings-preview rank-disclosures">${players.slice(0,3).map((p,i)=>`<details class="rank-entry" name="mvp-preview" ${i===0?"open":""}><summary class="standing-row"><span class="rank-number">${String(p.rank).padStart(2,"0")}</span><b>${escape(getNickname(p.name))}<small>${escape(p.position)} · ${p.games} GP</small></b><strong>${Number(p.score).toFixed(2)}</strong><span class="rank-toggle-icon" aria-hidden="true">+</span><i class="rank-meter" style="--score:${players[0].score>0?Math.max(0,p.score)/players[0].score:0}" aria-hidden="true"></i></summary><div class="rank-details"><p>${p.isGoalie?"Goaltender":"Skater"} performance over ${p.games} games in the scored role. Each player appears once at their strongest eligible role.</p><a href="/stats#numbers" class="text-link">Current player statistics ↗</a></div></details>`).join("")}${players.length?"":'<p class="fine">No eligible current-season rankings available. Archived winners remain below.</p>'}</div><div class="rank-footer"><a class="text-link" href="/stats#standings">Full MVP standings & scoring ↗</a><small class="fine">Current-season model scores. Not votes or odds.</small></div></section></div>`;
}

function pageThread() {
  return `<svg class="page-thread" aria-hidden="true" focusable="false"><g class="thread-segments"></g></svg>`;
}
function logoReveal() {
  return `<div class="signature-logo" aria-hidden="true">${[0, 1, 2].map((i) => `<span class="signature-slice signature-slice-${i}"><img src="/images/homepage/b-logo.png" alt="" width="180" height="180" loading="lazy"></span>`).join("")}</div>`;
}
function sectionCut(kind) {
  const reverse = kind === "from-rankings";
  return `<div class="section-cut ${kind}" aria-hidden="true"><svg viewBox="0 0 1000 64" preserveAspectRatio="none" focusable="false"><polygon class="section-cut-fill" points="${reverse ? "0,0 1000,64 0,64" : "0,64 1000,0 1000,64"}"/><path class="section-cut-trace" pathLength="1" d="${reverse ? "M0 0L1000 64" : "M0 64L1000 0"}"/></svg></div>`;
}

/** @param {import("@/lib/news").Article[]} items @param {string} [trackingNotice] @param {import("@/lib/hockey-awards").HockeyAwards|null} [awards] @param {boolean} [stale] */
export function renderHome(items = a.news, trackingNotice = "Current-season tracking is being prepared. Explore the latest saved results and performances from 2025–2026 below.", awards, stale = false) {
  return `${cinemaHero("v4-film-hero")}${pageThread()}
  <div class="season-status"><span>2026–2027</span><p>${escape(trackingNotice)}</p><a href="/stats">Season tracking ↗</a></div>
  <nav class="mono-section-nav" aria-label="Homepage sections"><span class="mono-nav-label">ON THIS PAGE</span><div>${[["results","Matches"],["weekly","Weekly player"],["standings","MVP tracker"],["highlights","Highlights"],["news","News"],["history","Past seasons"]].map(([id,label])=>`<a href="#${id}" data-section-link="${id}">${label}</a>`).join("")}</div><button class="motion-toggle" aria-pressed="false" hidden>Pause animations</button><span class="mono-nav-progress" aria-hidden="true"></span></nav>
  ${results("score-strip cut-results")}
  <div class="interlude cut-interlude" data-scroll>${logoReveal()}${awards !== undefined ? '<span class="cut-label">2026–2027 / THE PERFORMANCE TRACKERS</span><p>Every shift counts.</p><em>The race is on.</em>' : '<span class="cut-label">PLAYER OF THE WEEK / APRIL 22, 2026</span><p>Five starts. Five wins.</p><em>55 saves for JRT IV.</em>'}<span class="interlude-line" aria-hidden="true"></span></div>
  ${awards !== undefined ? currentWeekly(awards, stale) : weekly("section film-weekly cut-weekly")}
  ${sectionCut("to-rankings")}${awards !== undefined ? currentRankings(awards, stale) : openRankings()}${sectionCut("from-rankings")}
  ${highlightList()}${sectionCut("to-news")}${news("cut-news","Recent news",items)}
  ${history("cut-history")}${archivedAwards()}${scrapbook()}
  <footer class="site-footer"><a class="footer-wordmark" href="/">BARDOWNSKI<span>®</span></a><div class="footer-bottom"><p>Bardownski Hockey Club · Newfoundland · Established 2020.</p><nav aria-label="Footer navigation"><a href="/roster">The club ↗</a><a href="/news">News ↗</a><a href="/highlights">Highlights ↗</a></nav><small>2026–2027 SEASON</small></div></footer>
  ${dialogs()}`;
}
