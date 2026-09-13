// Visual-contract check; expects a running site. Use NO_JS=1 for SSR-only checks.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base=process.env.SITE_URL || 'http://localhost:3000';
const nojs=process.env.NO_JS === '1';
const colors={background:'rgb(231, 221, 236)',text:'rgb(50, 29, 60)',accent:'rgb(99, 52, 119)',muted:'rgb(101, 82, 108)',line:'rgb(200, 184, 207)'};
try {
 const page=await browser.newPage({reducedMotion:'reduce',javaScriptEnabled:!nojs});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,768,390,320]) {
  await page.setViewportSize({width,height:1000});
  assert.equal((await page.goto(base,{waitUntil:'networkidle'})).status(),200);
  if(!nojs)await page.locator('.bd-home.motion-off').waitFor();
  assert.equal(await page.locator('nextjs-portal [data-nextjs-dialog]').count(),0,'No development error overlay');
  await page.locator('.cinema-backdrop img').evaluate(img=>img.decode());
  assert.equal(await page.locator('.cinema-backdrop img').getAttribute('src'),'/images/homepage/history-2022.webp');
  assert.equal(await page.locator('#awards + .to-scrapbook + #scrapbook + .home-signoff').count(),1);
  assert.equal(await page.locator('.section-cut').count(),4);
  const style=async(selector,property)=>page.locator(selector).evaluate((el,p)=>getComputedStyle(el)[p],property);
  assert.equal(await style('.home-signoff .footer-wordmark','color'),colors.text);
  for(const selector of ['#scrapbook','.home-signoff','.shared-site-footer']) {
   assert.equal(await style(selector,'backgroundColor'),colors.background);
   assert.equal(await style(selector,'color'),colors.text);
  }
  assert.equal(await style('.to-scrapbook .section-cut-fill','fill'),colors.background);
  assert.equal(await style('.to-scrapbook .section-cut-trace','stroke'),colors.accent);
  assert.equal(await style('#scrapbook h2','color'),colors.text);
  assert.equal(await style('#scrapbook .eyebrow','color'),colors.accent);
  assert.equal(await style('#scrapbook .fine','color'),colors.muted);
  assert.equal(await style('.shared-footer-bottom','borderTopColor'),colors.line);
  assert.equal(await style('.shared-footer-brand','color'),colors.text);
  assert.equal(await style('a.shared-footer-social','color'),colors.accent);
  const next=page.locator('[data-album-next]');
  await next.scrollIntoViewIfNeeded();await next.hover();
  assert.equal(await style('[data-album-next]','backgroundColor'),colors.accent);
  assert.equal(await style('[data-album-next]','color'),colors.background);
  await next.focus();
  assert.equal(await style('[data-album-next]','outlineColor'),colors.accent);
  if(!nojs){await next.click();assert.equal(await page.locator('[data-album-label]').innerText(),'2 / 3');await page.locator('[data-album-prev]').click();assert.equal(await page.locator('[data-album-label]').innerText(),'1 / 3');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No overflow at ${width}`);
  console.log(`${width}px: hero image, diagonal, purple photos/footer, hover/focus and responsive bounds passed${nojs?' (SSR only)':''}`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close()}
