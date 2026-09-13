// Read-only browser checks against a local Next server. Playwright and axe are
// supplied externally; no new production dependency or data mutation is needed.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base = process.env.SITE_URL || 'http://localhost:3000';
const errors = [];
try {
  const page = await browser.newPage({reducedMotion:'reduce'});
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(`${base}/matches`,{waitUntil:'networkidle'});
    const hub = page.locator('.matches-hub');
    await hub.waitFor();
    assert.equal(await hub.locator('h1').count(), 1);
    assert.doesNotMatch(await hub.innerText(), /tracking|connected|setup pending|NaN|Infinity/i);
    assert.match(await page.locator('.hub-streak').innerText(), /24/);
    assert.equal(await page.locator('.hub-results').evaluate(el => getComputedStyle(el).color), 'rgb(22, 43, 48)');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
    const current = page.locator('#results');
    const archive = page.locator('#archive');
    await current.getByRole('button',{name:'Upcoming',exact:true}).click();
    assert.equal(await current.getByRole('button',{name:'Upcoming',exact:true}).getAttribute('aria-pressed'),'true');
    await current.getByRole('button',{name:'All matches',exact:true}).click();
    const archiveSearch = archive.getByRole('searchbox');
    await archiveSearch.fill('NO-SUCH-OPPONENT-987654');
    await page.getByText('No matches in this view.',{exact:true}).waitFor();
    assert.equal(await archive.locator('.hub-match-row').count(),0);
    await archive.getByRole('button',{name:'Clear filters'}).click();
    assert.equal(await archiveSearch.inputValue(),'');
    if (await archive.locator('.hub-match-row').count()) {
      await archive.getByRole('button',{name:'Wins',exact:true}).click();
      for (const result of await archive.locator('.hub-result').allTextContents()) assert.equal(result,'W');
      await archive.getByRole('button',{name:'All matches',exact:true}).click();
      const firstPage = await archive.locator('.hub-match-row').first().innerText();
      if (await archive.locator('.hub-pagination').count()) {
        await archive.getByRole('button',{name:'Page 2',exact:true}).click();
        assert.equal(await archive.getByRole('button',{name:'Page 2',exact:true}).getAttribute('aria-current'),'page');
        assert.notEqual(await archive.locator('.hub-match-row').first().innerText(),firstPage);
        await archive.getByRole('button',{name:'← Previous',exact:true}).click();
        assert.equal(await archive.locator('.hub-match-row').first().innerText(),firstPage);
        await archive.getByRole('button',{name:'Next →',exact:true}).click();
      }
      const link = archive.locator('a.hub-match-row').first();
      assert.match(await link.getAttribute('href'), /\?season=2025-2026$/);
      const beforeUrl = page.url();
      const beforePage = await archive.locator('.hub-pagination [aria-current=page]').innerText();
      await link.focus();
      const scrollY = await page.evaluate(() => window.scrollY);
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.locator('.match-report').waitFor();
      assert.equal(page.url(), beforeUrl, 'Reports must not navigate off the hub');
      assert.equal(await page.evaluate(() => document.body.style.overflow),'hidden');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)),true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)),true,'Focus stays in report');
      assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth),true,`Report overflow at ${width}`);
      if (process.env.AXE_PATH) {
        await page.addScriptTag({path:process.env.AXE_PATH});
        const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.hub-dialog'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
        assert.deepEqual(violations, [], `Report accessibility at ${width}`);
      }
      await page.screenshot({path:`/tmp/match-report-${width}.png`,fullPage:false});
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(),0);
      assert.equal(await archive.locator('.hub-pagination [aria-current=page]').innerText(),beforePage);
      assert.equal(await page.evaluate(() => window.scrollY),scrollY);
      assert.equal(await link.evaluate(el => el === document.activeElement),true);
      await link.click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button',{name:'Close match report'}).click();
      assert.equal(await page.getByRole('dialog').count(),0);
    }
    if (process.env.AXE_PATH) {
      await page.addScriptTag({path:process.env.AXE_PATH});
      const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.matches-hub'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
      assert.deepEqual(violations, [], `Accessibility at ${width}`);
    }
    if (await archive.locator('.hub-pagination').count()) await archive.getByRole('button',{name:'Page 1',exact:true}).click();
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`/tmp/matches-hub-${width}.png`,fullPage:true});
    console.log(`Matches layout, filters, pagination, report navigation and accessibility passed at ${width}px.`);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await page.locator('.bd-home').waitFor();
  await page.locator('.legacy-site-links a[href="/matches"]').click();
  await page.locator('.matches-hub').waitFor();
  assert.equal(await page.locator('.hub-hero').evaluate(el => getComputedStyle(el).backgroundColor),'rgb(50, 13, 72)');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const pause = page.getByRole('button',{name:'Pause page animations'});
  await pause.click();
  assert.equal(await page.locator('.hockey-motion-off').count(),1);
  assert.equal(await page.locator('.hub-streak-numbers').evaluate(el => getComputedStyle(el).animationName),'none');
  await page.getByRole('button',{name:'Resume page animations'}).click();
  const latestReport = page.locator('a.hub-feature');
  if (await latestReport.count()) {
    const beforeUrl = page.url();
    await latestReport.click();
    await page.locator('.hub-dialog .match-report').waitFor();
    assert.match(await page.locator('.hub-dialog').innerText(), /2026–2027/);
    assert.equal(page.url(),beforeUrl);
    await page.getByRole('button',{name:'Close match report'}).click();
  }
  // Network errors stay inside the modal; retry recovers without losing place.
  const reportLink = page.locator('#archive a.hub-match-row').first();
  const directHref = await reportLink.getAttribute('href');
  await page.route('**/api/matches/**', route => route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await reportLink.click();
  await page.getByRole('button',{name:'Try again'}).waitFor();
  await page.unroute('**/api/matches/**');
  await page.getByRole('button',{name:'Try again'}).click();
  await page.locator('.hub-dialog .match-report').waitFor();
  await page.keyboard.press('Escape');
  const direct = await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await direct.goto(`${base}${directHref}`,{waitUntil:'networkidle'});
  assert.equal(await direct.locator('.match-report h1').count(),1);
  assert.equal(await direct.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
  await direct.close();
  const noJs = await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
  await noJs.goto(`${base}/matches`,{waitUntil:'load'});
  assert.equal(await noJs.locator('.matches-hub h1').isVisible(),true);
  assert.ok(await noJs.locator('#archive a.hub-match-row').count() > 0);
  assert.deepEqual(errors, [], 'Runtime/hydration errors');
  console.log('Client navigation, motion preference, server-rendered content and runtime checks passed.');
} finally { await browser.close(); }
