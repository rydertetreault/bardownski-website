import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright-core");
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base=process.env.SITE_URL||'http://localhost:3000';
try{
  const page=await browser.newPage({reducedMotion:'reduce'});
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/stats',{waitUntil:'domcontentloaded'});
    await page.locator('#standings .tracker-table').waitFor();
    const rows=await page.locator('#standings .tracker-table tbody tr').allTextContents();
    assert.ok(rows.length>=2);assert.ok(rows.some(row=>row.includes('MATT HUT')));assert.ok(rows.some(row=>row.includes('XAVIER LAFLAMME')));
    assert.ok(rows.every(row=>!row.includes('NaN')&&!row.includes('Infinity')));
    await page.locator('#weekly-tracker').scrollIntoViewIfNeeded();
    assert.match(await page.locator('#weekly-tracker').innerText(),/In progress · Not a final award/i);
    assert.ok(await page.locator('#weekly-tracker tbody tr').count()>=2);
    assert.match(await page.locator('#weekly-tracker').innerText(),/UTC/);
    assert.match(await page.locator('#weekly-tracker').innerText(),/Minimum 3 appearances/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(process.env.AXE_PATH&&width!==320){await page.addScriptTag({path:process.env.AXE_PATH});const result=await page.evaluate(async()=>(await window.axe.run(document.querySelector('#weekly-tracker'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(result,[]);}
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.bd-home.motion-off').waitFor();
    assert.match(await page.locator('#weekly .eyebrow').innerText(),/2026–2027/);
    assert.doesNotMatch(await page.locator('#weekly').innerText(),/APR 22, 2026|55 saves/);
    assert.match(await page.locator('#standings .eyebrow').innerText(),/2026–2027/);
    assert.ok(await page.locator('#standings .rank-entry').count()>=2);
    assert.match(await page.locator('#awards').innerText(),/2025–2026/);
  }
  console.log('Live MVP and weekly standings, current homepage leaders, historical award separation, mobile layouts and POTW accessibility passed.');
}finally{await browser.close()}
