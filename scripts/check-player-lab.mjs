// SITE_URL=http://localhost:3000 PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs
// CHROME=/path/to/chrome [AXE_PATH=/path/to/axe.min.js] node scripts/check-player-lab.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
const base = process.env.SITE_URL || "http://localhost:3000";
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/lab`, { waitUntil: "networkidle" });
  const lab = page.locator(".player-lab");
  const insight = name => page.getByRole("tab", { name, exact: true });
  // Tool tab names include their descriptions; stable IDs avoid label coupling.
  const builderTab = page.locator("#lab-tool-tab-lines");
  const comparisonTab = page.locator("#lab-tool-tab-comparison");
  assert.equal(await builderTab.getAttribute("aria-selected"), "true");
  assert.equal(await page.locator("#comparison").count(), 0, "Comparison isn't loaded before its first visit");
  assert.equal(await insight("Suggested lines").getAttribute("aria-selected"), "true");
  assert.equal(await page.getByRole("button", { name: "Your line", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("#goalies").count(), 0);
  assert.equal(await page.locator(".line-recommendations").count(), 1);
  assert.equal(await page.locator(".line-ideas").count(), 1, "One lower Line ideas section");
  assert.equal(await page.getByRole("complementary", { name: "Player connection", exact: true }).count(), 1);
  assert.match(await page.locator(".player-connection .line-micro").innerText(), /THE PLAYER CONNECTION/);
  const treatments = await page.evaluate(() => {
    const ideas = getComputedStyle(document.querySelector(".line-ideas"));
    const player = getComputedStyle(document.querySelector(".player-connection"));
    const goalie = getComputedStyle(document.querySelector(".goalie-connection"));
    return { radius: ideas.borderRadius, shadow: ideas.boxShadow, left: ideas.borderLeftWidth, right: ideas.borderRightWidth,
      playerAccent: player.borderTopColor, goalieAccent: goalie.borderTopColor, playerRule: player.borderTopWidth, goalieRule: goalie.borderTopWidth };
  });
  assert.equal(treatments.radius, "0px", "Line ideas isn't a rounded card");
  assert.equal(treatments.shadow, "none");
  assert.equal(treatments.left, "0px");
  assert.equal(treatments.right, "0px");
  assert.equal(treatments.playerRule, treatments.goalieRule, "Connection panels share the same top rule");
  assert.equal(treatments.playerAccent, "rgb(104, 200, 206)");
  assert.equal(treatments.goalieAccent, "rgb(196, 161, 220)");
  assert.equal(await page.locator(".line-ideas > details > summary").innerText(), "How ratings work");
  assert.doesNotMatch(await page.locator(".line-ideas").innerText(), /Who clicks with|One goalie\. One skater|THE SEASON LEDGER|Goalie numbers|LOOKING FOR A SPARK|THE FINE PRINT|Preview only\. Choose/i);
  assert.equal(await page.locator(".line-workspace > #goalie-compatibility").count(), 1, "Pairings belong beside the goalie, outside lower ideas");
  assert.equal(await page.locator("#goalie-compatibility .lab-select").count(), 0, "There is one goalie picker, not a duplicate");
  assert.doesNotMatch(await lab.innerText(), /Feed checked|Last stored sync|tracking is connected|Stored matches|THE DRAWING BOARD|THE SEASON LEDGER/);
  assert.equal(await lab.locator("select").count(), 0);
  assert.equal(await lab.locator(".line-sweater").count(), 0);
  assert.ok(await lab.locator(".player-lab-hero-image img").evaluate(img => img.complete && img.naturalWidth > 0));

  async function pick(index, name) {
    const control = page.locator(`#line-slot-${index}`);
    await control.click();
    await page.locator(`#line-slot-${index}-search`).fill(name);
    await page.getByRole("option", { name, exact: true }).click();
    assert.ok((await control.innerText()).includes(name));
  }
  async function chooseGoalie(name) {
    await page.locator("#line-goalie").click();
    await page.locator("#line-goalie-search").fill(name);
    await page.getByRole("option", { name, exact: true }).click();
  }
  async function assertOnlyInsight(selector) {
    assert.equal(await page.locator("#line-ideas-panel").count(), 1);
    assert.doesNotMatch(await page.locator(".line-ideas").innerText(), /Who clicks with|THE SEASON LEDGER|LOOKING FOR A SPARK|THE FINE PRINT/i);
    assert.equal(await page.locator("#goalie-compatibility").count(), 1, "Goalie companion stays mounted");
    for (const candidate of ["#goalies", ".line-recommendations"]) {
      assert.equal(await page.locator(candidate).count(), candidate === selector ? 1 : 0, `${candidate} mounts only when active`);
    }
  }
  await page.getByRole("button", { name: /Archive 2025–2026/ }).click();
  await pick(0, "MATT HUT");
  await pick(1, "JIMMY LEMONS");
  await chooseGoalie("JENE RENE TETREAU IV");
  const compatibility = page.locator("#goalie-compatibility");
  assert.equal(await compatibility.locator(".gc-row").count(), 2, "Pairings work with an incomplete 3s line");
  for (const name of ["MATT HUT", "JIMMY LEMONS"]) {
    const row = compatibility.locator(".gc-row").filter({ hasText: name });
    assert.match(await row.innerText(), /\d+%/);
  }
  const mattFit = compatibility.locator(".gc-row").filter({ hasText: "MATT HUT" });
  await mattFit.locator(".gc-pair-toggle").click();
  assert.equal(await mattFit.locator(".gc-pair-toggle").getAttribute("aria-expanded"), "true");
  assert.equal(await mattFit.locator(".gc-detail").isVisible(), true);
  await mattFit.locator(".gc-evidence > summary").click();
  assert.ok(await mattFit.locator(".gc-evidence li").count() > 0, "Source games remain accessible in the small panel");
  await mattFit.locator(".gc-evidence > summary").click();
  await mattFit.locator(".gc-pair-toggle").click();
  await compatibility.getByRole("button", { name: "All skaters", exact: true }).click();
  const rosterCount = await compatibility.locator(".gc-row").count();
  assert.ok(rosterCount > 2);
  await compatibility.locator(".gc-stats-link").click();
  assert.equal(await insight("Goalie stats with this line").getAttribute("aria-selected"), "true");
  await assertOnlyInsight("#goalies");
  assert.equal(await page.getByRole("button", { name: "With this line", exact: true }).getAttribute("aria-pressed"), "true", "Shared-line goalie stats are the default");
  await page.getByRole("button", { name: "With this line", exact: true }).click();
  assert.match(await page.locator("#goalies").innerText(), /Fill every slot/);
  await page.getByRole("button", { name: "Season stats", exact: true }).click();
  assert.ok(await page.locator(".goalie-impact-row").count() > 0);
  assert.equal(await compatibility.locator(".gc-row").count(), rosterCount, "Pair scope survives lower-view switches");
  await insight("Suggested lines").click();
  await assertOnlyInsight(".line-recommendations");
  await page.locator("#line-min-games").click();
  await page.getByRole("option", { name: "1+ game", exact: true }).click();
  await page.getByRole("button", { name: /Use combination/ }).first().click();
  await page.getByRole("button", { name: "Save line" }).click();
  const savedName = await page.locator("#line-slot-0 .line-player-name").innerText();
  await page.getByRole("button", { name: "Clear line", exact: true }).click();
  await page.getByRole("button", { name: "Load saved" }).click();
  assert.equal(await page.locator("#line-slot-0 .line-player-name").innerText(), savedName);

  // Both tool states survive switching, without exposing hidden controls.
  await comparisonTab.click();
  await page.locator("#comparison").waitFor({ state: "visible" });
  assert.equal(await page.locator("#lines").isVisible(), false);
  const colors = await page.evaluate(() => [".lab-header", ".lab-matchup-setup", ".lab-analysis-display"].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor));
  assert.equal(new Set(colors).size, 3);
  for (const name of ["Grouped bars", "Scatter plot", "Season trend", "Radar"]) {
    const tab = page.getByRole("button", { name: new RegExp(name) });
    await tab.click();
    assert.equal(await tab.getAttribute("aria-pressed"), "true");
  }
  await page.getByRole("button", { name: "Goalies", exact: true }).click();
  await page.getByRole("button", { name: "Per game", exact: true }).click();
  await builderTab.click();
  assert.equal(await page.locator("#comparison").isVisible(), false);
  assert.equal(await page.locator("#line-slot-0 .line-player-name").innerText(), savedName);
  assert.equal(await insight("Suggested lines").getAttribute("aria-selected"), "true");
  await comparisonTab.click();
  assert.equal(await page.getByRole("button", { name: "Goalies", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "Per game", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("link", { name: "How it works ↗", exact: true }).click();
  await page.locator("#chemistry-method").waitFor({ state: "visible" });
  assert.equal(await page.locator("#chemistry-method").getAttribute("open"), "");
  await page.locator("#chemistry-method > summary").click();
  await insight("Suggested lines").click();
  await insight("Suggested lines").press("ArrowRight");
  assert.equal(await insight("Goalie stats with this line").getAttribute("aria-selected"), "true");
  await insight("Goalie stats with this line").press("Home");
  assert.equal(await insight("Suggested lines").getAttribute("aria-selected"), "true");

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await builderTab.click();
    for (const name of ["Suggested lines", "Goalie stats with this line"]) {
      await insight(name).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no overflow at ${width}px`);
      if (process.env.AXE_PATH && [390, 1440].includes(width)) {
        await page.addScriptTag({ path: process.env.AXE_PATH });
        const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector(".player-lab"), {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations, []);
      }
    }
    const center = await page.locator('.line-slot[data-position="C"]').boundingBox();
    const wing = await page.locator('.line-slot[data-position="W"]').boundingBox();
    const defense = await page.locator('.line-slot[data-position="D"]').boundingBox();
    assert.ok(defense.y > center.y && defense.x > center.x && defense.x < wing.x);
    assert.equal(Math.round(center.y), Math.round(wing.y));
    const goalieSlot = await page.locator(".line-goalie-slot").boundingBox();
    const goalieFit = await compatibility.boundingBox();
    if (width > 850) {
      assert.ok(goalieFit.x >= goalieSlot.x + goalieSlot.width, "Player fit is right of the goalie");
      assert.ok(Math.abs(goalieFit.y - goalieSlot.y) < 2, "Goalie and fit share the same row");
    } else {
      assert.ok(goalieFit.y >= goalieSlot.y + goalieSlot.height, "Player fit follows goalie on mobile");
    }
    await comparisonTab.click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Comparison: no overflow at ${width}px`);
  }
  // Explicit tool URLs and old section links remain functional on first load.
  await page.goto(`${base}/lab?tool=comparison`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#lines").count(), 0);
  assert.equal(await page.locator("#comparison").isVisible(), true);
  await page.goto(`${base}/lab#goalie-compatibility`, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".line-workspace > #goalie-compatibility").isVisible(), true);
  assert.equal(await insight("Suggested lines").getAttribute("aria-selected"), "true", "Pairing link doesn't replace the lower ideas view");
  await page.goto(`${base}/lab#line-insights`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#line-ideas").isVisible(), true, "Old insights bookmark reaches Line ideas");
  await page.goto(`${base}/lab#goalies`, { waitUntil: "networkidle" });
  await page.locator("#goalies").waitFor({ state: "visible" });
  assert.equal(await insight("Goalie stats with this line").getAttribute("aria-selected"), "true");
  assert.equal(await page.locator("#comparison").count(), 0);
  await comparisonTab.click();
  await page.goBack();
  await page.locator("#goalies").waitFor({ state: "visible" });
  assert.equal(await page.locator("#line-goalie").innerText().then(text => /Add goalie/i.test(text)), true, "No preview autoassigns a goalie");
  assert.deepEqual(errors, []);
  console.log("Player Lab: exclusive lazy tool loading; goalie-side pairings and separate Line ideas; preserved drafts/filters; pair compatibility; direct links/history; keyboard navigation; 320–1440px layouts and accessibility passed.");
} finally { await browser.close(); }
