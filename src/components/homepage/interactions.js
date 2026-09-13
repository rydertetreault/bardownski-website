import { getMonochromePoster } from "@/lib/photo-posters";
import { getNickname, getNicknameText } from "@/lib/nicknames";
import { SEASON_REVEAL } from "@/lib/season-reveal";
import { homeArchive as a } from "./home-data";
import { num, photo, mvpRows, seasonContent, resultRow, escape } from "./views";
export function initHomeInteractions(runtime, motion, news) {
const {document, MutationObserver} = runtime;
const modal = document.querySelector("dialog");
let opener = null;

// Progressive view transitions are restricted to Variation 4. Native buttons,
// dialogs and content updates continue to work without API support or motion.
let activeTransition = null;
function transitionUpdate(update, target) {
  if (

    document.body.classList.contains("motion-enabled") &&
    document.startViewTransition
  ) {
    activeTransition?.skipTransition();
    activeTransition = document.startViewTransition(update);
    activeTransition.finished.catch(() => {});
  } else {
    update();
    if (target) replayEntrance(target);
  }
}
function replayEntrance(element) {
  if (

    !document.body.classList.contains("motion-enabled")
  )
    return;
  element.getAnimations().forEach((animation) => {
    if (animation.animationName === "home-variation-four-content")
      animation.cancel();
  });
  element.animate(
    [
      { opacity: 0.15, transform: "translateY(12px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 400, easing: "ease-out" },
  );
}
function show(content, button) {
  if (!modal.open) opener = button;
  modal.querySelector(".modal-body").innerHTML = content;
  if (!modal.open) modal.showModal();
  else modal.querySelector(".close-modal").focus();
  modal.scrollTop = 0;
  replayEntrance(modal.querySelector(".modal-body"));
}
const stamp = '<span class="data-stamp">2025–2026 ARCHIVE</span>';
function profile(id, b) {
  const p = a.players.find((p) => p.short === id);
  if (!p) return;
  show(
    `${stamp}<h2 id="dialog-title">${escape(getNickname(p.name))}</h2><p>${p.role === "G" ? "Goaltender" : p.role === "D" ? "Defense" : "Forward"} / ${p.games} games in scored role</p><div class="profile-numbers">${(p.role ===
    "G"
      ? [
          ["Saves", p.saves],
          ["Shutouts", p.shutouts],
          ["Games", p.games],
        ]
      : [
          ["Points", p.points],
          ["Goals", p.goals],
          ["Assists", p.assists],
        ]
    )
      .map(([label, n]) => `<div><b>${num(n)}</b><span>${label}</span></div>`)
      .join(
        "",
      )}</div><p>Performance model score: <b>${num(p.score)}</b></p><p class="fineprint">Archived 2025–2026 snapshot. Not current-season tracking. Goalie and skater workloads are separate.</p>`,
    b,
  );
}
function match(index, b) {
  const m = a.matches[index];
  if (!m) return;
  show(
    `${stamp}<h2 id="dialog-title">Bardownski ${m.scoreUs}–${m.scoreThem}<br>${m.opponent}</h2><p>${m.date} / FINAL</p><table><caption>Saved Bardownski skater scoresheet</caption><thead><tr><th>Player</th><th>G</th><th>A</th><th>PTS</th></tr></thead><tbody>${m.players.map((p) => `<tr><th scope="row">${escape(getNickname(p.name))}</th><td>${p.goals}</td><td>${p.assists}</td><td>${p.goals + p.assists}</td></tr>`).join("")}</tbody></table><p class="fineprint">Partial saved skater coverage, not a complete match box score.</p>`,
    b,
  );
}
const films = {
  reveal: {
    title: "Bardownski 2027 / The season reveal",
    src: SEASON_REVEAL.videoSrc,
    poster: SEASON_REVEAL.poster,
    captions: SEASON_REVEAL.captionsSrc,
  },
  finish: {
    title: "Matt Hut / Archived hockey highlight",
    src: "/videos/homepage/finish.mp4",
    poster: "/images/homepage/player-teal.webp",
  },
  crease: {
    title: "JRT IV / Archived hockey highlight",
    src: "/videos/homepage/crease.mp4",
    poster: "/images/homepage/goalie-purple.webp",
  },
};
function video(id, b) {
  const f = films[id];
  if (!f) return;
  show(
    `<span class="data-stamp">${id === "reveal" ? "2027 SEASON REVEAL" : "CLUB HIGHLIGHTS ARCHIVE"}</span><h2 id="dialog-title">${f.title}</h2><video controls playsinline preload="metadata" poster="${getMonochromePoster(f.poster)}" aria-label="${f.title}"><source src="${f.src}" type="video/mp4">${f.captions ? `<track kind="captions" src="${f.captions}" srclang="en" label="English" default>` : ""}</video><p class="fineprint">${id === "reveal" ? `The official jersey and leadership announcement. <a href="/news/${SEASON_REVEAL.articleId}">Read the full story and film transcript ↗</a>` : "Archived club gameplay. Use the player controls to start playback. Upload dates are not recorded."}</p>`,
    b,
  );
  const v = modal.querySelector("video");
  const failed = () => {
    if (!v.isConnected) return;
    const p = document.createElement("p");
    p.setAttribute("role", "status");
    p.innerHTML = id === "reveal" ? `The film could not be loaded. <a href="/news/${SEASON_REVEAL.articleId}">Open the announcement and transcript</a>.` : 'This clip could not be loaded. Please try again later or <a href="/highlights">browse all highlights</a>.';
    v.pause();
    v.replaceWith(p);
  };
  // Source failures do not bubble to the video element in Chromium.
  runtime.listen(v, "error", failed, { once: true });
  runtime.listen(v.querySelector("source"), "error", failed, { once: true });
}
const paragraphs = (text) =>
  text
    .split("\n\n")
    .map((p) => `<p>${escape(getNicknameText(p))}</p>`)
    .join("");
function awardDetail(h) {
  return `<article class="award-detail"><span class="data-stamp">${h.selection === "editorial" ? "TEAM / EDITORIAL HONOR" : "STATISTICAL HONOR"}</span><h3>${escape(h.title)}</h3><strong>${h.winners.map(escape).join(" & ")}</strong><p>${escape(h.result)}</p><p class="fineprint">${escape(h.criteria)}</p></article>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button, a[data-news], a[data-video]");
  if (!b) return;
  // Preserve native new-tab/download behavior on progressively enhanced links.
  if (b.tagName === "A" && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (b.target && b.target !== "_self") || b.hasAttribute("download"))) return;
  if (b.dataset.player) profile(b.dataset.player, b);
  if (b.hasAttribute("data-match")) match(Number(b.dataset.match), b);
  if (b.dataset.video) { if (b.tagName === "A") e.preventDefault(); video(b.dataset.video, b); }
  if (b.hasAttribute("data-weekly"))
    show(
      `${stamp}<h2 id="dialog-title">${a.weekly.title}</h2><p>Published ${a.weekly.date} · Official archived weekly selection</p>${paragraphs(a.weekly.summary)}`,
      b,
    );
  if (b.hasAttribute("data-standings"))
    show(
      `${stamp}<h2 id="dialog-title">MVP standings</h2><p>Final 2025–2026 archived model scores.</p><div class="full-standings">${mvpRows(a.players.length)}</div><p class="fineprint">Position-adjusted model. Minimum five games in the scored role. Each player appears once with their strongest eligible role score; exact score ties share a rank. Scores are not votes, betting odds or probabilities.</p>`,
      b,
    );
  if (b.dataset.award) {
    const h = a.honors.find((h) => h.id === b.dataset.award);
    if (h)
      show(
        `${stamp}<h2 id="dialog-title">Previous award winner</h2>${awardDetail(h)}`,
        b,
      );
  }
  if (b.hasAttribute("data-awards"))
    show(
      `${stamp}<h2 id="dialog-title">Previous award winners</h2><p>Honors from 2025–2026. These remain on the homepage until the next awards are presented.</p>${a.honors.map(awardDetail).join("")}`,
      b,
    );
  if (b.hasAttribute("data-games"))
    show(
      `${stamp}<h2 id="dialog-title">Recent saved matches</h2><p>Latest eight saved games. The archive is incomplete.</p><div class="modal-games result-rows">${a.matches.map((m, i) => resultRow(m, i)).join("")}</div>`,
      b,
    );
  if (b.dataset.news === SEASON_REVEAL.articleId && b.tagName === "A") return; // Full, accessible film/article route.
  if (b.dataset.news) {
    const article = news.find((article) => article.id === b.dataset.news);
    if (article) {
      e.preventDefault();
      show(
        `<span class="data-stamp">PUBLISHED CLUB NEWS</span><h2 id="dialog-title">${escape(getNicknameText(article.title))}</h2><p>${escape(article.date)} · ${escape(article.category)}</p>${paragraphs(article.summary)}`,
        b,
      );
    }
  }
  if (b.dataset.season) {
    transitionUpdate(() => {
      document.querySelector("[data-season-panel]").innerHTML = seasonContent(
        b.dataset.season,
      );
      document
        .querySelectorAll("[data-season]")
        .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
      document
          .querySelectorAll("[data-season-panel] [data-reveal]")
          .forEach((el) => el.classList.add("arrived"));
      motion.refresh();
    }, document.querySelector("[data-season-panel]"));
  }
});
if (modal) {
  runtime.listen(modal.querySelector(".close-modal"), "click", () => modal.close());
  runtime.listen(modal, "click", (e) => {
    if (e.target !== modal) return;
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      modal.close();
  });
  runtime.listen(modal, "close", () => {
    if (modal.open) return; // A queued close must not tear down a newer opening.
    modal.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.removeAttribute("src");
      v.querySelectorAll("source").forEach((s) => s.remove());
      v.load();
    });
    if (runtime.active) opener?.focus({ preventScroll: true });
  });
}
// The editorial photo album is its own interaction, not another leaderboard.
if (document.querySelector(".album-stage")) {
  const pictures = [
    ["bench-wide", "Bardownski bench", "ON THE BENCH"],
    ["team-teal", "Bardownski team huddle", "TOGETHER ON THE ICE"],
    ["championship", "Club finals celebration", "FIRST CLUB CHAMPIONSHIP"],
  ];
  let index = 0;
  const update = () => {
    const selected = index;
    const [file, alt, caption] = pictures[selected];
    transitionUpdate(() => {
      document.querySelector("[data-album-image]").innerHTML =
        photo(file, alt) +
        `<figcaption>0${selected + 1} / ${caption}</figcaption>`;
      document.querySelector("[data-album-label]").textContent =
        `${selected + 1} / 3`;
      motion.refresh();
    }, document.querySelector("[data-album-image]"));
  };
  runtime.listen(document.querySelector("[data-album-prev]"), "click", () => {
    index = (index + 2) % 3;
    update();
  });
  runtime.listen(document.querySelector("[data-album-next]"), "click", () => {
    index = (index + 1) % 3;
    update();
  });
  let startX = 0;
  const stage = document.querySelector(".album-stage");
  runtime.listen(
    stage,
    "touchstart",
    (e) => (startX = e.changedTouches[0].clientX),
    { passive: true },
  );
  runtime.listen(
    stage,
    "touchend",
    (e) => {
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 45) {
        index = (index + (delta < 0 ? 1 : 2)) % 3;
        update();
      }
    },
    { passive: true },
  );
}

  runtime.onDispose(() => { activeTransition?.skipTransition(); });
  new MutationObserver(() => {
    if (!document.body.classList.contains("motion-off")) return;
    activeTransition?.skipTransition();
    document.querySelectorAll(".modal-body,[data-season-panel],[data-album-image]").forEach(el => el.getAnimations().forEach(a => a.cancel()));
  }).observe(document.body,{attributes:true,attributeFilter:["class"]});
}
