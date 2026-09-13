// SITE_URL=http://localhost:3000 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME=/path/to/chrome AXE_PATH=/path/to/axe.min.js node scripts/check-roster.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ["--no-sandbox"] });
const base = process.env.SITE_URL || "http://localhost:3000";
const page = await browser.newPage({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
async function loadRoster() {
  const response = await page.goto(`${base}/roster`, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  await page.locator(".hockey-motion-toggle").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
try {
  for (const width of [2560, 1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await loadRoster();
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page fits ${width}px`);
    const alignment = await page.locator(".roster-hero").evaluate(hero => {
      const box = hero.getBoundingClientRect();
      return [...hero.querySelectorAll(".roster-hero-content, .roster-eyebrow, .roster-season-marker, h1, .roster-hero-description, .roster-hero-actions, .roster-position-nav, .roster-hero-caption")]
        .filter(el => el.getClientRects().length)
        .map(el => ({ selector: el.className || el.tagName, left: el.getBoundingClientRect().left, expectedLeft: box.left + box.width * .06, textAlign: getComputedStyle(el).textAlign }));
    });
    for (const item of alignment) {
      assert.ok(Math.abs(item.left - item.expectedLeft) < 1, `${item.selector} stays at the left gutter at ${width}px`);
      assert.equal(item.textAlign, "left", `${item.selector} text stays left-aligned at ${width}px`);
    }
    const text = await page.locator(".roster-edition").innerText();
    assert.match(text, /Mid-season\. All in\./i);
    assert.doesNotMatch(text, /next chapter|new era|will wear|not yet final|watch the reveal|announced|returning profile/i);
    assert.match(await page.locator("#leadership").innerText(), /Xavier Laflamme/);
    assert.match(await page.locator("#leadership").innerText(), /Matt Hut/);
    assert.equal(await page.locator(".roster-leader").count(), 2);
    assert.equal(await page.locator(".player-letter[aria-label=Captain]").count(), 1);
    assert.equal(await page.locator('.player-letter[aria-label="Assistant captain"]').count(), 1);
    const sections = await page.locator(".roster-position").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      const cut = getComputedStyle(node, "::before");
      const box = node.getBoundingClientRect();
      return { id: node.id, color: style.backgroundColor, x: box.x, width: box.width, clip: cut.clipPath, height: parseFloat(cut.height) };
    }));
    assert.deepEqual(sections.map(s => s.id), ["forwards", "defense", "goalies"]);
    assert.equal(new Set(sections.map(s => s.color)).size, 3, "Three distinct backgrounds");
    for (const section of sections) {
      assert.equal(section.x, 0, "Full-bleed left edge");
      assert.equal(section.width, await page.evaluate(() => document.body.getBoundingClientRect().width), "Full-bleed right edge (excluding the stable scrollbar gutter)");
      assert.match(section.clip, /polygon/);
      assert.ok(section.height >= 26);
    }
    for (const id of ["forwards", "defense", "goalies"]) {
      await page.locator(`.roster-position-nav a[href="#${id}"]`).click();
      const headerBottom = await page.locator(".legacy-site-header").evaluate(el => el.getBoundingClientRect().bottom);
      const headingTop = await page.locator(`#group-${id}`).evaluate(el => el.getBoundingClientRect().top);
      assert.ok(headingTop >= headerBottom, `${id} anchor clears fixed header at ${width}`);
    }
    const reports = page.locator(".player-scouting");
    assert.equal(await reports.count(), 9, "Every player has a scouting report");
    for (let index = 0; index < await reports.count(); index++) {
      const report = reports.nth(index);
      const summary = report.locator("summary");
      const card = summary.locator("xpath=../..");
      const padding = await card.evaluate(el => ({ left: parseFloat(getComputedStyle(el).paddingLeft), right: parseFloat(getComputedStyle(el).paddingRight) }));
      assert.ok(padding.left >= 20 && padding.right >= 20, "Cards have left and right padding");
      const button = await summary.locator(".player-report-toggle").boundingBox();
      assert.ok(button.height >= 44 && button.width >= 180, "Obvious touch-sized report control");
      await summary.locator(".player-name").click();
      assert.equal(await report.evaluate(el => el.open), true, "Clicking the player identity opens report");
      assert.equal(await summary.locator(".report-label-close").first().isVisible(), true);
      assert.match(await report.locator(".player-report-season").innerText(), /2025–2026/);
      assert.match(await report.locator(".player-report-source").innerText(), /Not current-season totals/);
      assert.equal(await report.locator(".player-report-stats > div").count(), 4);
      const geometry = await report.locator(".player-report").evaluate(el => {
        const box = el.getBoundingClientRect();
        const summary = el.previousElementSibling.getBoundingClientRect();
        return { width: box.width, summaryWidth: summary.width, viewport: innerWidth, right: box.right };
      });
      assert.ok(geometry.width > geometry.summaryWidth * .8 && geometry.right <= geometry.viewport, "Report uses full card width");
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await report.evaluate(el => el.open), false, "Keyboard closes report");
      await page.keyboard.press("Space");
      assert.equal(await report.evaluate(el => el.open), true, "Space opens report");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Open report fits ${width}px`);
    }
    assert.equal(await page.locator(".scene-replay:visible").count(), 0, "Reduced motion has no replay controls");
    if (process.env.AXE_PATH && [1440, 390].includes(width)) {
      await page.addScriptTag({ path: process.env.AXE_PATH });
      const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector(".roster-edition"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
      assert.deepEqual(violations, [], `Roster accessibility at ${width}px`);
    }
    if (process.env.SCREENSHOT_DIR && [1440, 390].includes(width)) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/roster-midseason-${width}.png`, fullPage: true });
    }
    console.log(`Roster ${width}px: left hero, padded cards, all nine full-width reports, evidence, keyboard and reduced motion passed`);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => !document.querySelector(".hockey-motion-toggle").disabled);
  await page.getByRole("button", { name: "Pause page animations", exact: true }).click();
  assert.equal(await page.locator(".scene-replay:visible").count(), 0);
  assert.equal(await page.locator(".chapter-word").first().evaluate(el => getComputedStyle(el).animationName), "none");
  await page.getByRole("button", { name: "Resume page animations", exact: true }).click();
  const replay = page.locator("#forwards .scene-replay");
  await replay.click();
  assert.equal(await replay.evaluate(el => el.closest(".position-scene").classList.contains("scene-playing")), true);
  // The homepage's route CSS must not restore the former grid hero on navigation.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.locator('.legacy-site-links a[href="/roster"]').click();
  await page.waitForURL(base + "/roster");
  assert.equal(await page.locator(".roster-hero").evaluate(el => getComputedStyle(el).display), "flex");
  assert.equal(await page.locator("#defense").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(240, 239, 235)");
  // Server-rendered content and native disclosures remain usable without JS.
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 950 } });
  await noJs.goto(base + "/roster");
  assert.equal(await noJs.locator(".roster-position").count(), 3);
  await noJs.locator(".player-scouting summary").first().click();
  assert.notEqual(await noJs.locator(".player-scouting").first().getAttribute("open"), null);
  await noJs.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log("Roster motion toggle, replay, client navigation and no-JS fallback passed");
} finally {
  await browser.close();
}
