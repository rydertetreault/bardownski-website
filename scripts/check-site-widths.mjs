#!/usr/bin/env node
/** Read-only browser width audit against an ALREADY RUNNING server.
 * node scripts/check-site-widths.mjs [--baseline]
 * SITE_URL, SITE_WIDTH_ROUTES=/,/stats, SITE_WIDTHS=2560,1920,768,390,320
 * SITE_WIDTH_OUT=/tmp/site-widths, SITE_WIDTH_CONCURRENCY=2, SITE_WIDTH_SECONDS=450
 * PLAYWRIGHT_MODULE and CHROME override the external browser installation.
 * --baseline records known failures without returning a failing exit status.
 * No fixture writes, network interception, document wrapping or overflow hiding.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const rail = (selector, alignment = 'both', max = 1280) => ({ selector, alignment, max });
const fcRail = 'main > div > :is(.site-content-container,.max-w-7xl)';
export const routeInventory = [
  { path: '/', ready: '.bd-home.motion-off,.bd-home.motion-enabled', rails: [rail('.bd-home .cinema-hero'), rail('.bd-home #results'), rail('.bd-home #weekly'), rail('.bd-home #highlights'), rail('.bd-home #news'), rail('.bd-home #history'), rail('.bd-home #awards'), rail('.bd-home #scrapbook')], bands: ['.bd-home .cinema-hero', '.bd-home #results', '.bd-home #weekly', '.bd-home #highlights', '.bd-home #news', '.bd-home #history', '.bd-home #awards', '.bd-home #scrapbook'] },
  { path: '/matches', ready: '.matches-hub', rails: [rail('.hub-hero-copy', 'left'), rail('.hub-pulse'), rail('.hub-results'), rail('.hub-archive'), rail('.hub-closing')], bands: ['.hub-hero', '.hub-pulse', '.hub-results', '.hub-archive', '.hub-closing'] },
  { path: '/roster', ready: '.roster-edition', rails: [rail('.roster-inner')], bands: ['.roster-hero', '.roster-squad', '.roster-position', '.roster-leaders', '.roster-outro'] },
  { path: '/stats', ready: '.stats-edition', rails: [rail('.stats-hero-copy', 'left'), rail('.stats-nav'), rail('.stats-standings'), rail('.stats-numbers'), rail('.stats-weekly-honors'), rail('.stats-end')], bands: ['.stats-hero', '.stats-nav', '.stats-standings', '.stats-numbers', '.stats-weekly-honors', '.stats-end'] },
  { path: '/lab', ready: '.player-lab', rails: [rail('.player-lab-header'), rail('.lab-tool-picker'), rail('.line-season-workspace')], bands: ['.player-lab-header', '.lab-tool-picker', '.line-season-workspace'] },
  { path: '/lab?tool=comparison', ready: '.comparison-lab', rails: [rail('.player-lab-header'), rail('.lab-tool-picker'), rail('.lab-header'), rail('.lab-matchup-setup'), rail('.lab-analysis-display')], bands: ['.player-lab-header', '.lab-tool-picker', '.comparison-lab'] },
  { path: '/records', ready: '.records-redesign .record', rails: [rail('.records-redesign .hero > div:first-child', 'left'), rail('.records-redesign .team-monuments'), rail('.records-redesign .spotlights'), rail('.records-redesign .pm-records'), rail('.records-redesign .season-hall'), rail('.records-redesign .explorer'), rail('.records-redesign .roadmap')], bands: ['.records-redesign .hero', '.records-redesign .team-monuments', '.records-redesign .explorer', '.records-redesign .roadmap'] },
  { path: '/gallery', ready: '.hockey-page-container', rails: [rail('.hockey-page-container')], bands: ['main > .min-h-screen', 'main > .min-h-screen > .relative.pt-24'] },
  { path: '/highlights', ready: '.highlights-edition', rails: [rail('.film-inner')], bands: ['.film-hero', '.film-index', '.film-player', '.film-outro'] },
  { path: '/news', ready: '.news-index', rails: [rail('.news-masthead'), rail('.news-tools'), rail('.news-results-heading'), rail('.news-frontpage,.news-empty'), rail('.news-end')], bands: ['.news-masthead', '.news-stories', '.news-end'] },
  { path: '/awards', ready: '.awards-page', rails: [rail('.awards-page .new-section')], bands: ['.awards-page .new-section'] },
  { path: '/news/bardownski-2027-reveal', ready: '.hockey-article', rails: [rail('.hockey-article > :is(.site-content-container,.max-w-3xl)'), rail('.hockey-article .space-y-6', 'reading', 700)], reading: '.hockey-article .space-y-6 > p, .hockey-article .reveal-resources > p', bands: ['.hockey-article'] },
  { path: '/fc', ready: 'main h1', rails: [rail('main > div > section > :is(.site-content-container,.max-w-7xl)'), rail(fcRail), rail('main > div > .border-y > :is(.site-content-container,.max-w-7xl)')], bands: ['main > div > section', 'main > div > .border-y'] },
  ...['fixtures', 'squad', 'stats', 'records', 'gallery', 'highlights', 'news'].map(name => ({ path: `/fc/${name}`, ready: 'main h1', rails: [rail(fcRail)], bands: ['main > div'] })),
];

export function expectedGeometry(width, max = 1280) {
  const gutter = width <= 600 ? 20 : width <= 1024 ? 24 : 32;
  const contentWidth = Math.min(max, width - 2 * gutter);
  return { gutter, contentWidth, left: (width - contentWidth) / 2, right: (width + contentWidth) / 2 };
}
export function checkRail(measurement, viewportWidth, layoutWidth, spec, tolerance = 2) {
  const expected = expectedGeometry(viewportWidth, spec.max);
  const contentWidth = Math.min(spec.max, layoutWidth - 2 * expected.gutter);
  const left = (layoutWidth - contentWidth) / 2;
  const right = layoutWidth - left;
  const failures = [];
  if (measurement.contentWidth > spec.max + tolerance) failures.push(`content ${measurement.contentWidth.toFixed(1)}px exceeds ${spec.max}px`);
  if (measurement.contentLeft < -tolerance || measurement.contentRight > layoutWidth + tolerance) failures.push(`content outside document viewport (${measurement.contentLeft.toFixed(1)}..${measurement.contentRight.toFixed(1)} / ${layoutWidth}px)`);
  if (spec.alignment !== 'none' && Math.abs(measurement.contentLeft - left) > tolerance) failures.push(`left rail ${measurement.contentLeft.toFixed(1)}px; expected ${left.toFixed(1)}px`);
  if (['both', 'reading'].includes(spec.alignment) && Math.abs(measurement.contentRight - right) > tolerance) failures.push(`right rail ${measurement.contentRight.toFixed(1)}px; expected ${right.toFixed(1)}px`);
  return failures;
}

// Executed in the page, not against source strings. Sections with full-bleed
// paint can define their rail through padding OR an explicit direct container.
export function measurePage(config) {
  const number = value => parseFloat(value) || 0;
  const visible = element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== 'hidden';
  const describe = element => `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${typeof element.className === 'string' ? '.' + element.className.trim().replace(/\s+/g, '.') : ''}`.slice(0,220);
  const box = element => {
    const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
    const left = rect.left + number(css.borderLeftWidth) + number(css.paddingLeft);
    const right = rect.right - number(css.borderRightWidth) - number(css.paddingRight);
    return { element: describe(element), left: rect.left, right: rect.right, width: rect.width, paddingLeft: number(css.paddingLeft), paddingRight: number(css.paddingRight), contentLeft: left, contentRight: right, contentWidth: right-left, boxSizing: css.boxSizing };
  };
  const rails = config.rails.map(spec => ({ ...spec, nodes: [...document.querySelectorAll(spec.selector)].filter(visible).map(element => box(element.querySelector(':scope > .site-content-container') || element)) }));
  const bands = config.bands.map(selector => ({ selector, nodes: [...document.querySelectorAll(selector)].filter(visible).map(box) }));
  const reading = config.reading ? [...document.querySelectorAll(config.reading)].filter(visible).map(box) : [];
  const viewportWidth = innerWidth;
  // scrollbar-gutter:stable reserves space even in headless Chromium. Measure
  // the actual layout canvas instead of incorrectly flagging that gutter.
  const layoutWidth = document.body.getBoundingClientRect().width;
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const overflow = [];
  for (const element of document.querySelectorAll('main *, .legacy-site-header *')) {
    if (!visible(element) || element.closest('dialog,[role="dialog"],[aria-hidden="true"]')) continue;
    const css = getComputedStyle(element);
    if (css.position === 'fixed' || css.position === 'absolute' || css.pointerEvents === 'none') continue;
    const rect = element.getBoundingClientRect();
    if (rect.left >= -2 && rect.right <= layoutWidth + 2) continue;
    // Local scrollports and clipped gallery/carousel children are not document
    // overflow. Root scrollWidth is still always checked, with no exceptions.
    let clipped = false;
    for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(ancestor).overflowX)) { clipped = true; break; }
    }
    if (!clipped) overflow.push(box(element));
    if (overflow.length >= 12) break;
  }
  const nav = [...document.querySelectorAll('.legacy-nav-brand,.legacy-nav-toggle,.legacy-site-links,.legacy-subnav nav')].filter(visible).map(element => ({ ...box(element), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, localScroller: /auto|scroll/.test(getComputedStyle(element).overflowX) }));
  const typography = [...document.querySelectorAll('main h1,main h2')].filter(visible).map(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const clips = [];
    for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const css = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
      if (/hidden|clip/.test(css.overflowX) && (text.left < rect.left - 3 || text.right > rect.right + 3)) clips.push(describe(ancestor));
      if (/auto|scroll/.test(css.overflowX)) break;
    }
    return { element: describe(element), text: element.textContent.trim().slice(0,100), fontSize: getComputedStyle(element).fontSize, textLeft: text.left, textRight: text.right, clips };
  });
  const overlays = [];
  function scan(root) {
    for (const element of root.querySelectorAll('*')) {
      if (element.matches('[data-nextjs-dialog-overlay],[data-nextjs-error-overlay],[data-nextjs-dialog],[data-next-badge][data-error="true"]') && visible(element)) overlays.push(describe(element));
      if (element.shadowRoot) scan(element.shadowRoot);
    }
  }
  scan(document);
  const css = getComputedStyle(document.documentElement);
  return { viewportWidth, layoutWidth, documentWidth, rails, bands, reading, overflow, nav, overlays, typography, title: document.title, tokens: Object.fromEntries(['--site-content-max','--site-gutter','--site-reading-max'].map(name => [name, css.getPropertyValue(name).trim()])) };
}

export async function run() {
  const started = Date.now();
  const deadline = started + Number(process.env.SITE_WIDTH_SECONDS || 450) * 1000;
  const out = process.env.SITE_WIDTH_OUT || '/tmp/site-widths';
  await mkdir(out, { recursive: true });
  const playwrightModule = process.env.PLAYWRIGHT_MODULE || '/tmp/shot/node_modules/playwright-core/index.mjs';
  const { chromium } = await import(playwrightModule);
  const base = process.env.SITE_URL || 'http://localhost:3000';
  const widths = (process.env.SITE_WIDTHS || '2560,1920,768,390,320').split(',').map(Number);
  if (widths.some(width => !Number.isFinite(width) || width < 1)) throw new Error('SITE_WIDTHS must contain positive numeric widths');
  const requested = process.env.SITE_WIDTH_ROUTES?.split(',');
  const routes = routeInventory.filter(route => !requested || requested.includes(route.path));
  if (!routes.length) throw new Error('No inventory routes selected; check SITE_WIDTH_ROUTES');
  const concurrency = Number(process.env.SITE_WIDTH_CONCURRENCY || 2);
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('SITE_WIDTH_CONCURRENCY must be a positive integer');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/home/ryder/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
  const report = { startedAt: new Date().toISOString(), base, inventory: routes, results: [], failures: [], warnings: [], screenshots: [] };
  let index = 0;
  const fail = (route, width, selector, message) => report.failures.push({ route, width, selector, message });
  try {
    // Discover a real article rather than assuming a fabricated ID will render.
    if (!requested || requested.some(path => path.startsWith('/fc/news'))) {
      const discovery = await browser.newPage();
      try {
        await discovery.goto(`${base}/fc/news`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const href = process.env.FC_ARTICLE_PATH || await discovery.locator('main a[href^="/fc/news/"]').first().getAttribute('href', { timeout: 1500 }).catch(() => null);
        if (href) routes.push({ path: href, ready: 'main h1', rails: [rail(fcRail), rail('main .fc-article-body', 'reading', 700)], reading: 'main .fc-article-body > p', bands: ['main > div'] });
        else report.warnings.push('FC article NOT VERIFIED: live /fc/news has no article links. Supply FC_ARTICLE_PATH when data is available.');
      } catch (error) { report.warnings.push(`FC article discovery unavailable: ${error.message}`); }
      finally { await discovery.close(); }
    }
    await Promise.all(Array.from({ length: Math.min(routes.length, concurrency) }, async () => {
      const page = await browser.newPage({ viewport: { width: widths[0], height: 1000 }, reducedMotion: 'reduce' });
      let errors = [];
      page.on('pageerror', error => errors.push(error.message));
      while (index < routes.length) {
        const route = routes[index++];
        if (Date.now() > deadline) { fail(route.path, null, 'audit', 'Time budget exceeded; route NOT VERIFIED'); continue; }
        errors = [];
        try {
          await page.setViewportSize({ width: widths[0], height: 1000 });
          const response = await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
          if (!response?.ok()) fail(route.path, widths[0], 'HTTP', `Response ${response?.status()}`);
          await page.locator(route.ready).first().waitFor({ state: 'attached', timeout: 20000 });
          await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 5000))]));
          await page.waitForTimeout(700);
          for (const width of widths) {
            if (Date.now() > deadline) { fail(route.path, width, 'audit', 'Time budget exceeded; remaining widths NOT VERIFIED'); break; }
            await page.setViewportSize({ width, height: 1000 });
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.waitForTimeout(180);
            const config = { ...route, rails: [...route.rails, rail('.legacy-nav-inner'), rail('.legacy-subnav'), ...(route.path === '/' ? [] : [rail('footer > .site-content-container')])] };
            const measurement = await page.evaluate(measurePage, config);
            report.results.push({ route: route.path, width, ...measurement });
            for (const [name, value] of Object.entries({ '--site-content-max': '1280px', '--site-reading-max': '700px', '--site-gutter': `${expectedGeometry(width).gutter}px` })) {
              if (measurement.tokens[name] !== value) fail(route.path, width, ':root', `${name}=${measurement.tokens[name] || '(missing)'}; expected ${value}`);
            }
            if (measurement.documentWidth > width + 2) fail(route.path, width, 'document', `scrollWidth ${measurement.documentWidth}px exceeds viewport ${width}px`);
            for (const spec of measurement.rails) {
              if (!spec.nodes.length) fail(route.path, width, spec.selector, 'Required foreground selector missing/hidden');
              for (const node of spec.nodes) for (const message of checkRail(node, width, measurement.layoutWidth, spec)) fail(route.path, width, `${spec.selector} (${node.element})`, message);
            }
            for (const band of measurement.bands) {
              if (!band.nodes.length) fail(route.path, width, band.selector, 'Required full-bleed band missing/hidden');
              for (const node of band.nodes) if (Math.abs(node.left) > 2 || Math.abs(node.right - measurement.layoutWidth) > 2) fail(route.path, width, band.selector, `Band ${node.left.toFixed(1)}..${node.right.toFixed(1)}px; expected 0..${measurement.layoutWidth}px`);
            }
            if (route.reading && !measurement.reading.length) fail(route.path, width, route.reading, 'Required article text missing');
            for (const paragraph of measurement.reading) if (paragraph.contentWidth > 702) fail(route.path, width, paragraph.element, `Article text ${paragraph.contentWidth.toFixed(1)}px exceeds 700px`);
            for (const node of measurement.nav) {
              if (node.left < -2 || node.right > measurement.layoutWidth + 2) fail(route.path, width, node.element, 'Navigation box outside viewport');
              if (!node.localScroller && node.scrollWidth > node.clientWidth + 2) fail(route.path, width, node.element, `Navigation clips/overflows by ${node.scrollWidth - node.clientWidth}px`);
            }
            for (const heading of measurement.typography) if (heading.clips.length) fail(route.path, width, heading.element, `Heading text clipped by ${heading.clips.join(', ')} (${heading.fontSize})`);
            for (const overlay of measurement.overlays) fail(route.path, width, overlay, 'Visible Next.js error overlay/toast');
            // Exercise only shared responsive navigation, not broad UI flows.
            const toggle = page.locator('.legacy-nav-toggle');
            if (await toggle.isVisible()) {
              await toggle.click();
              const menu = await page.locator('.legacy-site-links').evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, right: element.getBoundingClientRect().right, left: element.getBoundingClientRect().left, documentWidth: document.documentElement.scrollWidth }));
              if (menu.scrollWidth > menu.width + 2 || menu.right > measurement.layoutWidth + 2 || menu.left < -2 || menu.documentWidth > width + 2) fail(route.path, width, '.legacy-site-links.open', `Open navigation overflow: ${JSON.stringify(menu)}`);
              await page.keyboard.press('Escape');
            }
            if (width === widths[0] || width === 390 || process.env.SITE_WIDTH_SCREENSHOTS === 'all') {
              const path = `${out}/${route.path === '/' ? 'home' : route.path.slice(1).replaceAll('/', '-')}-${width}.png`;
              await page.screenshot({ path, fullPage: true, animations: 'disabled', timeout: 20000 });
              report.screenshots.push(path);
            }
            const count = report.failures.filter(failure => failure.route === route.path && failure.width === width).length;
            console.log(`${route.path} @ ${width}: ${count ? `${count} failures` : 'PASS'}; canvas=${measurement.layoutWidth}, document=${measurement.documentWidth}`);
          }
          for (const error of [...new Set(errors)]) fail(route.path, null, 'pageerror', error);
        } catch (error) { fail(route.path, null, 'audit', error.message); console.error(`${route.path}: ${error.message}`); }
      }
      await page.close();
    }));
  } finally {
    await browser.close();
    report.durationSeconds = (Date.now() - started) / 1000;
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
    const lines = report.failures.map(failure => `${failure.route} @ ${failure.width ?? '?'} ${failure.selector}: ${failure.message}`);
    await writeFile(`${out}/failures.txt`, [...report.warnings, ...lines].join('\n') + '\n');
    console.log(`\n${report.results.length} route/viewport measurements; ${report.failures.length} failures. ${out}/report.json`);
    for (const warning of report.warnings) console.warn(warning);
    if (report.failures.length && !process.argv.includes('--baseline')) process.exitCode = 1;
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => { console.error(error); process.exitCode = 1; });
}
