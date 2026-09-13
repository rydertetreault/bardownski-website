// All routes share the photo rule; preserve colored UI and unfiltered playback.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base=process.env.SITE_URL || 'http://localhost:3000';
const routes=['/','/matches','/roster','/stats','/lab','/records','/gallery','/highlights','/news','/news/bardownski-2027-reveal','/fc','/fc/gallery','/fc/highlights','/fc/news'];
try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  async function checkPhotos(){
    assert.deepEqual(await page.locator('.site-main img:not([data-brand-mark])').evaluateAll(images=>images.filter(img=>getComputedStyle(img).filter!=='grayscale(1)').map(img=>img.currentSrc||img.src)),[],'Every displayed photo is monochrome');
  }
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for(const route of routes){
      assert.equal((await page.goto(base+route,{waitUntil:'networkidle'})).status(),200,route);
      assert.equal(await page.locator('nextjs-portal [data-nextjs-dialog]').count(),0);
      await checkPhotos();
      const photo=page.locator('.site-main img:not([data-brand-mark])').first();
      if(await photo.count()){await photo.scrollIntoViewIfNeeded();await photo.hover({force:true});await checkPhotos();}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} ${width}`);
      console.log(`${width}px ${route}: monochrome photos, hover and layout passed`);
    }
    await page.goto(base,{waitUntil:'networkidle'});await page.locator('.bd-home.motion-off').waitFor();
    for(const year of ['2020','2021','2022','2023','2024','2025']){await page.locator(`[data-season="${year}"]`).click();await checkPhotos();}
    await page.locator('[data-album-next]').click();await checkPhotos();
    assert.equal(await page.locator('#scrapbook').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(231, 221, 236)');
    assert.equal(await page.locator('.shared-site-footer').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(231, 221, 236)');
    await page.locator('#highlights [data-video="finish"]').click();
    assert.match(await page.locator('dialog video').getAttribute('poster'),/^\/images\/monochrome\/posters\//);
    assert.equal(await page.locator('dialog video').evaluate(video=>getComputedStyle(video).filter),'none');
    await page.keyboard.press('Escape');
    await page.goto(base+'/gallery',{waitUntil:'networkidle'});
    await page.locator('.hockey-gallery-photos > div').first().click();await checkPhotos();await page.keyboard.press('Escape');
  }
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base);
  assert.equal(await nojs.locator('.cinema-backdrop img').evaluate(img=>getComputedStyle(img).filter),'grayscale(1)');
  await nojs.close();
  assert.deepEqual(errors,[]);
  console.log('Photo consistency passed: all routes, history/album changes, lightbox, no-JS, purple UI preserved, video playback unfiltered.');
}finally{await browser.close()}
