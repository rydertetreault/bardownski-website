// Verify the published reveal end-to-end. Requires a running app; SITE_URL optional.
import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright-core");
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:["--no-sandbox"]});
const base=process.env.SITE_URL||"http://localhost:3000";
const route="/news/bardownski-2027-reveal",movie="/videos/announcements/bardownski-2027.mp4";
const poster="/images/announcements/bardownski-2027-00-05.webp",captions="/videos/announcements/bardownski-2027.en.vtt";
const newsLink=`#news .featured-news a[data-news="bardownski-2027-reveal"][href="${route}"]`;
const page=await browser.newPage({reducedMotion:"reduce",viewport:{width:1440,height:900}});
const errors=[],requests=[];page.on("pageerror",error=>errors.push(error.message));page.on("request",request=>{if(request.url().includes(movie))requests.push(request.url())});
async function axe(){if(!process.env.AXE_PATH)return;await page.addScriptTag({path:process.env.AXE_PATH});const v=await page.evaluate(async()=>(await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(v,[]);}
try{
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});await page.goto(base,{waitUntil:"domcontentloaded"});await page.locator('.bd-home.motion-off').waitFor();
    assert.equal(await page.locator('#news .news-item').count(),3);
    assert.equal(await page.locator('#news .news-item').first().evaluate(el=>el.classList.contains('featured-news')),true);
    assert.match(await page.locator('#news .news-item').first().innerText(),/Bardownski 2027/i);
    assert.equal(await page.locator('#home-content > .cinema-hero:first-child').count(),1,'Normal cinema hero is the first homepage content');
    assert.equal(await page.locator('.home-reveal, #season-reveal').count(),0,'No standalone homepage reveal block');
    assert.equal(await page.locator('[data-video="reveal"]').count(),0,'Reveal is an article link, not a homepage video trigger');
    assert.match(await page.locator('.cinema-hero h1').innerText(),/HOME ICE\.\s*THE NEXT SHIFT\./);
    assert.equal(await page.locator('.cinema-backdrop img').getAttribute('src'),'/images/homepage/history-2022.webp');
    assert.equal(await page.locator(newsLink).count(),1,'Exactly one featured reveal News card');
    assert.equal(await page.locator(`a[href^="${route}"]`).count(),1,'Reveal links appear only in the News card');
    assert.equal(await page.locator('#news .news-item').filter({has:page.locator('a[data-news="bardownski-2027-reveal"]')}).count(),1);
    assert.equal(await page.locator(newsLink+' img').getAttribute('src'),poster,'News uses the requested 0:05 poster');
    assert.equal(await page.locator('img[src*="/images/announcements/bardownski-2027"]').count(),1,'No duplicate or retired reveal artwork');
    assert.equal(await page.locator(`img[src="${poster}"]`).evaluate(img=>Boolean(img.closest('#news'))),true,'Homepage reveal poster belongs only under #news');
    await page.locator(newsLink+' img').scrollIntoViewIfNeeded();
    await page.waitForFunction(src=>{const img=document.querySelector(`#news img[src="${src}"]`);return img?.complete&&img.naturalWidth>0;},poster);
    assert.equal(await page.locator(newsLink+' img').evaluate(img=>getComputedStyle(img).filter),'grayscale(1)');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('video').count(),0);
    if(width===1440||width===390)await axe();
  }
  assert.deepEqual(requests,[],"No film requested until viewer selects it");
  await page.locator(newsLink).click();await page.waitForURL(base+route);
  await page.locator('.hockey-interior.hockey-motion-off').waitFor();
  const video=page.locator('#reveal-film video');
  assert.equal(await video.getAttribute('preload'),'none');
  assert.equal(await page.locator('#reveal-film video[controls][playsinline]').count(),1);
  assert.equal(await video.getAttribute('autoplay'),null);
  assert.equal(await video.evaluate(v=>v.paused),true,'Article film never autoplays');
  assert.equal(await video.getAttribute('poster'),'/images/monochrome/posters/reveal-00-05.webp');
  assert.match(await video.getAttribute('aria-label'),/Bardownski 2027/i);
  assert.equal(await video.locator('source').getAttribute('src'),movie);
  assert.equal(await video.locator('source').getAttribute('type'),'video/mp4');
  assert.equal(await video.locator('track[kind="captions"][srclang="en"][label="English"][default]').count(),1);
  assert.equal(await video.locator('track').getAttribute('src'),captions);
  assert.match(await page.locator('h1').innerText(),/New Jerseys/i);
  assert.match(await page.locator('.reveal-archive-note').innerText(),/366 games/);
  await page.locator('.reveal-transcript summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.reveal-transcript').evaluate(el=>el.open),true,'Transcript is keyboard accessible');
  assert.match(await page.locator('.reveal-transcript').innerText(),/Xavier Laflamme/i);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});
    await video.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Article fits ${width}px viewport`);
    const bounds=await video.boundingBox();
    assert.ok(bounds&&bounds.width>0&&bounds.height>0&&bounds.x>=0&&bounds.x+bounds.width<=width,`Article player fits ${width}px viewport`);
    if(width===1440||width===390)await axe();
  }
  assert.deepEqual(requests,[],'Article video remains deferred until explicit media load');
  // Request metadata explicitly without playing, then exercise the article player.
  await video.evaluate(v=>{v.preload='metadata';v.load();});
  await page.waitForFunction(()=>document.querySelector('#reveal-film video')?.readyState>=1);
  assert.equal(await video.evaluate(v=>v.paused),true,'Metadata loading does not start playback');
  assert.ok(Math.abs(await video.evaluate(v=>v.duration)-155.066667)<.1);
  assert.ok(await video.evaluate(v=>v.videoWidth>0&&v.videoHeight>0),'Film exposes video dimensions');
  await page.waitForFunction(()=>document.querySelector('#reveal-film track')?.readyState===2);
  assert.ok(await video.evaluate(v=>v.textTracks[0].cues.length)>=35,'Timed English captions load on the article');
  await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#reveal-film video')?.currentTime>0);
  await video.evaluate(v=>{v.pause();v.currentTime=138;});
  await page.waitForFunction(()=>{const v=document.querySelector('#reveal-film video');return v&&!v.seeking&&v.readyState>=2&&Math.abs(v.currentTime-138)<.25;});
  assert.equal(await video.evaluate(v=>v.error),null,'Seek completes without media errors');
  await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#reveal-film video')?.currentTime>138.1);
  await video.evaluate(v=>v.pause());
  assert.ok(requests.length>0,'Film is requested after explicit media intent');
  // Source load failure has an accessible retry without blocking the article.
  await page.route('**/videos/announcements/bardownski-2027.mp4',r=>r.abort());
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.hockey-interior.hockey-motion-off'));
  await page.locator('#reveal-film video').evaluate(v=>{v.load();v.play().catch(()=>{});});await page.locator('.article-video-error').waitFor();
  assert.equal(await page.getByRole('button',{name:'Try the video again'}).count(),1);
  assert.equal(await page.locator('.article-video-error[role="status"]').count(),1,'Video failure is announced accessibly');
  assert.equal(await page.getByRole('link',{name:'Open the video file'}).getAttribute('href'),movie);
  assert.match(await page.locator('h1').innerText(),/New Jerseys/i);
  await page.locator('.reveal-transcript summary').click();assert.match(await page.locator('.reveal-transcript').innerText(),/Xavier Laflamme/i);
  await page.unroute('**/videos/announcements/bardownski-2027.mp4');
  await page.getByRole('button',{name:'Try the video again'}).focus();await page.keyboard.press('Enter');
  await video.waitFor();assert.equal(await video.evaluate(v=>v.paused),true,'Retry restores the player without autoplay');
  await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#reveal-film video')?.currentTime>0);
  assert.equal(await page.locator('.article-video-error').count(),0);
  assert.equal(await video.evaluate(v=>v.error),null);await video.evaluate(v=>v.pause());
  await page.goto(base+'/news',{waitUntil:'domcontentloaded'});assert.match(await page.locator('.news-lead h2').innerText(),/Bardownski 2027/i);
  await page.goto(base+'/roster',{waitUntil:'domcontentloaded'});assert.match(await page.locator('#leadership').innerText(),/Xavier Laflamme/i);assert.match(await page.locator('#leadership').innerText(),/Matt Hut/i);assert.doesNotMatch(await page.locator('#leadership').innerText(),/pending|To be announced/);
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
  const nojsRequests=[];nojs.on('pageerror',error=>errors.push(error.message));nojs.on('request',request=>{if(request.url().includes(movie))nojsRequests.push(request.url())});
  try{
    await nojs.goto(base,{waitUntil:'domcontentloaded'});
    assert.equal(await nojs.locator('#home-content > .cinema-hero:first-child').count(),1);
    assert.equal(await nojs.locator('.home-reveal, #season-reveal, [data-video="reveal"]').count(),0);
    assert.equal(await nojs.locator(newsLink).count(),1);
    assert.equal(await nojs.locator(`a[href^="${route}"]`).count(),1);
    assert.equal(await nojs.locator(newsLink+' img').getAttribute('src'),poster);
    await nojs.locator(newsLink).click();await nojs.waitForURL(base+route);
    assert.match(await nojs.locator('h1').innerText(),/New Jerseys/i);
    assert.equal(await nojs.locator('#reveal-film video[controls][preload="none"]').count(),1);
    assert.equal(await nojs.locator('#reveal-film video').getAttribute('poster'),'/images/monochrome/posters/reveal-00-05.webp');
    assert.equal(await nojs.locator('#reveal-film track[kind="captions"]').getAttribute('src'),captions);
    await nojs.locator('.reveal-transcript summary').click();
    assert.equal(await nojs.locator('.reveal-transcript').getAttribute('open'),'');
    assert.match(await nojs.locator('.reveal-transcript').innerText(),/Xavier Laflamme/i);
    assert.deepEqual(nojsRequests,[],'No-JS News navigation does not download the film');
  }finally{await nojs.close()}
  assert.deepEqual(errors,[]);
  console.log('Reveal passed: cinema hero first, News-only featured 0:05 monochrome poster and article link, no standalone reveal or homepage trigger, deferred article video, metadata/captions/playback/seek, keyboard transcript/retry, story/archive, error retry, announced leaders, responsive homepage/article (1440/768/390/320) and no-JS News navigation.');
  console.log(process.env.AXE_PATH?'Accessibility passed: axe WCAG 2 A/AA and 2.1 AA, homepage/article at 1440px and 390px; no page errors.':'Accessibility: axe skipped (AXE_PATH unset); no page errors.');
}finally{await browser.close()}
