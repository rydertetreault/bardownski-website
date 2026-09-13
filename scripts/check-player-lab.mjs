// Run against the real application: PLAYWRIGHT_MODULE=/path/to/index.mjs CHROME=/path/to/chrome node scripts/check-player-lab.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ["--no-sandbox"] });
const base = process.env.SITE_URL || "http://localhost:3000";
const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
async function load(path) {
  const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200, path);
  await page.locator("h1").first().waitFor();
  if (path !== "/fc") await page.locator(".hockey-motion-toggle").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/matches", "/roster", "/stats", "/records", "/gallery", "/highlights", "/news", "/awards", "/lab"]) {
      await load(route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No page overflow ${route} ${width}`);
      assert.equal(await page.locator(".hockey-interior").count(), 1);
      assert.equal(await page.locator("h1").count(), 1, `One H1 ${route}`);
      assert.equal(await page.locator(".hockey-motion-toggle").isDisabled(), true);
      if (route === "/stats") assert.equal(await page.locator("#comparison,.comparison-lab,#lines").count(), 0, "Comparison removed from Stats");
      if (route === "/lab") {
        assert.equal(await page.locator("#comparison").count(), 1);
        assert.equal(await page.locator("#lines").count(), 1);
        await page.locator("#lines").scrollIntoViewIfNeeded();
        if (process.env.AXE_PATH && [1440, 390].includes(width)) {
          await page.addScriptTag({ path: process.env.AXE_PATH });
          const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.player-lab'), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
          assert.deepEqual(violations, [], `Lab accessibility ${width}`);
        }
      }
    }
    console.log(`All nine interior routes: ${width}px passed`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load("/lab");
  await page.locator("#line-season").selectOption("hockey:nhl26:2025-2026:common-gen5:149602");
  assert.match(await page.locator(".line-archive-note").innerText(), /2025–2026 ARCHIVE/);
  assert.equal(await page.locator(".line-evaluation .line-stat-grid").count(), 0, "No partial draft statistics");
  const useLine = page.getByRole("button", { name: /^Use combination / }).first();
  assert.ok(await useLine.count());
  await useLine.click();
  assert.equal(await page.locator(".line-slot select").evaluateAll(els => els.every(el => el.value)), true);
  const firstSlots = await page.locator(".line-slot select").evaluateAll(els => els.map(el => el.value));
  const games = await page.locator(".line-stat-grid strong").first().innerText();
  assert.ok(Number(games) >= 3);
  await page.locator("#line-slot-0").selectOption(firstSlots[1]);
  assert.deepEqual(await page.locator(".line-slot select").evaluateAll(els => els.map(el => el.value)), [firstSlots[1], firstSlots[0], firstSlots[2]], "Duplicate selection swaps slots");
  assert.equal(await page.locator(".line-stat-grid strong").first().innerText(), games, "Position swaps do not fabricate chemistry changes");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Reset line", exact: true }).click();
  assert.equal(await page.locator(".line-stat-grid").count(), 0);
  await page.getByRole("button", { name: "Restore draft", exact: true }).click();
  assert.equal(await page.locator(".line-stat-grid strong").first().innerText(), games);
  await page.locator(".line-availability input").evaluateAll((els, selected) => els.find(el => el.closest('label').innerText.includes(selected))?.click(), firstSlots[0]);
  assert.equal(await page.locator(".line-stat-grid").count(), 0, "Unavailable player removed from draft");
  await page.getByRole("button", { name: "Clear pool", exact: true }).click();
  assert.equal(await page.locator(".line-availability input:checked").count(), 0);
  assert.match(await page.locator(".line-empty").innerText(), /Select at least/);
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await page.getByRole("button", { name: "Pair", exact: true }).click();
  await page.locator("#line-slot-0").selectOption("SLOBBY ROBBY");
  await page.locator("#line-slot-1").selectOption("WOLFGANG MOZART");
  // Complete but unobserved pairs must be truthful whether fuller Redis data exists.
  if (await page.locator(".line-stat-grid strong").first().innerText() === "0") {
    assert.match(await page.locator(".line-evaluation").innerText(), /missing evidence—not zero chemistry/);
    assert.equal(await page.locator(".line-stat-grid strong").nth(2).innerText(), "—");
  }
  await page.getByRole("button", { name: "Five skaters", exact: true }).click();
  assert.equal(await page.locator(".line-slot select").count(), 5);
  await page.locator("#line-min-games").selectOption("10");
  assert.equal(await page.locator(".line-stat-grid").count(), 0);
  const datasetId="hockey:nhl26:2025-2026:common-gen5:149602", seasonLabel="2025–2026";
  const draftKey=`bardownski-line-draft-v2:${encodeURIComponent(datasetId)}:${encodeURIComponent(seasonLabel)}`;
  await page.evaluate(({draftKey,datasetId,seasonLabel}) => localStorage.setItem(draftKey, JSON.stringify({datasetId,season:seasonLabel,size:3, slots:["SLOBBY ROBBY","SLOBBY ROBBY","unknown"], available:["SLOBBY ROBBY","unknown"]})),{draftKey,datasetId,seasonLabel});
  await page.getByRole("button", { name: "Restore draft", exact: true }).click();
  assert.deepEqual(await page.locator(".line-slot select").evaluateAll(els => els.map(el => el.value)), ["SLOBBY ROBBY", "", ""]);
  await page.evaluate(draftKey => localStorage.setItem(draftKey, "{broken"),draftKey);
  await page.getByRole("button", { name: "Restore draft", exact: true }).click();
  assert.match(await page.locator(".line-message").innerText(), /could not be restored/);
  console.log("Line selections, recommendation evidence, swapping, available pool and draft persistence passed");
  // Existing comparison remains independently functional on its new route.
  for (const view of ["Bars", "Scatter", "Trend", "Radar"]) {
    const tab = page.getByRole("group", { name: "Chart view", exact: true }).getByRole("button", { name: new RegExp(view, "i") });
    await tab.click(); assert.equal(await tab.getAttribute("aria-pressed"), "true");
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => !document.querySelector('.hockey-motion-toggle').disabled);
  await page.getByRole("button", { name: "Pause page animations", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.hockey-interior.hockey-motion-off'));
  await page.locator('.legacy-site-links a[href="/stats"]').click();
  await page.waitForURL(base + '/stats');
  await page.getByRole("button", { name: "Resume page animations", exact: true }).waitFor();
  await page.locator('.stats-leader').first().scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.stats-leader').first().evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await page.locator('.stats-leader').first().evaluate(el => el.getAnimations().filter(a => a.playState === 'running').length), 0, 'Existing card animation respects shared pause');
  // Storage is optional, motion controls are not.
  await page.getByRole('button', {name:'Resume page animations',exact:true}).click();
  await page.evaluate(() => { window.__oldSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
  await page.getByRole('button', {name:'Pause page animations',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('.hockey-motion-off'));
  await page.getByRole('button', {name:'Resume page animations',exact:true}).click();
  await page.waitForFunction(() => !document.querySelector('.hockey-motion-off'));
  await page.evaluate(() => { Storage.prototype.setItem = window.__oldSetItem; });
  await page.locator('.legacy-site-links a[href="/records"]').click();
  await page.waitForURL(base + '/records');
  await page.locator('.pause-showcase').click();
  await page.waitForFunction(() => document.querySelector('.hockey-motion-off') && !document.querySelector('.record-motion'));
  assert.equal(await page.locator('[data-count]').evaluateAll(els => els.every(el => el.textContent === el.dataset.count)), true, 'Records counts settle when globally paused');
  await page.locator('.legacy-nav-fc').click();
  await page.waitForURL(base + '/fc');
  assert.equal(await page.locator('.hockey-interior,.hockey-motion-toggle').count(), 0);
  assert.equal(await page.locator('.fc-site').count(), 1);
  await page.locator('.legacy-nav-fc').click();
  await page.waitForURL(base + '/');
  assert.equal(await page.locator('.bd-home').count(), 1);
  assert.equal(await page.locator('.hockey-motion-toggle').count(), 0);
  assert.deepEqual(errors, []);
  console.log("Comparison tabs, shared motion preference, hockey/FC/home isolation passed");
} finally { await browser.close(); }
