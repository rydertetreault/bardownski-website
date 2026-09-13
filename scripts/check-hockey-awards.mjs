import assert from "node:assert/strict";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright-core");
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox']});
const base=process.env.SITE_URL||'http://localhost:3000';
try{
  const page=await browser.newPage({reducedMotion:'reduce'});
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/stats',{waitUntil:'domcontentloaded'});
    await page.locator('#standings .stats-ranking').waitFor();
    const rows=await page.locator('#standings .stats-ranking tbody tr').allTextContents();
    assert.ok(rows.length>=2);assert.ok(rows.some(row=>row.includes('MATT HUT')));assert.ok(rows.some(row=>row.includes('XAVIER LAFLAMME')));
    assert.ok(rows.every(row=>!row.includes('NaN')&&!row.includes('Infinity')));
    const honors=page.locator('#weekly-honors');
    assert.equal(await honors.count(),1);
    await honors.scrollIntoViewIfNeeded();
    const honorsText=await honors.innerText();
    if(/Award totals are temporarily unavailable/.test(honorsText)){
      assert.match(honorsText,/Missing history is not zero wins/);
    }else{
      assert.match(honorsText,/Completed awards only\. Shared winners each receive one win\. Counts reflect recorded /);
    }
    assert.equal(await honors.locator('img, figure, details, .stats-weekly-feature, .stats-honors-totals').count(),0);
    assert.doesNotMatch(await honors.innerText(),/performance score|In progress|Last win|Last completed week|Weeks with a winner/i);
    const alias=page.locator('#weekly-tracker');
    assert.equal(await alias.count(),1);
    assert.equal((await alias.innerText()).trim(),'');
    assert.equal(await alias.locator('*').count(),0,'Legacy tracker is an empty anchor only');
    const table=honors.locator('.stats-honors-table');
    assert.ok(await table.count()<=1);
    const honorRows=table.locator('tbody tr');
    if(await honorRows.count()){
      assert.deepEqual(await table.locator('thead th').allTextContents(),['Rank','Player','Wins']);
      assert.match(await table.locator('caption').innerText(),/2026–2027 · Player of the Week wins/);
      for(const row of await honorRows.all()){
        assert.equal(await row.locator(':scope > td, :scope > th').count(),3);
        assert.equal(await row.locator(':scope > th[scope="row"]').count(),1);
        const wins=await row.locator(':scope > td:last-child > strong').innerText();
        assert.match(wins,/^(?:[\d,]+|—)$/);
        const winning=wins!=='—'&&Number(wins.replaceAll(',',''))>0;
        assert.equal(await row.getAttribute('data-winning'),String(winning));
        assert.match(await row.locator(':scope > td:first-child').innerText(),winning?/^\d{2,}$/:/^—$/);
      }
    }else{
      assert.match(await honors.innerText(),/No Player of the Week wins recorded yet|Award totals are temporarily unavailable/);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(process.env.AXE_PATH&&width!==320){await page.addScriptTag({path:process.env.AXE_PATH});const result=await page.evaluate(async()=>(await window.axe.run(document.querySelector('#weekly-honors'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(result,[]);}
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.bd-home.motion-off').waitFor();
    assert.match(await page.locator('#weekly .eyebrow').innerText(),/2026–2027/);
    assert.doesNotMatch(await page.locator('#weekly').innerText(),/APR 22, 2026|55 saves/);
    assert.match(await page.locator('#standings .eyebrow').innerText(),/2026–2027/);
    assert.ok(await page.locator('#standings .rank-entry').count()>=2);
    assert.match(await page.locator('#awards').innerText(),/2025–2026/);
  }
  console.log('Live MVP and completed weekly win table, legacy anchor, current homepage leaders, historical award separation, mobile layouts and POTW accessibility passed.');
}finally{await browser.close()}
