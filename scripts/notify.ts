// Emails subscribers about new articles and Player of the Week winners. Runs after each
// tracker sync in GitHub Actions. Each item is sent at most once (claimed in Redis first).
// First run only records what already exists, so the archive isn't blasted out.
import { loadEnvConfig } from "@next/env";
import type { Redis } from "@upstash/redis";
import { getAllArticles } from "../src/lib/articles";
import { TRACKER_KEYS, type StoredSnapshot } from "../src/lib/hockey-tracker";
import { loadRecordsData } from "../src/app/records/redesign/load";
import { articleEmail, getNotifyRedis, KEYS, mvpEmail, nextMvpState, personName, potwEmail, recordBreaks, recordsEmail, type MvpState, potwLine, sendEmails, siteUrl, subscribers } from "../src/lib/notify";

/** Claims an item (true if this run owns it). Seeds silently when the set has never existed. */
async function claim(redis: Redis, set: string, ids: string[]): Promise<string[]> {
  if (!(await redis.exists(set))) {
    await redis.sadd(set, "__seeded__", ...ids);
    console.log(`[notify] seeded ${set} with ${ids.length} existing item(s); nothing sent`);
    return [];
  }
  const fresh: string[] = [];
  for (const id of ids) if (await redis.sadd(set, id)) fresh.push(id);
  return fresh;
}

async function isLive(url: string): Promise<boolean> {
  try { return (await fetch(url, { method: "HEAD", redirect: "follow" })).ok; } catch { return false; }
}

async function notifyArticles(redis: Redis): Promise<void> {
  const articles = await getAllArticles();
  // An article committed to git isn't live until Vercel finishes deploying; wait for it.
  const known = new Set(await redis.smembers(KEYS.sentArticles));
  const candidates = [];
  for (const a of articles) {
    if (known.size && !known.has(a.id) && !(await isLive(`${siteUrl()}/news/${encodeURIComponent(a.id)}`))) {
      console.log(`[notify] article ${a.id} not live yet; will retry`); continue;
    }
    candidates.push(a);
  }
  const fresh = await claim(redis, KEYS.sentArticles, candidates.map(a => a.id));
  if (!fresh.length) return;
  const list = await subscribers(redis, "articles");
  for (const a of candidates.filter(c => fresh.includes(c.id))) {
    try {
      const sent = await sendEmails(list.map(s => articleEmail(s.email, a, s.token)));
      console.log(`[notify] article ${a.id}: sent ${sent}`);
    } catch (error) {
      await redis.srem(KEYS.sentArticles, a.id); // retry next run
      throw error;
    }
  }
}

async function notifyPotw(redis: Redis): Promise<void> {
  const snapshot = await redis.get<StoredSnapshot>(TRACKER_KEYS.snapshot);
  const week = snapshot?.awards?.lastCompletedWeek;
  if (!week || week.status !== "complete" || !week.winners.length) return;
  const fresh = await claim(redis, KEYS.sentPotw, [week.start]);
  if (!fresh.length) return;
  const winners = week.winners.map(w => ({ display: personName(w.name), line: potwLine(w) }));
  const list = await subscribers(redis, "potw");
  try {
    console.log(`[notify] POTW ${week.start}: sent ${await sendEmails(list.map(s => potwEmail(s.email, winners, s.token)))}`);
  } catch (error) {
    await redis.srem(KEYS.sentPotw, week.start);
    throw error;
  }
}

async function notifyMvp(redis: Redis): Promise<void> {
  const board = (await redis.get<StoredSnapshot>(TRACKER_KEYS.snapshot))?.awards?.seasonMvp ?? [];
  // A shared first place has no single leader; wait for it to break.
  const leader = board.filter(e => e.rank === 1).length === 1 ? board[0].name : null;
  const previous = await redis.get<MvpState>(KEYS.mvpState);
  const { state, send } = nextMvpState(previous, leader, Date.now());
  if (send && previous && leader) {
    const top = board.slice(0, 3).map(e => ({ display: personName(e.name), odds: e.americanOdds, chance: e.probability }));
    const list = await subscribers(redis, "mvp");
    const sent = await sendEmails(list.map(s => mvpEmail(s.email, personName(leader), personName(previous.announced), top, s.token)));
    console.log(`[notify] MVP lead ${previous.announced} -> ${leader}: sent ${sent}`);
  }
  if (state && JSON.stringify(state) !== JSON.stringify(previous)) await redis.set(KEYS.mvpState, state);
}

async function notifyRecords(redis: Redis): Promise<void> {
  const data = await loadRecordsData();
  const known = (await redis.hgetall<Record<string, number>>(KEYS.records)) ?? {};
  const { breaks, next } = recordBreaks(data, Object.fromEntries(Object.entries(known).map(([k, v]) => [k, Number(v)])));
  if (breaks.length) {
    const list = await subscribers(redis, "records");
    console.log(`[notify] records broken (${breaks.map(b => b.id).join(", ")}): sent ${await sendEmails(list.map(s => recordsEmail(s.email, breaks, s.token)))}`);
  }
  // Saved after sending, so a failed send retries next run.
  if (Object.keys(next).length && JSON.stringify(next) !== JSON.stringify(known)) await redis.hset(KEYS.records, next);
}

async function main() {
  loadEnvConfig(process.cwd());
  const redis = getNotifyRedis();
  if (!redis || !process.env.RESEND_API_KEY || !process.env.NOTIFY_FROM) {
    console.log("[notify] email not configured; skipping");
    return;
  }
  await notifyPotw(redis);
  await notifyMvp(redis);
  await notifyRecords(redis);
  await notifyArticles(redis);
}

main().catch(error => { console.error("[notify] failed:", (error as Error).message); process.exitCode = 1; });
