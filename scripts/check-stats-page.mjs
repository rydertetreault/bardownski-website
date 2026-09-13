// Browser integration check. Uses an externally installed Playwright/Chromium;
// no production data writes. SITE_URL should point at a local Next server.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ["--no-sandbox"] });
const base = process.env.SITE_URL || "http://localhost:3000";
const errors = [];
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${base}/stats`, { waitUntil: "networkidle" });
    await page.locator('[role="tablist"]').waitFor();
    assert.equal(await page.locator('.stats-edition [role="tablist"]').count(), 1);
    assert.equal(await page.locator('.stats-edition h1').count(), 1);
    assert.ok(await page.evaluate(() => document.querySelector('#standings').compareDocumentPosition(document.querySelector('#numbers')) & Node.DOCUMENT_POSITION_FOLLOWING));
    const tabs = page.locator('.stats-edition [role="tab"]');
    const count = await tabs.count();
    const current = await tabs.first().innerText();
    assert.match(current, /Current/);
    await tabs.first().focus();
    await page.keyboard.press('End');
    assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
    assert.ok(await tabs.last().evaluate(el => el === document.activeElement));
    await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      const panel = page.locator('.stats-season-content:visible');
      assert.equal(await panel.count(), 1);
      assert.equal(await panel.getAttribute('aria-labelledby'), await tabs.nth(i).getAttribute('id'));
      assert.doesNotMatch(await panel.innerText(), /NaN|Infinity/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page overflow at ${width}, tab ${i}`);
      const disclosure = panel.locator('.stats-profile').first();
      if (await disclosure.count()) {
        await disclosure.locator('summary').click();
        assert.equal(await disclosure.getAttribute('open'), '');
      }
    }
    if (count > 1) {
      await tabs.first().click();
      assert.equal(await page.locator('.stats-season-content:visible .stats-profile[open]').count(), 0, 'Season changes reset profiles');
    }
    for (const id of ['#standings', '#numbers', '#archive', '#weekly-honors', '#weekly-tracker']) {
      assert.equal(await page.locator(id).count(), 1, `Unique anchor ${id}`);
    }
    const honors = page.locator('#weekly-honors');
    await honors.scrollIntoViewIfNeeded();
    const honorsText = await honors.innerText();
    if (/Award totals are temporarily unavailable/.test(honorsText)) {
      assert.match(honorsText, /Missing history is not zero wins/);
    } else {
      assert.match(honorsText, /Completed awards only\. Shared winners each receive one win\. Counts reflect recorded /);
    }
    assert.equal(await honors.locator('img, figure, details, .stats-weekly-feature, .stats-honors-totals').count(), 0);
    assert.doesNotMatch(await honors.innerText(), /performance score|In progress|Last win|Last completed week|Weeks with a winner/i);
    const alias = page.locator('#weekly-tracker');
    assert.equal((await alias.innerText()).trim(), '', 'Legacy tracker anchor has no live race content');
    assert.equal(await alias.locator('*').count(), 0, 'Legacy tracker is an empty anchor only');
    const table = honors.locator('.stats-honors-table');
    assert.ok(await table.count() <= 1, 'At most one honors table');
    const honorRows = table.locator('tbody tr');
    if (await honorRows.count()) {
      assert.deepEqual(await table.locator('thead th').allTextContents(), ['Rank', 'Player', 'Wins']);
      assert.match(await table.locator('caption').innerText(), /2026–2027 · Player of the Week wins/);
      for (const row of await honorRows.all()) {
        assert.equal(await row.locator(':scope > td, :scope > th').count(), 3);
        assert.equal(await row.locator(':scope > th[scope="row"]').count(), 1);
        const wins = await row.locator(':scope > td:last-child > strong').innerText();
        assert.match(wins, /^(?:[\d,]+|—)$/);
        const winning = wins !== '—' && Number(wins.replaceAll(',', '')) > 0;
        assert.equal(await row.getAttribute('data-winning'), String(winning));
        assert.match(await row.locator(':scope > td:first-child').innerText(), winning ? /^\d{2,}$/ : /^—$/);
      }
    } else {
      assert.match(await honors.innerText(), /No Player of the Week wins recorded yet|Award totals are temporarily unavailable/);
    }
    if (process.env.AXE_PATH) {
      await page.addScriptTag({ path: process.env.AXE_PATH });
      const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('#weekly-honors'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      assert.deepEqual(violations, [], `Accessibility at ${width}`);
    }
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({ path: `/tmp/stats-rework-${width}.png`, fullPage: true });
    console.log(`Stats layout, seasons, keyboard and accessibility passed at ${width}px.`);
  }
  // Verify CSS isolation survives client-side navigation, not just direct loads.
  await page.setViewportSize({width:1440,height:950});
  await page.getByRole('link', {name:'Home', exact:true}).click();
  await page.locator('.bd-home').waitFor();
  await page.locator('.legacy-site-links a[href="/stats"]').click();
  await page.locator('.stats-edition').waitFor();
  assert.equal(await page.locator('.stats-numbers').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(240, 239, 235)');
  const noJs = await browser.newPage({javaScriptEnabled:false, viewport:{width:390,height:900}});
  await noJs.goto(`${base}/stats`, {waitUntil:'load'});
  assert.equal(await noJs.locator('.stats-edition h1').count(), 1);
  assert.equal(await noJs.locator('#standings').isVisible(), true);
  assert.equal(await noJs.locator('[role="tabpanel"]:visible').count(), 1);
  assert.deepEqual(errors, [], 'No runtime or hydration errors');
  console.log('Client navigation, server-rendered fallback and runtime checks passed.');
} finally { await browser.close(); }
