/**
 * Email notifications: double opt-in subscribers in Upstash, sent through Resend's HTTP API.
 * Env: RESEND_API_KEY, NOTIFY_FROM ("Bardownski <news@bardownski.hockey>"), SITE_URL (default bardownski.hockey).
 */
import { Redis } from "@upstash/redis";
import { randomBytes } from "node:crypto";
import { getDisplayName } from "./nicknames";
import type { RecordGame, RecordsData } from "../app/records/redesign/records-data";

export type Topic = "articles" | "potw" | "mvp" | "records";
export const TOPICS: readonly Topic[] = ["articles", "potw", "mvp", "records"];
export interface Subscriber { email: string; topics: Topic[]; token: string; confirmedAt: string }
export interface Email { to: string; subject: string; html: string; text: string; unsubscribeToken?: string }

export const KEYS = {
  subscribers: "notify:subscribers", // hash email -> Subscriber
  tokens: "notify:tokens",           // hash unsubscribe token -> email
  pending: (token: string) => `notify:pending:${token}`,
  cooldown: (email: string) => `notify:cooldown:${email}`,
  rate: (ip: string) => `notify:rate:${ip}`,
  sentArticles: "notify:sent:articles",
  sentPotw: "notify:sent:potw",
  mvpState: "notify:mvp:state",
  records: "notify:records",          // hash record id -> best value already seen       // { announced, candidate, since, lastSentAt }
} as const;

/** Nickname in normal case for prose ("Wolfgang Mozart", "Jene Rene Tetreau IV", "Top G"). */
export function personName(name: string): string {
  return getDisplayName(name).replace(/[A-Z]+/g, w => w === "IV" || w === "G" ? w : w[0] + w.slice(1).toLowerCase());
}

export const siteUrl = () => (process.env.SITE_URL || "https://bardownski.hockey").replace(/\/$/, "");
export const unsubscribeUrl = (token: string) => `${siteUrl()}/subscribe?unsubscribe=${encodeURIComponent(token)}`;
const oneClickUrl = (token: string) => `${siteUrl()}/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`;
export const newToken = () => randomBytes(24).toString("base64url");

export function getNotifyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/.test(email) ? email : null;
}

