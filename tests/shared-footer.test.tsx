import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import Footer from "../src/components/layout/Footer";
import FcFooter from "../src/components/layout/FcFooter";
import {renderHome} from "../src/components/homepage/views";

test("all pages share one footer with the requested club links and copy",()=>{
 const markup=renderToStaticMarkup(createElement(Footer));
 for(const text of ['BARDOWNSKI','Official website of Bardownski Hockey Club. Based in Newfoundland.','Team','Community','Connect','Roster','Stats','2025–2026 Awards','Records','Gallery','News','Discord','Bardownski FC','All rights reserved.'])assert.ok(markup.includes(text),text);
 for(const path of ['/roster','/stats','/awards','/records','/gallery','/news','/fc'])assert.ok(markup.includes(`href="${path}"`));
 assert.doesNotMatch(markup,/href="#"/,'Do not include placeholder social links');
 assert.equal((markup.match(/<footer/g)||[]).length,1);
 assert.doesNotMatch(renderHome(),/<footer/,'Homepage does not duplicate the shell footer');
 const shell=readFileSync('src/components/layout/SiteFooter.tsx','utf8');
 assert.doesNotMatch(shell,/return null/);
 assert.match(shell,/<FcFooter/);
 assert.match(shell,/<Footer tone=/);
 assert.match(markup,/aria-label="Twitter \(link unavailable\)"/);
});

test("home footer changes palette only, not its structure or sizing",()=>{
 const dark=renderToStaticMarkup(createElement(Footer,{tone:'dark'}));
 const light=renderToStaticMarkup(createElement(Footer,{tone:'lavender'}));
 assert.equal(dark.replace('shared-site-footer--dark','shared-site-footer--lavender'),light);
 const css=readFileSync('src/components/layout/shared-footer.css','utf8');
 const palette=css.match(/\.shared-site-footer--lavender\s*\{([^}]+)\}/)?.[1]||'';
 assert.match(palette,/--footer-bg: #e7ddec/);
 assert.doesNotMatch(palette,/padding|margin|width|height|font|display/);
 assert.match(css,/grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
});


test("existing page endings are preserved above the shared footer",()=>{
 const home=renderHome();
 assert.match(home,/<div class="site-footer home-signoff club-mark-panel"/);
 assert.match(home,/<a class="footer-wordmark" href="\/">BARDOWNSKI<span>®<\/span><\/a>/);
 for(const text of ["Bardownski Hockey Club · Newfoundland · Established 2020.","The club ↗","News ↗","Highlights ↗","2026–2027 SEASON"])assert.ok(home.includes(text),text);
 assert.ok(home.indexOf('id="scrapbook"')<home.indexOf('class="site-footer home-signoff'));
 const fc=renderToStaticMarkup(createElement(FcFooter));
 assert.match(fc,/Official website of Bardownski FC\. EA FC 26 Pro Clubs\./);
 for(const path of ['/fc/squad','/fc/fixtures','/fc/stats','/fc/records','/fc/news','/fc/gallery','/fc/highlights','/'])assert.ok(fc.includes(`href="${path}"`),path);
 assert.match(fc,/Fixtures &amp; Results/);
 assert.match(fc,/The Family/);
 assert.match(fc,/Bardownski FC\. All rights reserved\./);
 assert.doesNotMatch(fc,/<footer/,'The shared footer remains the single contentinfo landmark');
});
