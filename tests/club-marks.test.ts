import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import postcss from "postcss";
import {renderHome} from "../src/components/homepage/views";

const hosts = [
  ["src/app/matches/MatchesClient.tsx", "hub-closing"],
  ["src/app/roster/page.tsx", "roster-outro"],
  ["src/app/stats/page.tsx", "stats-end"],
  ["src/app/highlights/page.tsx", "film-outro"],
];

test("official B watermarks are restricted to closing sections, never new heroes",()=>{
  for(const [file,host] of hosts){
    const source=readFileSync(file,"utf8");
    assert.ok(source.includes(`className="${host} club-mark-panel"`),file);
    assert.doesNotMatch(source,/className="[^"]*(?:hero|masthead)[^"]*club-mark-panel/);
  }
  const home=renderHome();
  assert.doesNotMatch(home,/<footer/, "Shared layout renders the contentinfo footer");
  assert.match(home,/<div class="site-footer home-signoff club-mark-panel"/);
  assert.match(home,/<div class="scrapbook-copy"[^>]*><p class="eyebrow"><span class="club-mark" aria-hidden="true"><\/span>TEAM PHOTOS/);
  assert.doesNotMatch(home.slice(0,home.indexOf('</section>')),/club-mark/);
  for(const file of ["Footer.tsx"]){
    const source=readFileSync(`src/components/layout/${file}`,"utf8");
    assert.match(source,/className="club-mark" aria-hidden="true"/);
    assert.match(source,/club-footer-signature/);
  }
});

test("marks reuse the official mask, preserve layout, and never block interaction",()=>{
  const css=postcss.parse(readFileSync("src/components/layout/club-marks.css","utf8"));
  for(const selector of ['.club-mark','.club-mark-panel::after']){
    let found=false;
    css.walkRules(selector,rule=>{
      if (rule.parent?.type !== 'root') return;
      const values=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
      assert.match(values.mask,/\/images\/logo\/B-logo\.png/);
      assert.equal(values['pointer-events'],'none');
      if(selector.includes('after')){assert.equal(values.position,'absolute');assert.equal(values['z-index'],'-1');}
      found=true;
    });
    assert.ok(found);
  }
  css.walkRules('.club-mark-panel',rule=>{
    const values=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
    assert.equal(values.isolation,'isolate');
    assert.equal(values.overflow,undefined,'Keep existing diagonals/focus rings unclipped');
  });
  assert.match(readFileSync('src/app/layout.tsx','utf8'),/club-marks\.css/);
});