export function parseTopics(value: unknown): Topic[] {
  const list = Array.isArray(value) ? value : [value];
  return TOPICS.filter(t => list.includes(t));
}

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(body: string, link?: string): string {
  const footer = link
    ? `<p style="color:#4c6063;font-size:12px;margin-top:32px">You're getting this because you subscribed to Bardownski updates. <a href="${escape(link)}" style="color:#006775">Unsubscribe</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f0efeb;font-family:Arial,Helvetica,sans-serif;color:#152c30">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="color:#006775;font-size:11px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;margin:0 0 16px">Bardownski Hockey Club</p>
${body}${footer}</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escape(href)}" style="background:#006775;color:#fff;padding:12px 20px;text-decoration:none;font-weight:700;display:inline-block">${escape(label)}</a></p>`;

export function confirmEmail(to: string, confirmUrl: string): Email {
  return {
    to, subject: "Confirm your Bardownski subscription",
    html: layout(`<h1 style="font-size:24px;margin:0 0 12px">One click and you're in.</h1>
<p style="line-height:1.6">Confirm your email to get Bardownski updates. If you didn't sign up, ignore this email and nothing happens.</p>${button(confirmUrl, "Confirm subscription")}`),
    text: `Confirm your Bardownski subscription: ${confirmUrl}\n\nIf you didn't sign up, ignore this email.`,
  };
}

/** First paragraph, trimmed to a teaser. */
export function teaser(summary: string, max = 280): string {
  const first = summary.split(/\n\n/)[0].trim();
  return first.length <= max ? first : `${first.slice(0, first.lastIndexOf(" ", max)).replace(/[,;:]$/, "")}…`;
}

export function articleEmail(to: string, a: { id: string; title: string; summary: string }, token: string): Email {
  const unsubscribe = unsubscribeUrl(token), url = `${siteUrl()}/news/${encodeURIComponent(a.id)}`;
  const intro = teaser(a.summary);
  return {
    to, unsubscribeToken: token, subject: a.title,
    html: layout(`<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">${escape(a.title)}</h1>
<p style="line-height:1.6">${escape(intro)}</p>${button(url, "Read the article")}`, unsubscribe),
    text: `${a.title}\n\n${intro}\n\nRead it: ${url}\n\nUnsubscribe: ${unsubscribe}`,
  };
}

export interface PotwWinner { name: string; position: string; games: number; goals?: number; assists?: number; points?: number; saves?: number; shotsAgainst?: number }
export function potwLine(w: PotwWinner): string {
  if (w.position === "G") {
    const pct = w.shotsAgainst ? ` (${(w.saves! / w.shotsAgainst * 100).toFixed(1)}%)` : "";
    return `${w.saves ?? 0} saves on ${w.shotsAgainst ?? 0} shots${pct} in ${w.games} games`;
  }
  return `${w.goals ?? 0} goals and ${w.points ?? 0} points in ${w.games} games`;
}

export function potwEmail(to: string, winners: { display: string; line: string }[], token: string): Email {
  const unsubscribe = unsubscribeUrl(token), names = winners.map(w => w.display).join(" & ");
  const url = `${siteUrl()}/stats`;
  const lines = winners.map(w => `${w.display}: ${w.line}.`);
  return {
    to, unsubscribeToken: token, subject: `Player of the Week: ${names}`,
    html: layout(`<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">Player of the Week: ${escape(names)}</h1>
${lines.map(l => `<p style="line-height:1.6;margin:0 0 8px">${escape(l)}</p>`).join("")}${button(url, "See the standings")}`, unsubscribe),
    text: `Player of the Week: ${names}\n\n${lines.join("\n")}\n\nStandings: ${url}\n\nUnsubscribe: ${unsubscribe}`,
  };
}

/** Sends through Resend's batch endpoint (max 100 per call). Throws on any failed batch. */
export async function sendEmails(emails: Email[], fetchImpl: typeof fetch = fetch): Promise<number> {
  const key = process.env.RESEND_API_KEY, from = process.env.NOTIFY_FROM;
  if (!key || !from) throw new Error("Email is not configured (RESEND_API_KEY / NOTIFY_FROM)");
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map(e => ({
      from, to: [e.to], subject: e.subject, html: e.html, text: e.text,
      ...(e.unsubscribeToken ? { headers: {
        "List-Unsubscribe": `<${oneClickUrl(e.unsubscribeToken)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      } } : {}),
    }));
    const res = await fetchImpl(batch.length === 1 ? "https://api.resend.com/emails" : "https://api.resend.com/emails/batch", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch.length === 1 ? batch[0] : batch),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    sent += batch.length;
  }
  return sent;
}

export interface MvpLine { display: string; odds: string; chance: number }
export function mvpEmail(to: string, leader: string, previous: string, board: MvpLine[], token: string): Email {
  const unsubscribe = unsubscribeUrl(token), url = `${siteUrl()}/stats`;
  const lines = board.map((b, i) => `${i + 1}. ${b.display}: ${b.odds} (${(b.chance * 100).toFixed(1)}%)`);
  const intro = `${leader} has taken first place in the MVP race from ${previous}.`;
  return {
    to, unsubscribeToken: token, subject: `MVP race: ${leader} takes the lead`,
    html: layout(`<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">New MVP race leader: ${escape(leader)}</h1>
<p style="line-height:1.6">${escape(intro)} Here's the top of the board:</p>
${lines.map(l => `<p style="line-height:1.6;margin:0 0 6px;font-weight:700">${escape(l)}</p>`).join("")}${button(url, "See the MVP tracker")}`, unsubscribe),
    text: `${intro}\n\n${lines.join("\n")}\n\nMVP tracker: ${url}\n\nUnsubscribe: ${unsubscribe}`,
  };
}

export interface MvpState { announced: string; candidate?: string; since?: string; lastSentAt?: string }
export const MVP_HOLD_MS = 6 * 3600_000;    // a new leader must hold first this long
export const MVP_COOLDOWN_MS = 24 * 3600_000; // and at most one MVP email per day
/** Pure state machine for lead-change emails. Returns the next state and whether to send now. */
export function nextMvpState(state: MvpState | null, leader: string | null, now: number): { state: MvpState | null; send: boolean } {
  if (!leader) return { state, send: false };                          // tied or empty board
  if (!state) return { state: { announced: leader }, send: false };     // first run: seed silently
  if (leader === state.announced) return { state: { announced: state.announced, lastSentAt: state.lastSentAt }, send: false };
  if (state.candidate !== leader) return { state: { ...state, candidate: leader, since: new Date(now).toISOString() }, send: false };
  const held = now - Date.parse(state.since!) >= MVP_HOLD_MS;
  const rested = !state.lastSentAt || now - Date.parse(state.lastSentAt) >= MVP_COOLDOWN_MS;
  if (!held || !rested) return { state, send: false };
  return { state: { announced: leader, lastSentAt: new Date(now).toISOString() }, send: true };
}

export interface RecordBreak { id: string; title: string; value: number; previous: number; holder: string | null; game: RecordGame; signed: boolean }
const TEAM_RECORDS = [
  ["goals", "Most goals by the team in one game"],
  ["margin", "Biggest winning margin"],
  ["shots", "Most team shots in one game"],
] as const;

/** Compares current records with the best values already seen. A record counts as broken only when a
 * current-season game strictly beats it; ties don't count. Records never seen before seed silently. */
export function recordBreaks(data: RecordsData, known: Record<string, number>): { breaks: RecordBreak[]; next: Record<string, number> } {
  const breaks: RecordBreak[] = [], next: Record<string, number> = {};
  const check = (id: string, title: string, value: number, holder: string | null, game: RecordGame | undefined, season: string | undefined, signed: boolean) => {
    const before = known[id];
    // Bests only ratchet up, so a partial read (storage hiccup) can't fake a later "break".
    next[id] = before === undefined ? value : Math.max(value, before);
    if (before === undefined || value <= before || !game || season !== data.currentSeasonKey) return;
    breaks.push({ id, title, value, previous: before, holder, game, signed });
  };
  for (const r of data.playerGames) {
    const top = r.ranking[0];
    if (top) check(r.id, r.title, top.number, personName(top.name), top.game, top.season, r.unit === "signed");
  }
  for (const [key, title] of TEAM_RECORDS) {
    const r = data.team[key];
    const game = r.games.find(g => g.season === data.currentSeasonKey) ?? r.games[0];
    if (r.games.length) check(`team-${key}`, title, r.value, null, game, game?.season, key === "margin");
  }
  return { breaks, next };
}

export function recordsEmail(to: string, breaks: RecordBreak[], token: string): Email {
  const unsubscribe = unsubscribeUrl(token), url = `${siteUrl()}/records`;
  const n = (v: number, signed: boolean) => signed && v > 0 ? `+${v}` : String(v);
  const lines = breaks.map(b => `${b.title}: ${n(b.value, b.signed)}${b.holder ? ` by ${b.holder}` : ""} vs ${b.game.opponent} on ${b.game.date} (old record ${n(b.previous, b.signed)}).`);
  const subject = breaks.length === 1 ? `New club record: ${breaks[0].title}` : `${breaks.length} club records just fell`;
  return {
    to, unsubscribeToken: token, subject,
    html: layout(`<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">${escape(breaks.length === 1 ? "A club record just fell." : `${breaks.length} club records just fell.`)}</h1>
${lines.map(l => `<p style="line-height:1.6;margin:0 0 8px">${escape(l)}</p>`).join("")}${button(url, "See the record book")}`, unsubscribe),
    text: `${subject}\n\n${lines.join("\n")}\n\nRecord book: ${url}\n\nUnsubscribe: ${unsubscribe}`,
  };
}

export async function subscribers(redis: Redis, topic: Topic): Promise<Subscriber[]> {
  const all = (await redis.hgetall<Record<string, Subscriber>>(KEYS.subscribers)) ?? {};
  return Object.values(all).filter(s => s?.topics?.includes(topic));
}

export async function unsubscribe(redis: Redis, token: string): Promise<boolean> {
  const email = await redis.hget<string>(KEYS.tokens, token);
  if (!email) return false;
  await Promise.all([redis.hdel(KEYS.subscribers, email), redis.hdel(KEYS.tokens, token)]);
  return true;
}
