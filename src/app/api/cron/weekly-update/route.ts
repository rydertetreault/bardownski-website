/**
 * Weekly cron endpoint.
 *
 * Runs every Monday at 10:00 UTC via Vercel Cron.
 * 1. Computes Player of the Week from Chelstats delta stats
 * 2. Generates the next article in the 4-week rotation
 * 3. Stores both in Upstash Redis
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { fetchChelstatsData } from "@/lib/chelstats";
import type { WeeklyPlayer } from "@/lib/discord";
import type { Article } from "@/lib/news";

import { generateStatsRecap } from "@/lib/article-generators/stats-recap";
import { generateMvpRace } from "@/lib/article-generators/mvp-race";
import { generatePlayerSpotlight } from "@/lib/article-generators/player-spotlight";
import { generateMatchRecap } from "@/lib/article-generators/match-recap";

/* ── Types ───────────────────────────────────────────────────────────── */

interface ArticleMeta {
  lastRotationIndex: number;
  lastDate: string;
  lastSpotlightPlayer: string;
  totalArticles: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Compute Player of the Week from recent match performance.
 * Aggregates each player's stats across recent games and picks the best.
 */
function computePlayerOfWeekFromMatches(
  matches: import("@/lib/chelstats").ClubMatch[]
): WeeklyPlayer | null {
  if (matches.length === 0) return null;

  // Aggregate per-player stats across all recent matches
  const skaterTotals: Record<string, { goals: number; assists: number; hits: number; games: number }> = {};
  const goalieTotals: Record<string, { saves: number; shotsAgainst: number; ga: number; shutouts: number; games: number }> = {};

  for (const m of matches) {
    for (const p of m.players || []) {
      if (!p.isOurPlayer) continue;

      if (p.isGoalie) {
        if (!goalieTotals[p.name]) {
          goalieTotals[p.name] = { saves: 0, shotsAgainst: 0, ga: 0, shutouts: 0, games: 0 };
        }
        goalieTotals[p.name].saves += p.saves;
        goalieTotals[p.name].shotsAgainst += p.shotsAgainst;
        goalieTotals[p.name].ga += p.goalsAgainst;
        goalieTotals[p.name].shutouts += p.goalsAgainst === 0 ? 1 : 0;
        goalieTotals[p.name].games += 1;
      } else {
        if (!skaterTotals[p.name]) {
          skaterTotals[p.name] = { goals: 0, assists: 0, hits: 0, games: 0 };
        }
        skaterTotals[p.name].goals += p.goals;
        skaterTotals[p.name].assists += p.assists;
        skaterTotals[p.name].hits += p.hits;
        skaterTotals[p.name].games += 1;
      }
    }
  }

  let best: WeeklyPlayer | null = null;

  // Score skaters: points * 3 + hits * 0.2
  for (const [name, stats] of Object.entries(skaterTotals)) {
    const points = stats.goals + stats.assists;
    const score = points * 3 + stats.hits * 0.2;
    if (score > 0 && (!best || score > best.weeklyScore)) {
      best = {
        name,
        position: "F",
        isGoalie: false,
        deltaGoals: stats.goals,
        deltaAssists: stats.assists,
        deltaPoints: points,
        deltaHits: stats.hits,
        deltaSaves: 0,
        weeklyScore: score,
      };
    }
  }

  // Score goalies: saves * 0.5 + shutouts * 10
  for (const [name, stats] of Object.entries(goalieTotals)) {
    const score = stats.saves * 0.5 + stats.shutouts * 10;
    if (score > 0 && (!best || score > best.weeklyScore)) {
      best = {
        name,
        position: "G",
        isGoalie: true,
        deltaGoals: 0,
        deltaAssists: 0,
        deltaPoints: 0,
        deltaHits: 0,
        deltaSaves: stats.saves,
        weeklyScore: score,
      };
    }
  }

  return best;
}

/* ── Route handler ───────────────────────────────────────────────────── */

const GENERATORS = [
  "stats-recap",
  "mvp-race",
  "player-spotlight",
  "match-recap",
] as const;

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Redis not configured (missing KV_REST_API_URL or KV_REST_API_TOKEN)" },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // --- Step 1: Compute Player of the Week ---
  const chelstats = await fetchChelstatsData();
  let weeklyPlayer: WeeklyPlayer | null = null;

