import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import postcss from "postcss";
import { MONOCHROME_POSTERS, getMonochromePoster } from "../src/lib/photo-posters";

test("shared image rule survives page filters without desaturating containers or brand marks", () => {
  const css = postcss.parse(readFileSync("src/app/globals.css", "utf8"));
  let found = false;
  css.walkRules(".site-main img:not([data-brand-mark])", rule => {
    rule.walkDecls("filter", declaration => {
      assert.equal(declaration.value, "grayscale(1)");
      assert.equal(declaration.important, true);
      found = true;
    });
  });
  assert.equal(found, true);
  assert.match(readFileSync("src/app/layout.tsx", "utf8"), /<main className="site-main">\{children\}/);
  const home = readFileSync("src/components/homepage/production.css", "utf8");
  assert.doesNotMatch(home, /cinema-backdrop img\s*\{\s*filter:\s*none/);
});

test("native poster and CSS-background copies are truly grayscale at original dimensions", async () => {
  const outputs = {...MONOCHROME_POSTERS, "/images/team pic.png": "/images/monochrome/team-overhead.webp"};
  for (const [source, target] of Object.entries(outputs)) {
    const original = await sharp(`public${source}`).metadata();
    const {data,info} = await sharp(`public${target}`).removeAlpha().toColourspace("srgb").raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width, original.width, target);
    assert.equal(info.height, original.height, target);
    for(let pixel=0;pixel<data.length;pixel+=info.channels){
      assert.equal(data[pixel],data[pixel+1],target);
      assert.equal(data[pixel],data[pixel+2],target);
    }
  }
});

test("native poster URLs resolve to display copies without changing video URLs", () => {
  for (const [source,target] of Object.entries(MONOCHROME_POSTERS)) assert.equal(getMonochromePoster(source),target);
  assert.equal(getMonochromePoster(undefined),undefined);
  assert.equal(getMonochromePoster("/unknown.webp"),"/unknown.webp");
  for(const file of ["src/app/news/ArticleVideo.tsx","src/components/season/Announcement.tsx","src/app/highlights/HighlightsClient.tsx","src/app/fc/highlights/HighlightsClient.tsx","src/components/homepage/interactions.js"]){
    assert.match(readFileSync(file,"utf8"),/poster=[^\n]*getMonochromePoster/);
  }
  const records = readFileSync("src/app/records/redesign/records.css","utf8");
  assert.match(records,/url\('\/images\/monochrome\/team-overhead\.webp'\)/);
  assert.doesNotMatch(records,/url\('\/images\/team%20pic\.png'\)/);
});
