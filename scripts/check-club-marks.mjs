import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base=process.env.SITE_URL||'http://localhost:3000';
const panels=[['/matches','.hub-closing'],['/roster','.roster-outro'],['/stats','.stats-end'],['/highlights','.film-outro'],['/records','.roadmap'],['/awards','.new-section-panel']];
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1920,1440,768,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const [route,selector]of panels){
   assert.equal((await page.goto(base+route,{waitUntil:'networkidle'})).status(),200);
   assert.equal(await page.locator('nextjs-portal [data-nextjs-dialog]').count(),0);
   const panel=page.locator(selector);await panel.scrollIntoViewIfNeeded();
   const styles=await panel.evaluate(el=>{const c=getComputedStyle(el,'::after');return{mask:c.maskImage,pointer:c.pointerEvents,position:c.position,opacity:Number(c.opacity),z:c.zIndex};});
   assert.match(styles.mask,/\/images\/logo\/B-logo\.png/);assert.equal(styles.pointer,'none');assert.equal(styles.position,'absolute');assert.equal(styles.z,'-1');assert.ok(styles.opacity>0&&styles.opacity<.1);
   assert.equal(await page.locator('header.club-mark-panel,header .club-mark-panel,[class*="hero"].club-mark-panel').count(),0,'No new hero branding');
   const link=panel.locator('a').first();if(await link.count()){
    await link.focus();await link.scrollIntoViewIfNeeded();
    assert.equal(await link.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===el||el.contains(hit));}),true,'Brand mark does not intercept CTA');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  console.log(`${width}px: closing marks, untouched heroes, clickable CTAs, no overflow`);
 }
 for(const route of ['/gallery','/news/bardownski-2027-reveal','/fc']){
  await page.goto(base+route,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.club-footer-signature .club-mark[aria-hidden="true"]').count(),1);
 }
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('.bd-home.motion-off').waitFor();
 await page.locator('[data-album-next]').click();assert.equal(await page.locator('[data-album-label]').innerText(),'2 / 3');
 assert.equal(await page.locator('#scrapbook .club-mark[aria-hidden="true"]').count(),1);
 assert.equal(await page.locator('#scrapbook').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(231, 221, 236)');
 assert.deepEqual(errors,[]);
 console.log('Official logo placements passed; gallery controls and purple closing palette preserved.');
}finally{await browser.close()}
