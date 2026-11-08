import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { articleEmail, confirmEmail, mvpEmail, MVP_COOLDOWN_MS, MVP_HOLD_MS, nextMvpState, normalizeEmail, parseTopics, potwEmail, potwLine, sendEmails, teaser } from "../src/lib/notify";
import { POST as subscribe } from "../src/app/api/subscribe/route";
import { POST as unsubscribe } from "../src/app/api/subscribe/unsubscribe/route";

test("emails and topics are validated", () => {
  assert.equal(normalizeEmail("  Matt@Example.COM "), "matt@example.com");
  for (const bad of ["", "nope", "a@b", "a b@c.com", "<x>@y.com", 42, null]) assert.equal(normalizeEmail(bad), null);
  assert.deepEqual(parseTopics(["records", "mvp", "potw", "articles", "spam"]), ["articles", "potw", "mvp", "records"]);
  assert.deepEqual(parseTopics("potw"), ["potw"]);
  assert.deepEqual(parseTopics(undefined), []);
});

test("article email escapes content, links the article and offers unsubscribe", () => {
  process.env.SITE_URL = "https://example.test";
  const e = articleEmail("a@b.co", { id: "x y", title: "<Big> Win & More", summary: "First para.\n\nSecond para." }, "tok");
  assert.equal(e.subject, "<Big> Win & More");
  assert.match(e.html, /&lt;Big&gt; Win &amp; More/);
  assert.doesNotMatch(e.html, /<Big>/);
  assert.match(e.html, /https:\/\/example\.test\/news\/x%20y/);
  assert.match(e.html, /subscribe\?unsubscribe=tok/);
  assert.doesNotMatch(e.text, /Second para/);
  assert.equal(e.unsubscribeToken, "tok");
  assert.equal(confirmEmail("a@b.co", "https://c").unsubscribeToken, undefined);
});

test("teaser trims long first paragraphs at a word boundary", () => {
  const t = teaser("word ".repeat(100), 50);
  assert.ok(t.length <= 51 && t.endsWith("…") && !t.includes("  "));
});

test("POTW lines read naturally for skaters and goalies", () => {
  assert.equal(potwLine({ name: "x", position: "F", games: 11, goals: 28, points: 50 }), "28 goals and 50 points in 11 games");
  assert.equal(potwLine({ name: "x", position: "G", games: 54, saves: 707, shotsAgainst: 909 }), "707 saves on 909 shots (77.8%) in 54 games");
  assert.equal(potwEmail("a@b.co", [{ display: "A", line: "l" }, { display: "B", line: "m" }], "t").subject, "Player of the Week: A & B");
});

test("sendEmails batches by 100, adds one-click unsubscribe headers and surfaces failures", async () => {
  process.env.RESEND_API_KEY = "k"; process.env.NOTIFY_FROM = "Club <n@example.test>";
  const calls: { url: string; body: unknown }[] = [];
  const fake = (async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); return new Response("{}"); }) as unknown as typeof fetch;
  const emails = Array.from({ length: 150 }, (_, i) => articleEmail(`u${i}@x.co`, { id: "1", title: "T", summary: "S" }, `t${i}`));
  assert.equal(await sendEmails(emails, fake), 150);
  assert.deepEqual(calls.map(c => [c.url, (c.body as unknown[]).length]), [["https://api.resend.com/emails/batch", 100], ["https://api.resend.com/emails/batch", 50]]);
  const first = (calls[0].body as { headers: Record<string, string>; to: string[] }[])[0];
  assert.deepEqual(first.to, ["u0@x.co"]);
  assert.match(first.headers["List-Unsubscribe"], /api\/subscribe\/unsubscribe\?token=t0/);
  assert.equal(first.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  await assert.rejects(sendEmails(emails.slice(0, 1), (async () => new Response("bad", { status: 422 })) as unknown as typeof fetch), /Resend 422/);
  delete process.env.RESEND_API_KEY;
  await assert.rejects(sendEmails(emails.slice(0, 1), fake), /not configured/);
});

test("subscribe API rejects bad input before touching storage", async () => {
  const post = (body: unknown) => subscribe(new NextRequest("http://localhost/api/subscribe", { method: "POST", body: JSON.stringify(body) }));
  assert.equal((await post({ email: "bad", topics: ["potw"] })).status, 400);
  assert.equal((await post({ email: "a@b.co", topics: [] })).status, 400);
  assert.deepEqual(await (await post({ email: "a@b.co", topics: ["potw"], website: "bot" })).json(), { ok: true });
  const saved = process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_URL;
  try { assert.equal((await post({ email: "a@b.co", topics: ["potw"] })).status, 503); }
  finally { if (saved !== undefined) process.env.UPSTASH_REDIS_REST_URL = saved; }
});

test("unsubscribe is POST-only and fails closed without a token", async () => {
  const saved = process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_URL;
  try {
    const res = await unsubscribe(new NextRequest("http://localhost/api/subscribe/unsubscribe?token=x", { method: "POST", body: "List-Unsubscribe=One-Click", headers: { "content-type": "application/x-www-form-urlencoded" } }));
    assert.deepEqual(await res.json(), { ok: false });
  } finally { if (saved !== undefined) process.env.UPSTASH_REDIS_REST_URL = saved; }
});

