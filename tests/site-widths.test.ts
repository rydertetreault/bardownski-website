import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkRail, expectedGeometry, routeInventory } from '../scripts/check-site-widths.mjs';

// Small, offline checks for the browser audit's arithmetic and selector scope.
// No route rendering, data fetching, snapshots or broad UI test suite.
const spec = { selector: '.example', alignment: 'both', max: 1280 };
const measurement = (left: number, width: number) => ({ contentLeft: left, contentRight: left + width, contentWidth: width });

test('gutters use the requested inclusive breakpoints', () => {
  for (const [width, gutter] of [[320,20],[390,20],[600,20],[601,24],[768,24],[1024,24],[1025,32],[1920,32],[2560,32]]) {
    assert.equal(expectedGeometry(width).gutter, gutter, `${width}px viewport`);
  }
});

test('1280 is a content cap, not an outer border-box cap', () => {
  assert.deepEqual(checkRail(measurement(636,1280), 2560,2552,spec), []);
  assert.deepEqual(checkRail(measurement(316,1280), 1920,1912,spec), []);
  assert.ok(checkRail(measurement(604,1344), 2560,2552,spec).some((message: string) => message.includes('exceeds 1280')));
});

test('mobile and tablet rails include gutters without inventing scrollbar overflow', () => {
  assert.deepEqual(checkRail(measurement(20,272),320,312,spec), []);
  assert.deepEqual(checkRail(measurement(20,342),390,382,spec), []);
  assert.deepEqual(checkRail(measurement(24,712),768,760,spec), []);
});

test('100vw versus layout-canvas scrollbar mismatch is caught', () => {
  const failures = checkRail(measurement(320,1272),1920,1912,spec);
  assert.equal(failures.length,2);
  assert.match(failures[0],/left rail/);
  assert.match(failures[1],/right rail/);
});

test('article text has its own centered 700px reading rail', () => {
  const reading = { ...spec, alignment: 'reading', max: 700 };
  assert.deepEqual(checkRail(measurement(926,700),2560,2552,reading), []);
  assert.deepEqual(checkRail(measurement(30,700),768,760,reading), []);
  assert.ok(checkRail(measurement(924,704),2560,2552,reading).some((message: string) => message.includes('exceeds 700')));
});

test('split hero copy aligns left without being forced to fill the entire rail', () => {
  assert.deepEqual(checkRail(measurement(636,660),2560,2552,{ ...spec, alignment: 'left' }), []);
  assert.ok(checkRail(measurement(100,660),2560,2552,{ ...spec, alignment: 'left' }).length);
});

test('inventory covers the requested routes with route-specific rails and bands', () => {
  const paths = routeInventory.map((route: { path: string }) => route.path);
  for (const path of ['/','/matches','/roster','/stats','/lab','/records','/gallery','/highlights','/news','/awards','/news/bardownski-2027-reveal','/fc','/fc/fixtures','/fc/squad','/fc/stats','/fc/records','/fc/gallery','/fc/highlights','/fc/news']) {
    assert.ok(paths.includes(path), path);
  }
  for (const route of routeInventory) {
    assert.ok(route.rails.length && route.bands.length);
    assert.ok(route.rails.every((entry: { selector: string }) => !['main','main > *','.site-content-container'].includes(entry.selector)));
  }
  const lab = routeInventory.find((route: { path: string }) => route.path === '/lab');
  assert.ok(lab?.bands.includes('.line-season-workspace'));
  assert.ok(lab?.rails.some((entry: { selector: string }) => entry.selector === '.lab-tool-picker'));
  assert.ok(paths.includes('/lab?tool=comparison'), 'The second tool has a separately measured visible panel');
});

// Assert the actual shared contract as well as the checker's arithmetic.
test('shared sizing tokens are loaded by the root layout without capping page paint', async () => {
  const {readFileSync}=await import('node:fs');
  const css=readFileSync('src/components/layout/site-widths.css','utf8');
  const layout=readFileSync('src/app/layout.tsx','utf8');
  assert.match(layout, /import "@\/components\/layout\/site-widths\.css"/);
  assert.match(css, /--site-content-max:\s*1280px/);
  assert.match(css, /--site-reading-max:\s*700px/);
  assert.match(css, /--site-gutter:\s*32px/);
  assert.match(css, /max-width:\s*1024px[^]*?--site-gutter:\s*24px/);
  assert.match(css, /max-width:\s*600px[^]*?--site-gutter:\s*20px/);
  assert.match(css, /max-width:\s*calc\(var\(--site-content-max\) \+ 2 \* var\(--site-gutter\)\)/);
  assert.doesNotMatch(css, /(?:\.site-main|body|main)\s*\{[^}]*max-width/);
});
