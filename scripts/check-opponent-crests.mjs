// Browser integration checks for real opponent crests and graceful failures.
// Run against the local site; external Playwright/Chromium supplied by env.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base = process.env.SITE_URL || 'http://localhost:3000';
const errors = [];
try {
  const page = await browser.newPage({reducedMotion:'reduce'});
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(`${base}/matches`,{waitUntil:'networkidle'});
    const hero = page.locator('.hub-feature');
    const image = hero.locator('.opponent-crest img');
    await image.waitFor();
    const url = await image.getAttribute('src');
    assert.match(url,/^https:\/\/chelstats\.app\/api\/crest\/\d+(?:\?base=1)?$/);
    await image.evaluate(img => img.decode());
    await page.waitForFunction(() => document.querySelector('.hub-feature .opponent-crest')?.dataset.crestState === 'loaded');
    assert.equal(await image.getAttribute('data-brand-mark'),'true');
    assert.equal(await image.evaluate(el => getComputedStyle(el).filter),'none');
    assert.equal(await hero.locator('.hub-team-logo img').getAttribute('alt'),'Bardownski B logo');
    assert.equal(await hero.locator('.opponent-crest__fallback').count(),0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await hero.screenshot({path:`/tmp/opponent-crest-hero-${width}.png`});
    const beforeUrl = page.url();
    await hero.click();
    const report = page.locator('.hub-dialog .match-report');
    await report.waitFor();
    const reportImage = report.locator('.opponent-crest img');
    await reportImage.evaluate(img => img.decode());
    assert.equal(await reportImage.getAttribute('src'),url);
    assert.equal(page.url(),beforeUrl);
    assert.equal(await report.evaluate(el => el.scrollWidth <= el.clientWidth),true);
    if (process.env.AXE_PATH) {
      await page.addScriptTag({path:process.env.AXE_PATH});
      const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.hub-dialog'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
      assert.deepEqual(violations,[]);
    }
    await page.screenshot({path:`/tmp/opponent-crest-report-${width}.png`});
    await page.keyboard.press('Escape');
  }
  // Simulate an unavailable upstream image; no broken-image icon or report loss.
  await page.route('https://chelstats.app/api/crest/**', route => route.abort());
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(() => document.querySelector('.hub-feature .opponent-crest')?.dataset.crestState === 'error');
  assert.equal(await page.locator('.hub-feature .opponent-crest img').count(),0);
  assert.ok((await page.locator('.hub-feature .opponent-crest__fallback').innerText()).length > 0);
  await page.locator('a.hub-feature').click();
  await page.waitForFunction(() => document.querySelector('.hub-dialog .opponent-crest')?.dataset.crestState === 'error');
  assert.equal(await page.locator('.hub-dialog .opponent-crest img').count(),0);
  assert.equal(await page.locator('.hub-dialog .match-report').count(),1);
  await page.keyboard.press('Escape');
  await page.unroute('https://chelstats.app/api/crest/**');
  await page.locator('a.hub-feature').click();
  await page.waitForFunction(() => document.querySelector('.hub-dialog .opponent-crest')?.dataset.crestState === 'loaded');
  await page.keyboard.press('Escape');
  // Old reports without metadata never request or guess a current club crest.
  await page.locator('#archive a.hub-match-row').first().click();
  await page.locator('.hub-dialog .match-report').waitFor();
  assert.equal(await page.locator('.hub-dialog .opponent-crest').getAttribute('data-crest-state'),'missing');
  assert.equal(await page.locator('.hub-dialog .opponent-crest img').count(),0);
  await page.keyboard.press('Escape');
  const directHref = await page.locator('a.hub-feature').getAttribute('href');
  await page.goto(`${base}${directHref}`,{waitUntil:'networkidle'});
  await page.locator('.match-report .opponent-crest img').evaluate(img => img.decode());
  assert.equal(await page.locator('.match-report h1').count(),1);
  assert.equal(await page.locator('.match-report .opponent-crest').getAttribute('data-crest-state'),'loaded');
  assert.deepEqual(errors,[]);
  console.log('Opponent crests: actual PNGs, full color, hero/modal/direct report, 1440/390/320px, accessibility, failed-image fallback, recovery and archive fallback passed.');
} finally { await browser.close(); }
