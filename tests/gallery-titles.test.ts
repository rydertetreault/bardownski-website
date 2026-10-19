import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/gallery/page.tsx", "utf8");
const photos = page.slice(page.indexOf("const photos"), page.indexOf("const videos"));
const videos = page.slice(page.indexOf("const videos"), page.indexOf("export default"));
const titles = [...photos.matchAll(/title: "([^"]*)"/g)].map(m => m[1]);
const alts = [...photos.matchAll(/alt: "([^"]*)"/g)].map(m => m[1]);
const labels = [...videos.matchAll(/label: "([^"]*)"/g)].map(m => m[1]);
const COLOURS = /\b(red|blue|white|whites|black|pink|teal|purple|navy|gold|green|orange|off-white)\b/i;

test("gallery photo titles and video labels are unique", () => {
  assert.ok(titles.length > 0 && labels.length > 0);
  assert.deepEqual(titles.filter((t, i) => titles.indexOf(t) !== i), [], "duplicate photo titles");
  assert.deepEqual(labels.filter((l, i) => labels.indexOf(l) !== i), [], "duplicate video labels");
});

test("gallery text never describes colours", () => {
  for (const text of [...titles, ...alts, ...labels]) assert.doesNotMatch(text, COLOURS, text);
});
