import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {articles} from "../src/lib/news";
import {SEASON_REVEAL} from "../src/lib/season-reveal";
import {featureArticles} from "../src/lib/featured-news";
import {renderHome} from "../src/components/homepage/views";
import {FROZEN_CHELSTATS} from "../src/lib/chelstats-frozen";
import transcript from "../src/lib/season-reveal-transcript.json";

test("exact approved film, poster and valid timed captions are published",()=>{
  const bytes=readFileSync(`public${SEASON_REVEAL.videoSrc}`);
  assert.equal(bytes.length,63746155);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),"6f6d1f0d753ec369ca0a24635b0f7e1bf7c4fb465bc7311fc016b58c308f5570");
  assert.ok(statSync(`public${SEASON_REVEAL.poster}`).size>1000);
  // Original fast-start MP4 is preserved; no recompression or altered narration.
  assert.equal(bytes.toString("ascii",36,40),"moov");
  const vtt=readFileSync(`public${SEASON_REVEAL.captionsSrc}`,"utf8");assert.ok(vtt.startsWith("WEBVTT"));
  const time=(value:string)=>value.split(":").reduce((total,part)=>total*60+Number(part),0);
  let end=0,count=0;
  for(const match of vtt.matchAll(/(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})/g)){
    const start=time(match[1]),next=time(match[2]);assert.ok(start>=end&&next>start);assert.ok(next<=SEASON_REVEAL.durationSeconds+.01);end=next;count++;
  }
  assert.ok(count>=35);assert.match(vtt,/Xavier Laflamme/);assert.match(vtt,/Matt Hut/);
  assert.match(transcript.map(item=>item.text).join(" "),/307 games/);
  assert.equal(FROZEN_CHELSTATS.clubStats.totalGames,366,"Spoken film discrepancy must not rewrite verified archive");
});

test("announcement remains explicitly featured without editing dates or duplicating articles",()=>{
  const reveal=articles.find(article=>article.id===SEASON_REVEAL.articleId)!;assert.ok(reveal);
  assert.equal(reveal.featured,true);assert.equal(reveal.video,SEASON_REVEAL.videoSrc);assert.equal(reveal.captions,SEASON_REVEAL.captionsSrc);
  assert.equal(reveal.summary.split("\n\n").length,6);
  assert.match(reveal.summary,/Xavier Laflamme/);assert.match(reveal.summary,/Matt Hut/);assert.doesNotMatch(reveal.summary,/307/);
  const later={id:"later",featured:false};const list=[later,reveal,reveal];const before=[...list];
  assert.deepEqual(featureArticles(list).map(item=>item.id),[reveal.id,later.id]);assert.deepEqual(list,before);
  assert.deepEqual(featureArticles([]),[]);
  const markup=renderHome(featureArticles(articles).slice(0,3));
  assert.match(markup,/data-video="reveal"/);assert.match(markup,/WATCH THE REVEAL/);
  assert.match(markup,new RegExp(`class="news-item featured-news"[^]*?/news/${reveal.id}`));
  assert.ok(markup.includes(SEASON_REVEAL.poster));assert.ok(!markup.includes("<video"),"No eager homepage video download");
});

test("only confirmed current captain and assistant are announced",()=>{
  assert.equal(SEASON_REVEAL.leadership.captain.name,"Xavier Laflamme");
  assert.equal(SEASON_REVEAL.leadership.assistants.length,1);
  assert.equal(SEASON_REVEAL.leadership.assistants[0].name,"Matt Hut");
  const roster=readFileSync("src/app/roster/page.tsx","utf8");
  assert.doesNotMatch(roster,/No selections announced yet|Leadership pending|To be announced\./);
  assert.match(roster,/2025–2026 totals/);
});
