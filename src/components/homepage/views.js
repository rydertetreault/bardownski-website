// Approved Variation 4 markup; server-rendered and progressively enhanced.
// Archive values never masquerade as live current-season data.
export const escape = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
import { getNickname, getDisplayNameFromGamertag, getNicknameText } from "@/lib/nicknames";
import { HOCKEY_SEASON } from "@/lib/hockey-season-state";
import { SEASON_REVEAL } from "@/lib/season-reveal";
import { getPlayerPhoto, FALLBACK_PLAYER_PHOTOS } from "@/lib/player-photos";
import { matchDetailHref } from "@/app/matches/hub-utils";
import { homeArchive as a } from "./home-data";
// Published articles use both ISO dates and long English calendar dates.
export const articleDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
export const num = (n) => Number(n).toLocaleString("en-US");
export const photo = (file, alt, cls = "", eager = false, position = "center", src = `/images/homepage/${file}.webp`) =>
  `<img class="${cls}" src="${escape(src)}" alt="${escape(alt)}" style="object-position:${position}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
const name = (p) => (getNickname(p.name) === "JENE RENE TETREAU IV" ? "JRT IV" : getNickname(p.name));
const role = (p) =>
  p.role === "G" ? "GOALTENDER" : p.role === "D" ? "DEFENSE" : "FORWARD";
const won = (m) => m.scoreUs > m.scoreThem;
const tag = (t) => `<p class="eyebrow">${t}</p>`;
const head = (k, t, link = "") =>
  `<div class="section-head" data-reveal><div>${tag(k)}<h2>${t}</h2></div>${link}</div>`;
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
/** @param {import("@/lib/hockey-season-state").HockeySeasonState|null} season */
function currentResults(season) {
  const matches = [...(season?.matches ?? [])]
    .filter(m => m.status === "final" && m.matchType !== "private" && Number.isFinite(m.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 4);
  const rows = matches.map(m => {
    const scored = m.scoreUs !== null && m.scoreThem !== null;
    const result = scored ? m.scoreUs > m.scoreThem ? "W" : m.scoreUs < m.scoreThem ? "L" : "T" : "—";
    const content = `<span class="result-letter ${result === "W" ? "win" : "loss"}">${result}</span><span class="result-team"><b>${escape(m.opponent)}</b><small>${escape(m.date)}${m.forfeit ? " · Forfeit" : ""}</small></span><strong>${m.scoreUs ?? "—"}<i>–</i>${m.scoreThem ?? "—"}</strong><span class="result-arrow" aria-hidden="true">↗</span>`;
    return `<a class="result-row" href="${matchDetailHref(m, "2026-2027") ?? "/matches#results"}">${content}</a>`;
  }).join("");
  return `<section class="results-card module score-strip cut-results" id="results" data-module="matches" data-reveal>${head(`RECENT MATCHES / ${HOCKEY_SEASON}`, "Recent matches", '<a class="text-link" href="/matches">All matches ↗</a>')}<div class="result-rows">${rows || `<p class="fine">${season?.status === "unavailable" ? "Recent results are temporarily unavailable." : "No results yet this season."}</p>`}</div>${season?.status === "stale" ? '<small class="fine">Latest available results.</small>' : ""}</section>`;
}
function highlightList() {
  const previews = [
    {
      id: "finish",
      image: "finish-preview",
      title: "Matt Hut’s highlight",
      label: "MATT HUT / CLUB HIGHLIGHT",
      length: "0:10",
      note: "Archived club gameplay.",
      alt: "Still from Matt Hut’s archived highlight: a skater moving up the ice",
    },
    {
      id: "crease",
      image: "crease-preview",
      title: "JRT IV’s highlight",
      label: "JRT IV / GOALTENDING",
      length: "0:12",
      note: "Archived goaltending highlight.",
      alt: "Still from JRT IV’s archived highlight: a goaltender in the crease",
    },
  ];
  return `<section class="highlights section cut-highlights highlight-list-section" id="highlights" data-module="highlights">${head("CLUB VIDEO", "Highlights", '<a class="text-link" href="/highlights">All highlights ↗</a>')}<p class="highlight-list-intro">Watch recent moments from the club archive.</p><div class="highlight-list">${previews.map((clip, i) => `<button class="clip highlight-item" data-video="${clip.id}" aria-label="Watch ${clip.title}, ${clip.length}"><span class="highlight-item-number" aria-hidden="true">0${i + 1}</span><span class="clip-thumb">${photo(clip.image, clip.alt)}<span class="highlight-duration">${clip.length}</span></span><span class="highlight-item-copy"><small>${clip.label}</small><strong>${clip.title}</strong><span>${clip.note}</span></span><span class="highlight-watch"><span>Watch clip</span><b aria-hidden="true">▶</b></span><span class="highlight-item-rule" aria-hidden="true"></span></button>`).join("")}</div><small class="fine">2025–2026 archive · Select a clip to open the player.</small></section>`;
}
/** @param {string} variant @param {string} title @param {import("@/lib/news").Article[]} items */
function news(variant = "", title = "Recent news", items = a.news) {
  const imgs = ["goalie-purple", "player-purple", "championship"];
  const artwork = (item, index) => item.id === SEASON_REVEAL.articleId
    ? `<img src="${SEASON_REVEAL.poster}" alt="${escape(SEASON_REVEAL.posterAlt)}" loading="lazy" decoding="async">`
    : photo(imgs[index], "Club archive imagery accompanying " + item.category);
  return `<section class="news-section section ${variant}" id="news" data-module="news">${head("RECENT CLUB NEWS", title, '<a class="text-link" href="/news">All news ↗</a>')}<div class="news-grid" data-reveal-group>${items.slice(0, 3).map((n, i) => `<article class="news-item${n.featured ? " featured-news" : ""}" data-reveal><a href="/news/${encodeURIComponent(n.id)}" data-news="${escape(n.id)}" class="news-button"><span class="news-image">${artwork(n, i)}<span>${n.featured ? "FEATURED FILM" : `0${i + 1}`}</span></span><span class="news-meta">${escape(n.category)} / <time${articleDate(n.date) ? ` datetime="${articleDate(n.date)}"` : ""}>${escape(n.date)}</time></span><h3>${escape(getNicknameText(n.title))}</h3><p>${escape(getNicknameText(n.summary.split(/\.\s/)[0] + "."))}</p><span class="text-link">Read the story ↗</span></a></article>`).join("")}</div></section>`;
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
  return `<section class="scrapbook section" id="scrapbook" data-module="scrapbook"><div class="scrapbook-copy" data-reveal><p class="eyebrow"><span class="club-mark" aria-hidden="true"></span>TEAM PHOTOS</p><h2>Club photos</h2><p>Browse photos of the team, from games together to our first championship.</p><small class="fine">Archival club images · use the arrows or swipe.</small></div><div class="photo-album" data-reveal><div class="album-stage"><figure data-album-image>${photo("bench-wide", "Bardownski bench")}<figcaption>01 / ON THE BENCH</figcaption></figure></div><div class="album-controls"><button data-album-prev aria-label="Previous scrapbook photo">←</button><span data-album-label aria-live="polite">1 / 3</span><button data-album-next aria-label="Next scrapbook photo">→</button></div></div></section>`;
}
function cinemaHero(extraClass = "") {
  return `<section class="cinema-hero${extraClass ? ` ${extraClass}` : ""}" data-load><div class="cinema-backdrop">${photo("history-2022", "Overhead view of a Bardownski goaltender in the blue crease with a white-jersey teammate nearby", "", true, "50% 60%")}</div><div class="cinema-topline"><span><i aria-hidden="true">▶</i> BARDOWNSKI HOCKEY CLUB</span><span>TEAM UPDATES / SEASON 2026–2027</span></div><div class="hero-copy">${tag("WELCOME TO BARDOWNSKI HOCKEY")}<h1>HOME ICE.<br><em>THE NEXT SHIFT.</em></h1><p>Watch team highlights and catch up on results,<br>player performances and club news.</p><div class="actions"><a class="button" href="#results">VIEW RECENT MATCHES ↘</a><a href="#highlights" class="text-link">Browse highlights ↓</a></div></div><div class="cinema-bottom"><span>2026–2027 SEASON</span><span>NEWFOUNDLAND / EST. 2020</span><span>BARDOWNSKI HOCKEY</span></div></section>`;
}

