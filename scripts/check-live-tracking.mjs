import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:["--no-sandbox"]});
const base=process.env.SITE_URL || "http://localhost:3000";
const page=await browser.newPage({reducedMotion:"reduce",viewport:{width:1440,height:1000}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
try {
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const route of ["/stats","/matches","/lab"]){
      const response=await page.goto(base+route,{waitUntil:"domcontentloaded"});assert.equal(response.status(),200);
      await page.locator(".tracking-connected,.tracking-stale").waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+width);
      assert.match(await page.locator(".tracking-freshness").innerText(),/Feed checked:.*Stored matches:/);
    }
    assert.match(await page.locator('.line-archive-note').innerText(),/2026–2027 CURRENT SEASON/);
    assert.equal(await page.locator('.line-availability').innerText().then(t=>t.includes('JENE RENE TETREAU IV')),false,'Goalie-only season member excluded from skater drafts');
    await page.getByRole('button',{name:'Pair',exact:true}).click();
    await page.locator('#line-slot-0').selectOption('MATT HUT');
    await page.locator('#line-slot-1').selectOption('JIMMY LEMONS');
    assert.equal(await page.locator('.line-stat-grid strong').first().innerText(),'1');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.locator('#line-season').selectOption('hockey:nhl26:2025-2026:common-gen5:149602');
    assert.match(await page.locator('.line-archive-note').innerText(),/2025–2026 ARCHIVE/);
    assert.equal(await page.locator('.line-stat-grid').count(),0,'No selections leak across seasons');
    assert.ok(await page.locator('.line-availability input').count()>=9);
    await page.locator('#line-season').selectOption('hockey:nhl27:2026-2027:common-gen5:29202');
    await page.getByRole('button',{name:'Restore draft',exact:true}).click();
    assert.equal(await page.locator('.line-stat-grid strong').first().innerText(),'1');
    console.log(`Live stats/matches and isolated line datasets: ${width}px passed`);
  }
  await page.goto(base+'/matches',{waitUntil:'domcontentloaded'});
  await page.locator('#results .archive-match-list li').first().waitFor();
  assert.ok(await page.locator('#results .archive-match-list li').count()>=5);
  assert.match(await page.locator('#archive .archive-history-summary').innerText(),/207–144–15/);
  const current=await page.locator('#results a[href*="/matches/"]').first().getAttribute('href');
  assert.match(current,/season=2026-2027/);
  const currentResponse=await page.goto(base+current,{waitUntil:'domcontentloaded'});assert.equal(currentResponse.status(),200);
  assert.match(await page.locator('body').innerText(),/2026–2027/);
  const archived='/matches/23760739000184?season=2025-2026';
  assert.equal((await page.goto(base+archived,{waitUntil:'domcontentloaded'})).status(),200);
  assert.match(await page.locator('body').innerText(),/2025–2026/);
  assert.equal((await page.goto(base+'/matches/23760739000184?season=2026-2027',{waitUntil:'domcontentloaded'})).status(),404,'Never fallback to archive under current season selector');
  await page.goto(base+'/lab',{waitUntil:'domcontentloaded'});
  if(process.env.AXE_PATH){
    await page.addScriptTag({path:process.env.AXE_PATH});
    const violations=await page.evaluate(async()=>(await window.axe.run(document.querySelector('.player-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
    assert.deepEqual(violations,[]);
  }
  assert.deepEqual(errors,[]);
  console.log('Current/archive match details, full historical record, cross-season isolation and lab accessibility passed');
}finally{await browser.close()}
