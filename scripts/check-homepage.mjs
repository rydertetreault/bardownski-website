// Production integration checks. Start `npm run dev` before running.
// PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROME=/path/to/chrome
// AXE_PATH=/path/to/axe.min.js is optional; SITE_URL defaults to localhost:3000.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ["--no-sandbox"] });
const base = process.env.SITE_URL || "http://localhost:3000";
const errors = [];
const page = await browser.newPage({ reducedMotion: "reduce" });
page.on("pageerror", error => errors.push(error.message));
const mediaRequests = [];
page.on("request", request => { if (/\.(mp4|webm)(\?|$)/.test(request.url())) mediaRequests.push(request.url()); });
async function load() {
  // Readiness is the rendered/enhanced UI, not third-party analytics idleness.
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".bd-home.motion-off,.bd-home.motion-enabled"));
  await page.evaluate(() => document.fonts.ready);
}
async function closeDialog() {
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog")?.open && !document.querySelector("dialog video source"));
}
async function closeAndReturn(selector) {
  await closeDialog();
  assert.equal(await page.locator(selector).evaluate(el => document.activeElement === el), true, `Focus returns to ${selector}`);
}
async function axe() {
  if (!process.env.AXE_PATH) return;
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  assert.deepEqual(violations, [], "WCAG A/AA checks");
}
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await load();
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("main").count(), 1);
    assert.equal(await page.locator("footer").count(), 1);
    assert.equal(await page.locator(".lab-toolbar,.chooser,.hockey-splash").count(), 0);
    assert.equal(await page.locator("#results .result-row").count(), 4);
    assert.equal(await page.locator(".section-cut").count(), 3);
    assert.match(await page.locator(".season-status").innerText(), /tracking is (?:being prepared|connected|temporarily unavailable|showing its last saved data)/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow ${width}`);
    const ids = await page.locator("[id]").evaluateAll(els => els.map(el => el.id));
    assert.equal(new Set(ids).size, ids.length, "Unique IDs");
    const missingAnchors = await page.locator('.bd-home a[href^="#"],.legacy-subnav a[href^="/#"]').evaluateAll(els => els.filter(el => !document.getElementById(el.hash.slice(1))).map(el => el.href));
    assert.deepEqual(missingAnchors, [], "All section anchors resolve");
    for (const section of ["#weekly", "#standings", "#highlights", "#news", "#history", "#scrapbook"]) {
      await page.locator(section).scrollIntoViewIfNeeded();
      await page.locator(`${section} img`).evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    }
    assert.deepEqual(await page.locator(".bd-home img").evaluateAll(imgs => imgs.filter(img => !img.naturalWidth).map(img => img.src)), []);
    const footer = await page.locator(".site-footer").boundingBox();
    assert.ok(footer.width <= width);
    // Scrollable season tabs stay usable at every responsive breakpoint.
    for (const year of ["2020", "2021", "2022", "2023", "2024", "2025"]) {
      await page.locator(`[data-season="${year}"]`).click();
      await page.waitForFunction(year => document.querySelector(".season-year")?.textContent === `${year}–${Number(year) + 1}`, year);
      assert.equal(await page.locator('[data-season][aria-pressed="true"]').count(), 1);
      await page.locator(".history-image img").evaluate(img => img.decode());
    }
    await page.locator('[data-section-link="highlights"]').click();
    await page.waitForTimeout(100);
    const targetTop = await page.locator("#highlights").evaluate(el => el.getBoundingClientRect().top);
    const navBottom = await page.locator(".mono-section-nav").evaluate(el => el.getBoundingClientRect().bottom);
    assert.ok(targetTop >= navBottom - 2, `Anchor is not hidden behind sticky navigation ${width}`);
    if (width === 1440 || width === 390) await axe();
    console.log(`Responsive layout, assets, seasons, anchors: ${width}px passed`);
  }
  assert.deepEqual(mediaRequests, [], "No autoplay/preloaded film before selection");
  await page.setViewportSize({ width: 1440, height: 900 });
  await load();
  for (const selector of ['#results [data-match="0"]', '[data-award="mvp"]', '[data-awards]', '#news .news-item:not(.featured-news) [data-news]']) {
    const trigger = page.locator(selector).first();
    await trigger.click();
    assert.equal(await page.locator("dialog").evaluate(el => el.open), true);
    assert.ok((await page.locator("#dialog-title").innerText()).length > 0);
    await closeDialog();
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
  }
  await page.locator('[data-games]').click();
  assert.equal(await page.locator("dialog .result-row").count(), 8);
  await page.locator('dialog [data-match="0"]').click();
  assert.equal(await page.locator("dialog table").count(), 1);
  await closeAndReturn('[data-games]');
  assert.match(await page.locator('#weekly .eyebrow').innerText(), /2026–2027/);
  assert.equal(await page.locator('#weekly a[href="/stats#weekly-tracker"]').count(),1);
  assert.match(await page.locator('#standings .eyebrow').innerText(), /2026–2027/);
  assert.equal(await page.locator('#standings a[href="/stats#standings"]').count(),1);
  await page.locator(".rank-entry summary").nth(1).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".rank-entry[open]").count(), 1);
  for (const id of ["finish", "crease"]) {
    const selector = `#highlights [data-video="${id}"]`;
    await page.locator(selector).click();
    await page.waitForFunction(() => document.querySelector("dialog video")?.readyState >= 1);
    await page.locator("dialog video").evaluate(video => video.play());
    await page.waitForFunction(() => document.querySelector("dialog video")?.currentTime > 0);
    await closeAndReturn(selector);
  }
  await page.locator('[data-album-next]').click();
  assert.equal(await page.locator('[data-album-label]').innerText(), "2 / 3");
  await page.locator('[data-album-prev]').click();
  assert.equal(await page.locator('[data-album-label]').innerText(), "1 / 3");
  console.log("Dialogs, nested details, keyboard disclosures, video playback/cleanup and photos passed");
  // A late close event belongs to the outgoing dialog, not the new player.
  await page.evaluate(() => {
    document.querySelector('[data-video="finish"]').click();
    document.querySelector('dialog').close();
    document.querySelector('[data-video="crease"]').click();
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('dialog[open] video source').count(), 1);
  await closeDialog();
  await page.route('**/videos/homepage/*.mp4', route => route.abort());
  await page.locator('#highlights [data-video="finish"]').click();
  await page.waitForFunction(() => document.querySelector('dialog [role="status"]')?.textContent.includes('could not be loaded'));
  await closeDialog();
  await page.unroute('**/videos/homepage/*.mp4');
  // Suppress only the browser default after observing whether our handler did.
  const modified = await page.evaluate(() => {
    let result;
    const check = event => { result = { canceled: event.defaultPrevented, open: document.querySelector('dialog').open }; event.preventDefault(); };
    document.addEventListener('click', check, { once: true });
    document.querySelector('#news a[data-news]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    return result;
  });
  assert.deepEqual(modified, { canceled: false, open: false });
  console.log("Failed-media fallback, rapid dialog reopening and modified news links passed");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector(".bd-home.motion-enabled.title-motion-ready"));
  // Regression for incorrectly ported `.motion-enabled .demo-10` selectors.
  assert.equal(await page.locator(".title-word").first().evaluate(el => getComputedStyle(el).willChange), "transform, opacity");
  await page.locator(".motion-toggle").click();
  assert.equal(await page.locator(".bd-home").evaluate(el => el.classList.contains("motion-off")), true);
  await load();
  assert.equal(await page.locator(".motion-toggle").innerText(), "Resume animations");
  await page.locator(".motion-toggle").click();
  await page.locator('[data-season="2021"]').click();
  await page.waitForFunction(() => document.querySelector(".season-year")?.textContent === "2021–2022");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector(".motion-toggle")?.disabled);
  assert.equal(await page.locator(".title-word").evaluateAll(els => els.every(el => getComputedStyle(el).opacity === "1")), true);
  console.log("Motion pause/persistence, view transitions and live reduced-motion changes passed");

  // Next client navigations must dispose motion and must not leak the homepage
  // CSS or body classes into the football site, even while its CSS stays loaded.
  for (let i = 0; i < 2; i++) {
    await page.locator('.legacy-nav-fc').click();
    await page.waitForURL(`${base}/fc`);
    assert.equal(await page.locator(".bd-home").count(), 0);
    assert.equal(await page.locator(".fc-site").count(), 1);
    assert.equal(await page.locator(".legacy-site-header").evaluate(el => getComputedStyle(el).color), "rgb(241, 236, 226)");
    assert.equal(await page.locator("body").evaluate(el => el.classList.contains("motion-enabled") || el.classList.contains("motion-off")), false);
    await page.locator('.legacy-nav-fc').click();
    await page.waitForURL(`${base}/`);
    await page.locator('[data-album-next]').click();
    assert.equal(await page.locator('[data-album-label]').innerText(), "2 / 3", "Exactly one listener after remount");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".legacy-nav-toggle").click();
  assert.equal(await page.locator(".legacy-nav-toggle").getAttribute("aria-expanded"), "true");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".legacy-nav-toggle").getAttribute("aria-expanded"), "false");
  console.log("FC/hockey client navigation, remount cleanup and mobile menu passed");

  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticPage.goto(base, { waitUntil: "networkidle" });
  assert.equal(await staticPage.locator(".hockey-splash").count(), 0);
  assert.equal(await staticPage.locator("h1").isVisible(), true);
  assert.equal(await staticPage.locator("#news a.news-button").count(), 3);
  assert.equal(await staticPage.locator(".motion-toggle").isVisible(), false);
  assert.equal(await staticPage.locator("#history .season-year").innerText(), "2025–2026");
  await staticPage.close();
  assert.deepEqual(errors, [], "No browser runtime/hydration errors");
  console.log("Server-rendered/no-JS content passed. Production homepage checks complete.");
} finally { await browser.close(); }
