/**
 * Unified article data layer.
 *
 * Merges manually-written articles (src/lib/news.ts) with auto-generated
 * articles stored in Upstash Redis (Vercel KV replacement). All consumers
 * should import from here instead of news.ts directly.
 */

import { Redis } from "@upstash/redis";
import { articles as manualArticles, type Article } from "@/lib/news";
import type { WeeklyPlayer } from "@/lib/discord";

/* ── Redis client (lazy — only created when env vars exist) ─────────── */

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/* ── Public API ──────────────────────────────────────────────────────── */

/** Get all articles (manual + auto), sorted newest-first by date. */
export async function getAllArticles(): Promise<Article[]> {
  let autoArticles: Article[] = [];
  try {
    const redis = getRedis();
    if (redis) {
      autoArticles = (await redis.get<Article[]>("articles:auto")) ?? [];
    }
  } catch {
    // Redis unavailable — fall back to manual articles only
  }

  // Manual articles take priority — drop any auto article whose date and
  // category already have a manual counterpart.
  const manualKeys = new Set(
    manualArticles.map((a) => `${a.date}|${a.category}`)
  );
  const deduped = autoArticles.filter(
    (a) => !manualKeys.has(`${a.date}|${a.category}`)
  );

  const all = [...deduped, ...manualArticles];
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return all;
}

/** Get a single article by ID. */
export async function getArticleById(id: string): Promise<Article | null> {
  // Auto articles stored individually for fast lookup
  if (id.startsWith("auto-")) {
    try {
      const redis = getRedis();
      if (!redis) return null;
      return (await redis.get<Article>(`article:${id}`)) ?? null;
    } catch {
      return null;
    }
  }
  // Manual articles
  return manualArticles.find((a) => a.id === id) ?? null;
}

/** Get the current Player of the Week from KV. */
export async function getPlayerOfWeek(): Promise<WeeklyPlayer | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return (await redis.get<WeeklyPlayer>("player-of-week")) ?? null;
  } catch {
    return null;
  }
}

/** Get all Player of the Week standings (all players ranked). */
export async function getPotwStandings(): Promise<WeeklyPlayer[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    return (await redis.get<WeeklyPlayer[]>("potw-standings")) ?? [];
  } catch {
    return [];
  }
}

export interface PotwWeek {
  start: number;
  end: number;
}

/** Get the timestamp range of matches that produced the current POTW standings. */
export async function getPotwWeek(): Promise<PotwWeek | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return (await redis.get<PotwWeek>("potw-week")) ?? null;
  } catch {
    return null;
  }
}

export type { Article };
