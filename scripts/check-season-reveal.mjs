// Verify the published reveal end-to-end. Requires a running app; SITE_URL optional.
import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright-core");
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:["--no-sandbox"]});
const base=process.env.SITE_URL||"http://localhost:3000";
const route="/news/bardownski-2027-reveal",movie="/videos/announcements/bardownski-2027.mp4";
const page=await browser.newPage({reducedMotion:"reduce",viewport:{width:1440,height:900}});
const errors=[],requests=[];page.on("pageerror",error=>errors.push(error.message));page.on("request",request=>{if(request.url().includes(movie))requests.push(request.url())});
async function axe(){if(!process.env.AXE_PATH)return;await page.addScriptTag({path:process.env.AXE_PATH});const v=await page.evaluate(async()=>(await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(v,[]);}
try{
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});await page.goto(base,{waitUntil:"domcontentloaded"});await page.locator('.bd-home.motion-off').waitFor();
    assert.equal(await page.locator('#news .news-item').count(),3);
    assert.equal(await page.locator('#news .news-item').first().evaluate(el=>el.classList.contains('featured-news')),true);
    assert.match(await page.locator('#news .news-item').first().innerText(),/Bardownski 2027/i);
    assert.equal(await page.locator('.cinema-backdrop img').evaluate(img=>getComputedStyle(img).filter),'none');
    assert.equal(await page.locator('.featured-news img').evaluate(img=>getComputedStyle(img).filter),'none');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('video').count(),0);
    if(width===1440||width===390)await axe();
  }
  assert.deepEqual(requests,[],"No film requested until viewer selects it");
  await page.locator('[data-video="reveal"]').click();
  await page.waitForFunction(()=>document.querySelector('dialog video')?.readyState>=1);
  assert.equal(await page.locator('dialog video').evaluate(v=>v.paused),true,"Never autoplay with sound");
  assert.ok(Math.abs(await page.locator('dialog video').evaluate(v=>v.duration)-155.066667)<.1);
  await page.waitForFunction(()=>document.querySelector('dialog track')?.readyState===2);
  assert.ok(await page.locator('dialog video').evaluate(v=>v.textTracks[0].cues.length)>=35);
  await page.locator('dialog video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('dialog video')?.currentTime>0);
  await page.locator('dialog video').evaluate(v=>{v.pause();v.currentTime=138;});await page.waitForTimeout(500);
  assert.equal(await page.locator('dialog video').evaluate(v=>v.error),null);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog')?.open&&!document.querySelector('dialog video source'));
  assert.equal(await page.locator('[data-video="reveal"]').evaluate(el=>document.activeElement===el),true);
  await page.locator('#news .featured-news a[data-news]').click();await page.waitForURL(base+route);
  assert.equal(await page.locator('#reveal-film video').getAttribute('preload'),'none');
  assert.match(await page.locator('h1').innerText(),/New Jerseys/i);
  assert.match(await page.locator('.reveal-archive-note').innerText(),/366 games/);
  await page.locator('.reveal-transcript summary').click();assert.match(await page.locator('.reveal-transcript').innerText(),/Xavier Laflamme/i);
  if(process.env.AXE_PATH)await axe();
  await page.locator('#reveal-film video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#reveal-film video')?.currentTime>0);
  await page.locator('#reveal-film video').evaluate(v=>v.pause());
  // Source load failure has an accessible retry without blocking the article.
  await page.route('**/videos/announcements/bardownski-2027.mp4',r=>r.abort());
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.hockey-interior.hockey-motion-off'));
  await page.locator('#reveal-film video').evaluate(v=>{v.load();v.play().catch(()=>{});});await page.locator('.article-video-error').waitFor();
  assert.equal(await page.getByRole('button',{name:'Try the video again'}).count(),1);
  await page.unroute('**/videos/announcements/bardownski-2027.mp4');
  await page.getByRole('button',{name:'Try the video again'}).click();await page.locator('#reveal-film video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#reveal-film video')?.currentTime>0);
  await page.goto(base+'/news',{waitUntil:'domcontentloaded'});assert.match(await page.locator('.news-lead h2').innerText(),/Bardownski 2027/i);
  await page.goto(base+'/roster',{waitUntil:'domcontentloaded'});assert.match(await page.locator('#leadership').innerText(),/Xavier Laflamme/i);assert.match(await page.locator('#leadership').innerText(),/Matt Hut/i);assert.doesNotMatch(await page.locator('#leadership').innerText(),/pending|To be announced/);
  const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base);assert.equal(await nojs.locator('[data-video="reveal"]').getAttribute('href'),route+'#reveal-film');await nojs.goto(base+route);assert.equal(await nojs.locator('#reveal-film video[controls]').count(),1);await nojs.close();
  assert.deepEqual(errors,[]);
  console.log('Reveal passed: featured article, true-color poster, deferred video, metadata/captions/playback/seek, focus cleanup, story/transcript, error retry, announced leaders and no-JS route.');
}finally{await browser.close()}
