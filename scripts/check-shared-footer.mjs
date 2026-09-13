import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base=process.env.SITE_URL||'http://localhost:3000';
const routes=['/','/matches','/roster','/stats','/lab','/records','/gallery','/highlights','/news','/awards','/news/bardownski-2027-reveal','/fc','/fc/fixtures','/fc/squad','/fc/stats','/fc/records','/fc/gallery','/fc/highlights','/fc/news'];
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 for(const width of [1920,1440,768,390,320]){
  await page.setViewportSize({width,height:1000});let reference;
  for(const route of routes){
   assert.equal((await page.goto(base+route,{waitUntil:'networkidle'})).status(),200,route);
   const footer=page.locator('.shared-site-footer');assert.equal(await footer.count(),1);
   assert.equal(await page.locator('main > .shared-site-footer,main .shared-site-footer').count(),0,'The common shell owns the footer');
   await page.evaluate(()=>document.fonts.ready);
   const metrics=await footer.evaluate(el=>{const r=el.getBoundingClientRect(),inner=el.querySelector('.site-content-container'),i=inner.getBoundingClientRect(),css=getComputedStyle(inner);return{width:r.width,height:r.height,content:i.width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),font:getComputedStyle(el).font,text:el.innerText};});
   if(!reference)reference=metrics;else{
    assert.equal(metrics.width,reference.width,route+' footer width');assert.ok(Math.abs(metrics.height-reference.height)<1,route+' footer height');assert.equal(metrics.content,reference.content);assert.equal(metrics.font,reference.font);assert.equal(metrics.text,reference.text);
   }
   assert.ok(metrics.content<=1280);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.getByRole('contentinfo').count(),1,route+' has one shared contentinfo footer');
   if(route==='/'){
    const signoff=page.locator('.home-signoff');assert.equal(await signoff.count(),1);
    assert.equal(await signoff.locator('.footer-wordmark').innerText(),'BARDOWNSKI®');
    assert.ok(Number(await signoff.locator('.footer-wordmark').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))) >= (width>=768?90:38),'Large wordmark is preserved');
    assert.equal(await signoff.locator('.footer-bottom nav a').count(),3);
    assert.ok((await signoff.boundingBox()).y+(await signoff.boundingBox()).height <= (await footer.boundingBox()).y+1,'Shared footer is below the original sign-off');
   }
   if(route==='/fc'||route.startsWith('/fc/')){
    const fc=page.locator('.fc-page-signoff');assert.equal(await fc.count(),1);
    assert.match(await fc.innerText(),/Official website of Bardownski FC\. EA FC 26 Pro Clubs\./);
    for(const href of ['/fc/squad','/fc/fixtures','/fc/stats','/fc/records','/fc/news','/fc/gallery','/fc/highlights'])assert.equal(await fc.locator(`a[href="${href}"]`).count(),1);
    assert.ok((await fc.boundingBox()).y+(await fc.boundingBox()).height <= (await footer.boundingBox()).y+1,'FC links remain above shared footer');
   }
  }
  console.log(`${width}px: identical footer content, typography and dimensions on ${routes.length} pages (${reference.content}px content, ${reference.height}px height)`);
 }
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.shared-site-footer').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(231, 221, 236)');
 await page.locator('.shared-site-footer').scrollIntoViewIfNeeded();
 await page.locator('.shared-site-footer a[href="/roster"]').click();await page.waitForURL(base+'/roster');
 assert.equal(await page.locator('.shared-site-footer').count(),1);
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base);assert.equal(await nojs.locator('.shared-site-footer').count(),1);await nojs.close();
 console.log('Shared footer verified, including Home lavender continuation, navigation and no-JS.');
}finally{await browser.close()}
