import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { players } from "../src/app/highlights/highlights-data";

const originalSources = [
  "https://youtu.be/aGrVfM6HsO0", "/videos/Ryder1.mp4", "/videos/Ryder2.mp4", "/videos/ryder3.mp4",
  "/videos/Dylan1.mp4", "/videos/Dylan2.mp4", "/videos/dylan - 2026.mp4",
  "/videos/GottaBe - Trap Edition.mp4", "/videos/Kaden1.mp4", "/videos/Slobby Robby 2026.mp4",
  ...Array.from({ length: 7 }, (_, index) => `/videos/matt${index + 1}.mp4`),
];

test("the film room preserves all five player collections and 17 original clips", () => {
  assert.deepEqual(players.map(player => player.id), ["ryder", "dylan", "kaden", "slobby-robby", "matt"]);
  const clips = players.flatMap(player => player.clips);
  assert.equal(clips.length, 17);
  assert.equal(new Set(clips.map(clip => clip.id)).size, 17);
  assert.deepEqual(clips.map(clip => clip.src), originalSources);
  for (const player of players) {
    assert.ok(player.role && player.statement && player.theme);
    for (const clip of player.clips) {
      if (clip.src.startsWith("/")) assert.ok(existsSync(`public${clip.src}`), clip.src);
      assert.match(clip.poster, /^\/images\/highlights\/[a-z0-9]+\.webp$/);
      assert.ok(statSync(`public${clip.poster}`).size > 1000, clip.poster);
      const header = readFileSync(`public${clip.poster}`).subarray(0, 12);
      assert.equal(header.toString("ascii", 8, 12), "WEBP");
    }
  }
});

test("playback is explicit, with direct-source fallbacks and a labeled native dialog", () => {
  const client = readFileSync("src/app/highlights/HighlightsClient.tsx", "utf8");
  const page = readFileSync("src/app/highlights/page.tsx", "utf8");
  assert.match(client, /<dialog[^]*?aria-labelledby="film-dialog-title"/);
  assert.match(client, /node\.showModal\(\)/);
  assert.match(client, /opener\.focus\(\{ preventScroll: true \}\)/);
  assert.match(client, /activeClip && <VideoModal/);
  assert.match(client, /href=\{clip\.src\}/);
  assert.match(client, /href=\{selected\.src\}/);
  assert.match(client, /youtube-nocookie\.com/);
  assert.doesNotMatch(client, /ThumbnailVideo|onMouseEnter|IntersectionObserver|<video[^>]*loop/);
  assert.doesNotMatch(page, /<video|<iframe|offseason-highlights/);
});

test("news polish leaves the lead, dispatch and compact feed in their established order", () => {
  const news = readFileSync("src/app/news/NewsClient.tsx", "utf8");
  const lead = news.indexOf('className="news-lead"');
  const dispatch = news.indexOf('className="news-dispatch"');
  const feed = news.indexOf('className="news-story-layout"');
  assert.ok(lead > 0 && dispatch > lead && feed > dispatch);
  assert.match(news, /Filter stories by category/);
  assert.match(news, /type="search"/);
  assert.match(news, /rest\.slice\(0,limit\)/);
  assert.match(news, /setLimit\(n => n \+ 8\)/);
  assert.match(news, /Follow the current season/);
});