/** Announced Player of the Week only: the winner(s) of the last completed Monday-to-Monday
 * week, published by the sync job. In-progress leaders and projections are never shown.
 * @param {import("@/lib/hockey-awards").HockeyAwards|null} awards @param {boolean} stale */
function currentWeekly(awards, stale) {
  const week = awards?.lastCompletedWeek;
  const winners = week?.status === "complete" ? week.winners ?? [] : [];
  const playerName = p => escape(getNickname(getDisplayNameFromGamertag(p.name)));
  const player = winners[0];
  const title = player ? winners.map(playerName).join(" / ") : "Awaiting the first announcement.";
  const stats = player ? (player.isGoalie
    ? [["GAMES",num(player.games)],["SV%",`${(Number.isFinite(player.savePct)?player.savePct:0).toFixed(1)}%`],["SHUTOUTS",num(player.shutouts)]]
    : [["GAMES",num(player.games)],["GOALS",num(player.goals)],["ASSISTS",num(player.assists)],["POINTS",num(player.points)]]) : [];
  const fmt = iso => new Date(iso).toLocaleDateString("en-US", {month:"long",day:"numeric",timeZone:"UTC"});
  // The stored end is the following Monday (exclusive); label the Sunday it covered.
  const weekLabel = player ? `Week of ${escape(fmt(week.start))} – ${escape(fmt(new Date(Date.parse(week.end) - 1).toISOString()))}` : null;
  const image = player ? getPlayerPhoto(player.name, player.isGoalie) : FALLBACK_PLAYER_PHOTOS.skater;
  return `<section class="weekly-story section film-weekly cut-weekly" id="weekly" data-module="weekly" data-scroll><div class="weekly-image" data-reveal>${photo("", image.alt, "", false, "center", image.src)}<span class="image-caption">BARDOWNSKI HOCKEY</span><span class="weekly-seal" aria-hidden="true">PLAYER<br>OF THE<br>WEEK ★</span></div><article class="weekly-copy" data-reveal>${tag(`PLAYER OF THE WEEK / ${HOCKEY_SEASON}`)}<h2>${title}</h2><p>${player ? `${weekLabel}. ${winners.length > 1 ? "Shared honors for a tied week." : "Announced after the week closed Monday at 00:00 UTC."}` : "The first Player of the Week is announced once a full week of games is complete. No projections in the meantime."}${stale ? " Showing the latest saved announcement." : ""}</p><div class="mini-stats">${stats.map(([label,v])=>`<div><strong>${escape(v)}</strong><small>${label}</small></div>`).join("")}</div><a class="text-link" href="/stats#weekly-honors">All Player of the Week wins ↗</a><small class="fine">Minimum three games in a role to qualify. Winners are announced each Monday at 00:00 UTC.</small></article></section>`;
}
/** Season role totals shown instead of the internal model score. */
export function mvpStatLine(p) {
  const n = (v) => num(Number.isFinite(v) && v >= 0 ? v : 0);
  return p.isGoalie
    ? [["GP", n(p.games)], ["SV%", `${(Number.isFinite(p.savePct) && p.savePct >= 0 ? p.savePct : 0).toFixed(1)}%`], ["GAA", (Number.isFinite(p.gaa) && p.gaa >= 0 ? p.gaa : 0).toFixed(2)], ["SO", n(p.shutouts)]]
    : [["GP", n(p.games)], ["G", n(p.goals)], ["A", n(p.assists)], ["PTS", n(p.points)]];
}
/** @param {import("@/lib/hockey-awards").HockeyAwards|null} awards @param {boolean} stale */
function currentRankings(awards, stale) {
  const players = awards?.seasonMvp ?? [];
  const role = (p) => (p.isGoalie ? "G" : escape(p.position));
  return `<div class="section cut-desk open-rank-section"><section class="mvp-card open-rankings" id="standings" data-module="mvp"><div class="rank-intro" data-reveal><div>${tag("MVP TRACKER / 2026–2027")}<h2>MVP tracker</h2><p>Current-season position-adjusted performance rankings. Five games in a scored role unlock eligibility.${stale ? " Showing the last saved current-season totals." : ""}</p></div><div class="rank-leader-note"><span>CURRENT LEADER</span><strong>${players[0] ? escape(getNickname(getDisplayNameFromGamertag(players[0].name))) : "Awaiting eligible players"}</strong><small>Not a final season award</small></div></div><div class="rank-column-labels" aria-hidden="true"><span>RANK</span><span>PLAYER / ROLE</span><span>SEASON TOTALS</span></div><div class="standings-preview rank-disclosures">${players.slice(0,3).map((p,i)=>`<details class="rank-entry" name="mvp-preview" ${i===0?"open":""}><summary class="standing-row"><span class="rank-number">${String(p.rank).padStart(2,"0")}</span><b>${escape(getNickname(getDisplayNameFromGamertag(p.name)))}<small>${role(p)} · ${p.games} GP</small></b><span class="rank-toggle-icon" aria-hidden="true">+</span><i class="rank-meter" style="--score:${players[0].score>0?Math.max(0,p.score)/players[0].score:0}" aria-hidden="true"></i></summary><div class="rank-details"><dl class="rank-stat-line">${mvpStatLine(p).map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl><p>${p.isGoalie?"Goalie":"Skater"} totals over ${p.games} games in the scored role. Each player appears once at their strongest eligible role.</p><a href="/stats#numbers" class="text-link">Current player statistics ↗</a></div></details>`).join("")}${players.length?"":'<p class="fine">No eligible rankings yet this season.</p>'}</div><div class="rank-footer"><a class="text-link" href="/stats#standings">Full MVP standings & scoring ↗</a><small class="fine">Current-season rankings. Not votes or odds.</small></div></section></div>`;
}

function pageThread() {
  return `<svg class="page-thread" aria-hidden="true" focusable="false"><g class="thread-segments"></g></svg>`;
}
function logoReveal() {
  return `<div class="signature-logo" aria-hidden="true">${[0, 1, 2].map((i) => `<span class="signature-slice signature-slice-${i}"><img data-brand-mark src="/images/homepage/b-logo.png" alt="" width="180" height="180" loading="lazy"></span>`).join("")}</div>`;
}
function sectionCut(kind) {
  const reverse = kind === "from-rankings";
  return `<div class="section-cut ${kind}" aria-hidden="true"><svg viewBox="0 0 1000 64" preserveAspectRatio="none" focusable="false"><polygon class="section-cut-fill" points="${reverse ? "0,0 1000,64 0,64" : "0,64 1000,0 1000,64"}"/><path class="section-cut-trace" pathLength="1" d="${reverse ? "M0 0L1000 64" : "M0 64L1000 0"}"/></svg></div>`;
}

/** @param {import("@/lib/news").Article[]} items @param {import("@/lib/hockey-season-state").HockeySeasonState|null} [season] */
export function renderHome(items = a.news, season = null) {
  // Current sections never fall back to frozen results or last season's awards.
  const current = season?.season === HOCKEY_SEASON ? season : null;
  const awards = current?.awards ?? null;
  const stale = current?.status === "stale";
  return `${cinemaHero("v4-film-hero")}${pageThread()}
  <nav class="mono-section-nav" aria-label="Homepage sections"><span class="mono-nav-label">ON THIS PAGE</span><div>${[["results","Matches"],["weekly","Weekly player"],["standings","MVP tracker"],["highlights","Highlights"],["news","News"],["history","Past seasons"]].map(([id,label])=>`<a href="#${id}" data-section-link="${id}">${label}</a>`).join("")}</div><button class="motion-toggle" aria-pressed="false" hidden>Pause animations</button><span class="mono-nav-progress" aria-hidden="true"></span></nav>
  ${currentResults(current)}
  <div class="interlude cut-interlude" data-scroll>${logoReveal()}<span class="cut-label">2026–2027 / PLAYER OF THE WEEK</span><p>Every shift counts.</p><em>Announced every Monday.</em><span class="interlude-line" aria-hidden="true"></span></div>
  ${currentWeekly(awards, stale)}
  ${sectionCut("to-rankings")}${currentRankings(awards, stale)}${sectionCut("from-rankings")}
  ${highlightList()}${sectionCut("to-news")}${news("cut-news","Recent news",items)}
  ${history("cut-history")}${archivedAwards()}${sectionCut("to-scrapbook")}${scrapbook()}
  <div class="site-footer home-signoff club-mark-panel" aria-label="Bardownski club sign-off"><a class="footer-wordmark" href="/">BARDOWNSKI<span>®</span></a><div class="footer-bottom"><p>Bardownski Hockey Club · Newfoundland · Established 2020.</p><nav aria-label="Club sign-off navigation"><a href="/roster">The club ↗</a><a href="/news">News ↗</a><a href="/highlights">Highlights ↗</a></nav><small>2026–2027 SEASON</small></div></div>
  ${dialogs()}`;
}