test("MVP lead change emails need a held lead and respect the daily cooldown", () => {
  const t0 = Date.parse("2026-11-08T00:00:00Z"), h = 3600_000;
  let r = nextMvpState(null, "DYLAN", t0);
  assert.deepEqual(r, { state: { announced: "DYLAN" }, send: false }, "first run seeds silently");
  assert.equal(nextMvpState(r.state, null, t0).send, false, "tied board does nothing");
  r = nextMvpState(r.state, "RYDER", t0 + h);
  assert.equal(r.send, false); assert.equal(r.state!.candidate, "RYDER");
  // Flip back before the hold ends: candidate cleared, no email.
  const back = nextMvpState(r.state, "DYLAN", t0 + 2 * h);
  assert.deepEqual(back, { state: { announced: "DYLAN", lastSentAt: undefined }, send: false });
  assert.equal(nextMvpState(r.state, "RYDER", t0 + h + MVP_HOLD_MS - 1).send, false, "hold not met");
  r = nextMvpState(r.state, "RYDER", t0 + h + MVP_HOLD_MS);
  assert.equal(r.send, true); assert.equal(r.state!.announced, "RYDER");
  // Another change the same day waits for the cooldown even once held.
  const s = nextMvpState(r.state, "MATT", t0 + 8 * h).state;
  assert.equal(nextMvpState(s, "MATT", t0 + 8 * h + MVP_HOLD_MS).send, false);
  const later = nextMvpState(s, "MATT", t0 + h + MVP_HOLD_MS + MVP_COOLDOWN_MS);
  assert.equal(later.send, true); assert.equal(later.state!.announced, "MATT");
});

test("MVP email names the new leader and the top of the board", () => {
  const e = mvpEmail("a@b.co", "Xavier Laflamme", "JRT IV", [{ display: "Xavier Laflamme", odds: "+262", chance: 0.276 }, { display: "JRT IV", odds: "+263", chance: 0.275 }], "t");
  assert.equal(e.subject, "MVP race: Xavier Laflamme takes the lead");
  assert.match(e.text, /taken first place in the MVP race from JRT IV/);
  assert.match(e.text, /1\. Xavier Laflamme: \+262 \(27\.6%\)\n2\. JRT IV/);
});

test("record breaks: strictly beaten, current season only, ratcheting bests, silent seeding", async () => {
  const { recordBreaks, recordsEmail, personName } = await import("../src/lib/notify");
  const game = (season: string, opponent = "Bar Chez Stan") => ({ id: "1", date: "October 25, 2026", opponent, scoreUs: 10, scoreThem: 7, season, href: "/m" });
  const perf = (name: string, number: number, season: string) => ({ name, position: "LW", number, season, game: game(season) });
  const data = (assists: number, season = "2026", pm = 3) => ({
    currentSeasonKey: "2026", currentSeasonLabel: "2026–2027", seasons: [], gameCount: 1, liveMembers: [], syncedAt: null,
    playerGames: [
      { id: "game-assists", title: "Most assists in one game", category: "", unit: "" as const, tags: "", rule: "", ranking: [perf("WOLFGANG MOZART", assists, season)], previous: [] },
      { id: "game-pm", title: "Best plus/minus in one game", category: "", unit: "signed" as const, tags: "", rule: "", ranking: [perf("TOP G", pm, "2026")], previous: [] },
    ],
    team: { goals: { value: 20, games: [game("2025")] }, margin: { value: 17, games: [game("2025")] }, shots: { value: 38, games: [game("2025")] }, streaks: [] },
  });
  const seeded = recordBreaks(data(7), {});
  assert.deepEqual(seeded.breaks, [], "first sight seeds silently");
  assert.deepEqual(recordBreaks(data(7), seeded.next).breaks, [], "tie is not a break");
  assert.deepEqual(recordBreaks(data(9, "2025"), seeded.next).breaks, [], "archive changes don't count");
  const { breaks, next } = recordBreaks(data(8, "2026", 5), seeded.next);
  assert.deepEqual(breaks.map(b => [b.id, b.value, b.previous, b.holder]), [["game-assists", 8, 7, "Wolfgang Mozart"], ["game-pm", 5, 3, "Top G"]]);
  // A partial read showing lower values must not lower the stored best.
  assert.equal(recordBreaks(data(2), next).next["game-assists"], 8);
  const e = recordsEmail("a@b.co", breaks, "t");
  assert.equal(e.subject, "2 club records just fell");
  assert.match(e.text, /Most assists in one game: 8 by Wolfgang Mozart vs Bar Chez Stan on October 25, 2026 \(old record 7\)\./);
  assert.match(e.text, /plus\/minus in one game: \+5 by Top G/);
  assert.equal(recordsEmail("a@b.co", breaks.slice(0, 1), "t").subject, "New club record: Most assists in one game");
  assert.equal(personName("RYDER"), "Jene Rene Tetreau IV");
});
