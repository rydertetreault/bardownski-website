// Run against `npm run dev`. PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME=/path/to/chrome AXE_PATH=/path/to/axe.min.js node scripts/check-film-journal.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
const base = process.env.SITE_URL || "http://localhost:3000";
const page = await browser.newPage({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const mediaRequests = [];
page.on("request", request => { if (/\.(mp4|webm)(\?|$)|youtube.*\/embed\//.test(request.url())) mediaRequests.push(request.url()); });
async function load(route) {
  assert.equal((await page.goto(base + route, { waitUntil: "domcontentloaded" })).status(), 200);
  await page.locator(".hockey-motion-toggle").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function axe(selector) {
  if (!process.env.AXE_PATH) return;
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const violations = await page.evaluate(async selector => (await window.axe.run(document.querySelector(selector), {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
  })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), selector);
  assert.deepEqual(violations, [], `Accessibility: ${selector}`);
}
try {
  for (const width of [2560, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await load("/highlights");
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".film-player").count(), 5);
    assert.equal(await page.locator(".film-clip").count(), 17);
    assert.equal(await page.locator("video,iframe").count(), 0, "No eager video players");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Highlights fits ${width}`);
    const alignment = await page.locator(".film-hero").evaluate(hero => {
      const r = hero.getBoundingClientRect();
      return [...hero.querySelectorAll(".film-hero-copy,h1,.film-hero-intro,.film-text-link,.film-library-note")].map(el => ({
        left: el.getBoundingClientRect().left, expected: r.width * .06, align: getComputedStyle(el).textAlign,
      }));
    });
    assert.ok(alignment.every(item => Math.abs(item.left - item.expected) < 1 && item.align === "left"), "Hero stays left aligned");
    const cuts = await page.locator(".film-player").evaluateAll(nodes => nodes.map(el => ({
      bg: getComputedStyle(el).backgroundColor, clip: getComputedStyle(el, "::before").clipPath,
      width: el.getBoundingClientRect().width, pageWidth: document.body.getBoundingClientRect().width,
    })));
    assert.ok(cuts.every(cut => cut.clip.startsWith("polygon") && cut.width === cut.pageWidth));
    assert.ok(new Set(cuts.map(cut => cut.bg)).size >= 4);
    for (const id of ["ryder", "dylan", "kaden", "slobby-robby", "matt"]) {
      await page.locator(`.film-player-nav a[href="#highlights-${id}"]`).click();
      const section = page.locator(`#highlights-${id}`);
      assert.ok(await section.locator("h2").evaluate(el => el.getBoundingClientRect().top) >= 126);
      await section.locator("img").evaluateAll(images => Promise.all(images.map(img => img.decode())));
      const choices = section.locator(".film-clip");
      const count = await choices.count();
      for (let index = 0; index < count; index++) {
        const clip = choices.nth(index);
        const src = await clip.getAttribute("href");
        await clip.click();
        assert.equal(await clip.getAttribute("aria-current"), "true");
        assert.equal(await section.locator('.film-clip[aria-current="true"]').count(), 1);
        assert.equal(await section.locator(".film-screen").getAttribute("href"), src);
        await section.locator(".film-screen img").evaluate(img => img.decode());
      }
    }
    if ([1440, 390].includes(width)) {
      await axe(".highlights-edition");
      if (process.env.SCREENSHOT_DIR) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/highlights-${width}.png`, fullPage: true });
      }
    }
    console.log(`Highlights ${width}px: left hero, five sections, all 17 clip selections, assets, cuts and anchors passed`);
  }
  assert.deepEqual(mediaRequests, [], "Browsing never downloads video or loads YouTube");
  await page.setViewportSize({ width: 1440, height: 950 });
  const localScreen = page.locator("#highlights-dylan .film-screen");
  await localScreen.focus();
  await page.keyboard.press("Enter");
  await page.locator("dialog[open] video").waitFor();
  await page.waitForFunction(() => document.querySelector("dialog video")?.readyState >= 2);
  assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
  assert.equal(await page.getByRole("button", { name: "Close video", exact: true }).evaluate(el => document.activeElement === el), true);
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.locator("dialog").evaluate(el => el.contains(document.activeElement)), true, "Focus stays inside modal");
  await axe("dialog");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").count(), 0);
  assert.equal(await localScreen.evaluate(el => document.activeElement === el), true, "Focus restored on Escape");
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
  await localScreen.click();
  await page.getByRole("button", { name: "Close video", exact: true }).click();
  assert.equal(await page.locator("video,iframe").count(), 0);
  await localScreen.click();
  await page.mouse.click(2, 2);
  assert.equal(await page.locator("dialog").count(), 0, "Backdrop dismisses");
  // Third-party playback requires explicit user intent; inspect the embed without depending on external availability.
  await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({ contentType: "text/html", body: "<p>External player test</p>" }));
  await page.locator("#highlights-ryder .film-clip").first().click();
  await page.locator("#highlights-ryder .film-screen").click();
  assert.match(await page.locator("dialog iframe").getAttribute("src"), /youtube-nocookie\.com\/embed\/aGrVfM6HsO0/);
  await page.getByRole("button", { name: "Close video", exact: true }).click();
  assert.equal(await page.locator("iframe").count(), 0);
  await page.route("**/videos/Dylan1.mp4", route => route.abort());
  await page.locator("#highlights-dylan .film-clip").first().click();
  await localScreen.click();
  await page.locator(".film-video-error").waitFor();
  assert.equal(await page.locator("dialog a").getAttribute("href"), "/videos/Dylan1.mp4");
  await page.getByRole("button", { name: "Close video", exact: true }).click();
  console.log("Highlights playback, modal focus, Escape, close, backdrop, YouTube and error fallback passed");

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await load("/news");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `News fits ${width}`);
    assert.equal(await page.locator(".news-masthead h1").evaluate(el => getComputedStyle(el).textAlign), "left");
    assert.equal(await page.locator(".news-edition").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(240, 239, 235)");
    assert.equal(await page.locator(".news-masthead").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(214, 233, 232)");
    assert.equal(await page.locator(".news-masthead-note,.news-filterbar").count(), 0, "Old masthead and category rows removed");
    assert.match(await page.locator(".news-masthead h1").innerText(), /Around[\s\S]*the club/i);
    assert.equal(await page.locator(".news-result-count").count(), 1, "One result count, no repeated header counters");
    assert.equal(await page.locator(".news-lead").count(), 1);
    assert.equal(await page.locator(".news-dispatch").count(), 1);
    const before = await page.locator(".news-story h3").allTextContents();
    if (await page.locator(".news-load").count()) {
      await page.locator(".news-load").click();
      const after = await page.locator(".news-story h3").allTextContents();
      assert.ok(after.length > before.length);
      assert.deepEqual(after.slice(0, before.length), before);
    }
    await page.locator("#story-search").fill("no-such-bardownski-story-9281");
    await page.locator(".news-empty").waitFor();
    await page.getByRole("button", { name: /Browse all stories/ }).click();
    assert.equal(await page.locator("#story-search").inputValue(), "");
    await page.getByRole("combobox", { name: "Filter stories by category" }).selectOption("Results");
    assert.equal(await page.locator("#story-topic").inputValue(), "Results");
    assert.ok((await page.locator(".news-lead-copy .news-eyebrow, .news-story .news-eyebrow").allTextContents()).every(text => text.startsWith("Results")));
    await page.locator("#story-topic").selectOption("All");
    if ([1440, 390].includes(width)) {
      await axe(".news-edition");
      if (process.env.SCREENSHOT_DIR) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/news-light-${width}.png`, fullPage: true });
      }
    }
    console.log(`News ${width}px: existing layout, alignment, search, category filters and load more passed`);
  }
  // Client-side navigation does not inherit another route's layout or colors.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.locator('.legacy-site-links a[href="/highlights"]').click();
  await page.waitForURL(base + "/highlights");
  assert.equal(await page.locator(".film-hero").evaluate(el => getComputedStyle(el).textAlign), "left");
  assert.equal(await page.locator(".film-player--paper").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(240, 239, 235)");
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 950 } });
  await noJs.goto(base + "/highlights");
  assert.equal(await noJs.locator(".film-clip[href]").count(), 17, "All clips accessible without JS");
  assert.equal(await noJs.locator("video,iframe").count(), 0);
  await noJs.close();
  assert.deepEqual(errors, []);
  console.log("Cross-route navigation and no-JS clip links passed; no runtime errors");
} finally { await browser.close(); }