  if (chelstats) {
    // Compute Player of the Week from recent match performance
    const now = Date.now() / 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60;
    let recentMatches = chelstats.matches.filter((m) => m.timestamp >= oneWeekAgo);

    // If no matches this week, use the last 5 matches
    if (recentMatches.length === 0) {
      recentMatches = chelstats.matches.slice(0, 5);
    }

    weeklyPlayer = computePlayerOfWeekFromMatches(recentMatches);

    // Store as current Player of the Week
    if (weeklyPlayer) {
      await redis.set("player-of-week", weeklyPlayer);
    }
  }

  // --- Step 2: Determine article type and generate ---
  const meta = (await redis.get<ArticleMeta>("articles:meta")) ?? {
    lastRotationIndex: -1,
    lastDate: "",
    lastSpotlightPlayer: "",
    totalArticles: 0,
  };

  // Allow ?reset=true to regenerate today's article
  const forceReset = request.nextUrl.searchParams.get("reset") === "true";

  // Duplicate prevention (skip if resetting)
  if (meta.lastDate === today && !forceReset) {
    return NextResponse.json({ skipped: true, reason: "Already generated today" });
  }

  // If resetting, remove the old article and rewind rotation
  if (forceReset && meta.lastDate === today) {
    const existing = (await redis.get<Article[]>("articles:auto")) ?? [];
    const cleaned = existing.filter((a) => !a.date.startsWith(today));
    await redis.set("articles:auto", cleaned);
    meta.lastRotationIndex = meta.lastRotationIndex - 1;
  }

  // Allow ?type= to force a specific article type
  const forceType = request.nextUrl.searchParams.get("type") as typeof GENERATORS[number] | null;
  const nextIndex = forceType
    ? GENERATORS.indexOf(forceType as typeof GENERATORS[number])
    : (meta.lastRotationIndex + 1) % GENERATORS.length;
  const articleType = GENERATORS[nextIndex >= 0 ? nextIndex : 0];

  let article: Article | null = null;

  try {
    switch (articleType) {
      case "stats-recap":
        article = await generateStatsRecap();
        break;
      case "mvp-race":
        article = await generateMvpRace();
        break;
      case "player-spotlight":
        article = await generatePlayerSpotlight(weeklyPlayer);
        break;
      case "match-recap":
        article = await generateMatchRecap();
        break;
    }
  } catch (err) {
    console.error(`[weekly-update] Error generating ${articleType}:`, err);
  }

  if (!article) {
    console.error(`[weekly-update] Failed to generate article type: ${articleType}`);
    // Fall back to stats-recap if the requested type fails
    if (articleType !== "stats-recap") {
      article = await generateStatsRecap();
    }
    if (!article) {
      return NextResponse.json(
        { error: `Failed to generate ${articleType}` },
        { status: 500 }
      );
    }
  }

  // --- Step 3: Store article ---
  await redis.set(`article:${article.id}`, article);

  const existing = (await redis.get<Article[]>("articles:auto")) ?? [];
  existing.unshift(article);
  await redis.set("articles:auto", existing);

  // Update meta
  await redis.set("articles:meta", {
    lastRotationIndex: nextIndex,
    lastDate: today,
    lastSpotlightPlayer: articleType === "player-spotlight" ? (weeklyPlayer?.name ?? "") : meta.lastSpotlightPlayer,
    totalArticles: existing.length,
  });

  return NextResponse.json({
    success: true,
    articleId: article.id,
    articleType,
    playerOfWeek: weeklyPlayer?.name ?? null,
  });
}
