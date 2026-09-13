// Integration checks. Start `npm run dev` before running.
// PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROME=/path/to/chrome
// AXE_PATH=/path/to/axe.min.js is optional; SITE_URL defaults to localhost:3000.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ["--no-sandbox"] });
const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30_000); page.setDefaultNavigationTimeout(90_000);
const errors = [], refreshes = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (/\[Fast Refresh\] rebuilding|performing a full reload/i.test(message.text())) refreshes.push(message.text()); });
// Count openings: two listeners can open the same dialog without duplicate DOM.
await page.addInitScript(() => {
  window.__recordsCheck = { token: crypto.randomUUID(), opens: 0 };
  const original = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function (...args) { if (this.closest(".records-redesign")) window.__recordsCheck.opens++; return original.apply(this, args); };
});
const $ = selector => page.locator(`.records-redesign ${selector}`);
async function ready() {
  await page.waitForFunction(() => document.querySelector(".records-redesign #result-count")?.textContent.match(/^\d+ of \d+ records/) && document.querySelector(".pause-showcase"));
  await page.evaluate(() => document.fonts.ready);
}
async function load(width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  assert.equal((await page.goto(`${base}/records`, { waitUntil: "domcontentloaded" })).status(), 200);
  await ready();
}
async function layout(width) {
  for (const selector of [".records-redesign", "main", "h1", "footer", ".hockey-motion-toggle", "#detail", ".team-monuments", ".season-hall"]) assert.equal(await page.locator(selector).count(), 1, `One ${selector}`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth), true, `No horizontal overflow ${width}px`);
  const ids = await page.locator("[id]").evaluateAll(els => els.map(el => el.id));
  assert.equal(new Set(ids).size, ids.length, "Unique IDs");
  const paint = await $(".records-band,.records-cut").evaluateAll(els => {
    const normalize = value => { const ctx = document.createElement("canvas").getContext("2d"); ctx.fillStyle = value.trim(); return ctx.fillStyle; };
    const background = el => { for (; el; el = el.parentElement) { const bg = getComputedStyle(el).backgroundColor; if (bg !== "rgba(0, 0, 0, 0)") return normalize(bg); } };
    return els.map(el => { const s = getComputedStyle(el), after = getComputedStyle(el, "::after"), r = el.getBoundingClientRect(); return { name: el.className, color: background(el), from: s.getPropertyValue("--cut-from") && normalize(s.getPropertyValue("--cut-from")), to: s.getPropertyValue("--cut-to") && normalize(s.getPropertyValue("--cut-to")), after: normalize(after.backgroundColor), clip: after.clipPath, hidden: el.getAttribute("aria-hidden"), pointer: s.pointerEvents, focusable: el.matches("[tabindex],button,a") || !!el.querySelector("[tabindex],button,a"), previous: background(el.previousElementSibling || el.parentElement), next: background(el.nextElementSibling || el.parentElement), left: r.left, right: r.right, height: r.height }; });
  });
  const bands = paint.filter(p => p.name.includes("records-band")), cuts = paint.filter(p => p.name.includes("records-cut"));
  assert.deepEqual(bands.map(b => b.color), ["#006775", "#f0efeb", "#320d48", "#f0efeb", "#006775"], "Teal/paper/purple chapters");
  assert.equal(cuts.length, 6, "Six decorative cuts, no duplicate wrappers");
  // Stable scrollbar gutters can reserve space even when headless clientWidth
  // still equals innerWidth. Compare chapter paint with its actual host bounds.
  const hostBounds = await page.locator(".records-redesign").boundingBox();
  for (const p of paint) assert.ok(Math.abs(p.left - hostBounds.x) <= 1 && Math.abs(p.right - hostBounds.x - hostBounds.width) <= 1 && p.height > 0, `Full-width ${p.name}`);
  for (const c of cuts) {
    assert.equal(c.hidden, "true"); assert.equal(c.pointer, "none"); assert.equal(c.focusable, false);
    assert.equal(c.color, c.from, `${c.name} --cut-from`); assert.equal(c.after, c.to, `${c.name} --cut-to`);
    assert.equal(c.previous, c.from, `${c.name} previous background`); assert.equal(c.next, c.to, `${c.name} next background`); assert.match(c.clip, /^polygon\(/);
  }
}
async function images() {
  await $(".champ-photo img[loading='lazy']").scrollIntoViewIfNeeded();
  for (const img of await page.locator("img").all()) { if (await img.isVisible()) await img.scrollIntoViewIfNeeded(); await img.evaluate(el => el.decode()); }
  assert.deepEqual(await page.locator("img").evaluateAll(els => els.filter(el => !el.naturalWidth).map(el => el.src)), []);
  const backgrounds = await $(".monument").evaluateAll(els => [...new Set(els.flatMap(el => [...getComputedStyle(el).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map(m => m[1])))]);
  for (const src of backgrounds) await page.evaluate(async src => { const img = new Image(); img.src = src; await img.decode(); }, src);
}
async function seasons() {
  for (const [year, points] of [["2024", "649"], ["2023", "1,807"], ["2025", "1,410"]]) {
    await $(`[data-season-panel="${year}"]`).click();
    await page.waitForFunction(year => document.querySelector(".season-banner > strong")?.textContent === year, year);
    assert.equal(await $("[data-season-panel][aria-pressed='true']").count(), 1);
    assert.equal(await $(`[data-season-panel="${year}"]`).getAttribute("aria-pressed"), "true");
    assert.equal(await $(".season-leaders article").count(), 7); assert.equal(await $(".season-leaders article strong").first().innerText(), points);
  }
}
async function dialog(selector, title, ranking = false) {
  const trigger = $(selector).first(), before = await page.evaluate(() => window.__recordsCheck.opens);
  await trigger.click(); await page.waitForFunction(() => document.querySelector("#detail")?.open);
  assert.match(await $("#detail-content h2").textContent(), title); assert.ok((await $(".rule p").innerText()).length > 20);
  assert.equal(await $("#detail").evaluate(el => el.contains(document.activeElement)), true);
  assert.equal(await page.evaluate(() => window.__recordsCheck.opens), before + 1, "One modal opening per click");
  if (ranking) assert.ok(await $(".rankings li").count() > 1);
  await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.querySelector("#detail")?.open);
  assert.equal(await trigger.evaluate(el => document.activeElement === el), true, `Escape restores focus: ${selector}`);
}
async function rows() {
  const rows = await $("#results .record").evaluateAll(els => els.map(el => ({ id: el.dataset.record, title: el.querySelector("h3").textContent, category: el.querySelector(".record-meta").firstChild.textContent.trim(), scope: el.querySelector(".record-meta i").textContent, pending: el.classList.contains("pending") })));
  assert.match(await $("#result-count").innerText(), new RegExp(`^${rows.length} of \\d+ records`)); return rows;
}
async function filters() {
  const baseline = await rows(); assert.ok(baseline.length >= 30);
  for (const category of ["Scoring", "Defense", "Goaltending", "Physical", "Efficiency", "Durability", "Team", "All"]) {
    await $(`[data-category="${category}"]`).click(); assert.equal(await $("[data-category][aria-pressed='true']").getAttribute("data-category"), category);
    assert.deepEqual(await rows(), baseline.filter(r => category === "All" || r.category === category));
  }
  for (const [query, id] of [["plus minus", "pm"], ["defense", "dpm"], ["save", "saves"], ["per game", "ppg"]]) {
    await $("#availability").selectOption("pending"); await $(`[data-query="${query}"]`).click();
    assert.equal(await $("#search").inputValue(), query); assert.equal(await $("#availability").inputValue(), "all");
    const found = await rows(); assert.ok(found.some(r => r.id === id) && found.length < baseline.length);
  }
  await $("#reset").click(); await $("#search").fill("Most blocked shots"); assert.deepEqual((await rows()).map(r => r.id), ["blocks"]);
  await $("#search").fill("u4 Pablo"); assert.ok((await rows()).some(r => r.id === "points"));
  await $("#search").fill("no-record-matches-this-regression-query"); assert.equal((await rows()).length, 0); await $("#empty-reset").click(); assert.deepEqual(await rows(), baseline);
  await $("#scope").selectOption("Single game"); assert.deepEqual(await rows(), baseline.filter(r => r.scope === "Single game")); await $("#reset").click();
  for (const availability of ["pending", "verified"]) { await $("#availability").selectOption(availability); assert.deepEqual(await rows(), baseline.filter(r => r.pending === (availability === "pending"))); }
  await $("#availability").selectOption("pending"); assert.equal(await $("#results .holder").evaluateAll(els => els.every(el => el.textContent === "Verification needed")), true);
  await dialog('#results [data-record="game-pm"]', /Best plus\/minus in one game/); await $("#reset").click();
  // Season-filtered leaderboards remain independent of the highlight tabs.
  for (const [year, points] of [["2024", "649"], ["2023", "1,807"], ["2025", "1,410"]]) {
    await $("#season").selectOption(year); assert.equal(await $('#results [data-record="points"] > strong').innerText(), points);
    assert.ok((await rows()).every(r => !r.pending && r.category !== "Team"));
    await dialog('#results [data-record="points"]', /^Most points$/, true);
  }
  await $("#reset").click();
  for (const sort of ["az", "category"]) { await $("#sort").selectOption(sort); assert.deepEqual(await rows(), [...baseline].sort((a, b) => sort === "az" ? a.title.localeCompare(b.title) : a.category.localeCompare(b.category) || a.title.localeCompare(b.title))); }
  await $("#reset").click(); assert.deepEqual(await rows(), baseline);
  for (const [id, value] of Object.entries({ search: "", scope: "all", season: "all", availability: "all", sort: "featured" })) assert.equal(await $(`#${id}`).inputValue(), value);
  for (const [id, title] of [["team-streak", /Longest team win streak/], ["team-goals", /Most team goals in one game/], ["team-margin", /Largest recorded winning margin/], ["team-title", /Club championships/]]) await dialog(`[data-record="${id}"]`, title);
  for (const id of ["points", "pm", "saves", "dpm"]) await dialog(`[data-record="${id}"]`, /Most|Best/, true);
}
async function keywordSearch() {
  const ids = () => $("#results .record").evaluateAll(els => els.map(el => el.dataset.record));
  await $("#reset").click();
  const baseline = await ids();
  for (const query of ["Robby", "Rob", "S1obbyRobby", "Slobby Robby"]) {
    await $("#search").fill(query);
    assert.deepEqual((await ids()).slice(0, 2), ["dpm", "db"], `${query}: owned records first`);
    assert.equal(await $("#sort option:checked").textContent(), "Best matches");
  }
  await $("#search").fill("Robby blocks");
  assert.deepEqual(await ids(), ["db", "blocks"]);
  assert.match(await $('#results [data-record="db"] .record-search-match').textContent(), /Matching record holder.*#1/);
  assert.match(await $('#results [data-record="blocks"] .record-search-match').textContent(), /Related leaderboard entry.*SLOBBY ROBBY.*#3/);
  await $('#results [data-record="blocks"]').click();
  assert.equal(await $(".ranking-search-match").count(), 1);
  assert.match(await $(".ranking-search-match").textContent(), /SLOBBY ROBBY.*2025.*123/);
  await page.keyboard.press("Escape");
  await $("#search").fill("Ryder saves");
  assert.ok((await ids()).includes("saves"));
  for (const [word, abbreviation] of [["goalie", "G"], ["defenseman", "D"], ["center", "C"], ["left wing", "LW"]]) {
    await $("#search").fill(word); const expected = await ids();
    assert.ok(expected.length > 0 && expected.length < baseline.length, word);
    await $("#search").fill(abbreviation); assert.deepEqual(await ids(), expected);
  }
  await $("#search").fill("Robby goalie"); assert.deepEqual(await ids(), []);
  await $("#search").fill("Top G");
  assert.ok((await ids()).includes("points"));
  assert.equal(await $("#results .record-search-match").evaluateAll(els => els.every(el => el.textContent.includes("TOP G"))), true);
  await $("#search").fill("Matt goals"); assert.equal((await ids())[0], "goals");
  const url = page.url(); await $("#search").press("Enter"); assert.equal(page.url(), url, "Enter does not reload");
  await $("#search").fill("<img src=x onerror=alert(1)>");
  assert.equal(await $("#results img").count(), 0, "Query is escaped in empty state");
  await $("#search-clear").click(); assert.deepEqual(await ids(), baseline);
  assert.equal(await $("#search").evaluate(el => document.activeElement === el), true);
  await $("#season").selectOption("2024");
  await $('[data-search-term="Slobby Robby"]').click();
  assert.equal(await $("#season").inputValue(), "2024", "Keyword examples preserve selected filters");
  assert.equal(await $("#results .record-search-match").evaluateAll(els => els.every(el => el.textContent.includes("2024"))), true);
  // A global spotlight can have no eligible entries in the explorer's season.
  await dialog('.spotlights [data-record="pm"]', /Best plus\/minus/);
  await $("#search-clear").click(); assert.equal(await $("#season").inputValue(), "2024");
  await $("#reset").click(); assert.deepEqual(await ids(), baseline);
}
async function visible() {
  assert.equal(await page.locator(".records-redesign").evaluate(el => el.classList.contains("record-motion")), false);
  assert.deepEqual(await $(".monument,.honor-strip button,.championship,.season-hall,h1").evaluateAll(els => els.filter(el => getComputedStyle(el).opacity !== "1" || getComputedStyle(el).visibility !== "visible" || !el.getBoundingClientRect().width).map(el => el.className)), [], "Paused/reduced content visible");
  assert.equal(await $("[data-count]").evaluateAll(els => els.every(el => el.textContent === el.dataset.count)), true, "Final counters visible");
}
async function axe(width) {
  if (!process.env.AXE_PATH) return;
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const result = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }); return { violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), contrast: r.passes.some(v => v.id === "color-contrast"), incomplete: r.incomplete.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) }; });
  if (result.incomplete.length) console.log(`axe manual review ${width}px: ${JSON.stringify(result.incomplete)}`);
  assert.deepEqual(result.violations, [], `WCAG A/AA ${width}px`); assert.equal(result.contrast, true, "Contrast rule ran");
}
try {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await load(width); await layout(width); await images(); await seasons(); await visible(); await layout(width);
    if (width === 390 || width === 1440) await axe(width);
    console.log(`PASS ${width}px: layout, colors/cuts, images, seasons, reduced motion${process.env.AXE_PATH && [390, 1440].includes(width) ? ', axe WCAG/contrast' : ''}`);
  }
  for (const width of [1440, 390]) { await load(width); await filters(); await keywordSearch(); await layout(width); console.log(`PASS ${width}px: filters, keyword aliases/positions/relevance, search/reset, pending, sort, team/player dialogs, Escape/focus`); }
  await load(); await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector(".records-redesign.record-motion"));
  await $(".replay-showcase").click(); await page.locator(".hockey-motion-toggle").click();
  await page.waitForFunction(() => document.querySelector(".hockey-interior.hockey-motion-off") && !document.querySelector(".record-motion")); await visible();
  await load(); await page.waitForFunction(() => document.querySelector(".hockey-motion-toggle")?.textContent === "Resume motion"); await visible();
  for (const enabled of [true, false, true]) { await $(".pause-showcase").click(); await page.waitForFunction(enabled => !!document.querySelector(".records-redesign.record-motion") === enabled, enabled); assert.equal(await page.locator(".hockey-motion-toggle").getAttribute("aria-pressed"), String(!enabled)); if (!enabled) await visible(); }
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForFunction(() => document.querySelector(".pause-showcase")?.disabled && document.querySelector(".hockey-motion-toggle")?.disabled); await visible();
  console.log("PASS shared pause, persistence, interrupted replay and live reduced motion");
  const token = await page.evaluate(() => window.__recordsCheck.token);
  for (let i = 0; i < 2; i++) {
    await page.locator('.legacy-nav-brand').click(); await page.waitForURL(`${base}/`);
    await page.waitForFunction(() => document.querySelector(".bd-home.motion-off"));
    assert.equal(await page.locator(".records-redesign,.records-cut,.records-band,.hockey-motion-toggle").count(), 0);
    await page.locator('[data-album-next]').click(); assert.equal(await page.locator('[data-album-label]').innerText(), "2 / 3", "One homepage listener");
    await page.locator('#legacy-site-links a[href="/records"]').click(); await page.waitForURL(`${base}/records`); await ready(); await layout(1440);
    await dialog('.monument[data-record="team-streak"]', /Longest team win streak/);
    await page.locator('.legacy-nav-fc').click(); await page.waitForURL(`${base}/fc`); await page.locator(".fc-site").waitFor();
    assert.equal(await page.locator(".records-redesign,.records-cut,.records-band,.bd-home,.hockey-interior,.hockey-motion-toggle").count(), 0);
    assert.equal(await page.locator(".legacy-site-header").evaluate(el => getComputedStyle(el).color), "rgb(241, 236, 226)", "No records CSS leakage into FC");
    assert.equal(await page.locator("body").evaluate(el => /(?:^|\s)(?:record-motion|motion-enabled|motion-off|hockey-motion-off)(?:\s|$)/.test(el.className)), false);
    // FC has no hockey Records link: Back exercises actual Next client popstate.
    await page.goBack({ waitUntil: "domcontentloaded" }); await page.waitForURL(`${base}/records`); await ready(); await layout(1440);
    assert.equal(await page.evaluate(() => window.__recordsCheck.token), token, "Client navigation, no hard reload");
    await seasons(); await dialog('.spotlights [data-record="points"]', /^Most points$/, true);
    await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForFunction(() => document.querySelector(".record-motion"));
    await $(".pause-showcase").click(); await page.waitForFunction(() => !document.querySelector(".record-motion")); await visible();
    await $(".pause-showcase").click(); await page.waitForFunction(() => document.querySelector(".record-motion"));
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForFunction(() => document.querySelector(".pause-showcase")?.disabled); await visible();
  }
  console.log("PASS records → home → records and records → FC → records twice: wrappers, listeners, motion cleanup");
  assert.deepEqual(errors, [], "No browser runtime/hydration errors"); assert.deepEqual(refreshes, [], "Dev refresh observed: rerun on stable CSS before trusting results");
  if (!process.env.AXE_PATH) console.log("SKIP WCAG/contrast: AXE_PATH not supplied");
  console.log("Records checks complete.");
} catch (error) {
  console.error(error); if (errors.length) console.error("Browser errors:", errors); if (refreshes.length) console.error("Dev refreshes (rerun needed):", refreshes); process.exitCode = 1;
} finally { await browser.close(); }
