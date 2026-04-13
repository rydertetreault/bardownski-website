/**
 * Biweekly cron endpoint.
 *
 * Vercel Cron fires this every Monday at 10:00 UTC, but the handler
 * skips runs less than 10 days after the previous article so articles
 * land roughly every other week.
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
import { generateMilestoneRecap } from "@/lib/article-generators/milestone-recap";
import { detectMilestones, buildReportedKeys, buildSeedKeysFromMembers, type DetectedMilestone } from "@/lib/milestones";

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
): WeeklyPlayer[] {
  if (matches.length === 0) return [];

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

  const allPlayers: WeeklyPlayer[] = [];

  // Score skaters: total raw stats, weighted
  // Target: 29G 5A 30HIT ≈ 165
  for (const [name, stats] of Object.entries(skaterTotals)) {
    const gp = stats.games;
    if (gp === 0) continue;
    const points = stats.goals + stats.assists;
    const score =
      stats.goals * 5 +                       // goals are king
      stats.assists * 2.5 +                   // playmaking
      stats.hits * 0.2;                       // physicality
    if (score > 0) {
      allPlayers.push({
        name,
        position: "F",
        isGoalie: false,
        deltaGoals: stats.goals,
        deltaAssists: stats.assists,
        deltaPoints: points,
        deltaHits: stats.hits,
        deltaSaves: 0,
        weeklyScore: score,
      });
    }
  }

  // Score goalies: calibrated so elite goalie week ≈ elite skater week
  for (const [name, stats] of Object.entries(goalieTotals)) {
    const gp = stats.games;
    if (gp === 0) continue;

    const savePct = stats.shotsAgainst > 0 ? (stats.saves / stats.shotsAgainst) * 100 : 0;
    const gaa = stats.ga / gp;
    // Target: 45SV 1SO 67.2%SV 4.4GAA ≈ 85
    const score =
      savePct * 0.4 +                          // save percentage (core stat)
      Math.max(10 - gaa, 0) * 2 +              // GAA inverted (lower = better)
      stats.shutouts * 40 +                    // flat 40 points per shutout
      stats.saves * 0.2;                       // total saves workload

    if (score > 0) {
      allPlayers.push({
        name,
        position: "G",
        isGoalie: true,
        deltaGoals: 0,
        deltaAssists: 0,
        deltaPoints: 0,
        deltaHits: 0,
        deltaSaves: stats.saves,
        weeklyScore: score,
      });
    }
  }

  allPlayers.sort((a, b) => b.weeklyScore - a.weeklyScore);
  return allPlayers;
}

/* ── Route handler ───────────────────────────────────────────────────── */

const GENERATORS = [
  "stats-recap",
  "mvp-race",
  "player-spotlight",
  "match-recap",
] as const;

/** Extra article types that can be triggered via ?type= but are not in the regular rotation. */
type ExtraType = "milestone-recap";
type ArticleType = typeof GENERATORS[number] | ExtraType;

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

  // --- Seed mode: mark all current milestones as reported ---
  // Hit ?seed=true after publishing a manual milestone article so the cron
  // doesn't re-report the same milestones in its next auto-generated article.
  if (request.nextUrl.searchParams.get("seed") === "true") {
    const data = await fetchChelstatsData();
    if (!data) {
      return NextResponse.json({ error: "Could not fetch chelstats data" }, { status: 500 });
    }
    const seedKeys = buildSeedKeysFromMembers(data.members);
    const existingRaw = (await redis.get<string[]>("milestones:reported")) ?? [];
    const merged = [...new Set([...existingRaw, ...seedKeys])];
    await redis.set("milestones:reported", merged);
    return NextResponse.json({
      success: true,
      seeded: seedKeys.length,
      totalReported: merged.length,
    });
  }

  // --- Step 1: Compute Player of the Week ---
  const chelstats = await fetchChelstatsData();
  let weeklyPlayer: WeeklyPlayer | null = null;
  let weeklyStandings: WeeklyPlayer[] = [];

  if (chelstats) {
    // Compute Player of the Week from recent match performance
    const now = Date.now() / 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60;
    let recentMatches = chelstats.matches.filter((m) => m.timestamp >= oneWeekAgo);

    // If no matches this week, use the last 5 matches
    if (recentMatches.length === 0) {
      recentMatches = chelstats.matches.slice(0, 5);
    }

    weeklyStandings = computePlayerOfWeekFromMatches(recentMatches);
    weeklyPlayer = weeklyStandings[0] ?? null;

    // Store winner + full standings
    if (weeklyPlayer) {
      await redis.set("player-of-week", weeklyPlayer);
    }
    await redis.set("potw-standings", weeklyStandings);
  }

  // --- Step 1b: Detect milestones ---
  let newMilestones: DetectedMilestone[] = [];
  if (chelstats) {
    const reportedRaw = (await redis.get<string[]>("milestones:reported")) ?? [];
    const reportedSet = new Set(reportedRaw);
    newMilestones = detectMilestones(chelstats.members, reportedSet);
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

  // Biweekly gate: Vercel fires weekly, but we only want an article
  // every other week. Skip if the previous article is too recent.
  if (meta.lastDate && !forceReset) {
    const daysSince = Math.floor(
      (new Date(today).getTime() - new Date(meta.lastDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSince < 10) {
      return NextResponse.json({
        skipped: true,
        reason: `Biweekly: only ${daysSince} days since last article`,
      });
    }
  }

  // If resetting, remove the old article and rewind rotation
  if (forceReset && meta.lastDate === today) {
    const existing = (await redis.get<Article[]>("articles:auto")) ?? [];
    const cleaned = existing.filter((a) => !a.date.startsWith(today));
    await redis.set("articles:auto", cleaned);
    meta.lastRotationIndex = meta.lastRotationIndex - 1;
  }

  // Allow ?type= to force a specific article type (including extras like milestone-recap)
  const forceType = request.nextUrl.searchParams.get("type") as ArticleType | null;
  const isExtraType = forceType === "milestone-recap";
  const nextIndex = isExtraType
    ? meta.lastRotationIndex // don't advance rotation for extra types
    : forceType
      ? GENERATORS.indexOf(forceType as typeof GENERATORS[number])
      : (meta.lastRotationIndex + 1) % GENERATORS.length;
  const articleType: ArticleType = isExtraType
    ? forceType
    : GENERATORS[nextIndex >= 0 ? nextIndex : 0];

  let article: Article | null = null;

  try {
    switch (articleType) {
      case "stats-recap":
        article = await generateStatsRecap(newMilestones);
        break;
      case "mvp-race":
        article = await generateMvpRace(newMilestones);
        break;
      case "player-spotlight":
        article = await generatePlayerSpotlight(weeklyPlayer, newMilestones);
        break;
      case "match-recap":
        article = await generateMatchRecap(newMilestones);
        break;
      case "milestone-recap":
        article = await generateMilestoneRecap(newMilestones);
        break;
    }
  } catch (err) {
    console.error(`[weekly-update] Error generating ${articleType}:`, err);
  }

  if (!article) {
    console.error(`[weekly-update] Failed to generate article type: ${articleType}`);
    // Fall back to stats-recap if the requested type fails
    if (articleType !== "stats-recap") {
      article = await generateStatsRecap(newMilestones);
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

  // Persist reported milestones so they don't repeat in future articles
  if (newMilestones.length > 0) {
    const reportedRaw = (await redis.get<string[]>("milestones:reported")) ?? [];
    const newKeys = buildReportedKeys(newMilestones);
    const merged = [...new Set([...reportedRaw, ...newKeys])];
    await redis.set("milestones:reported", merged);
  }

  // Update meta (extra types don't advance the rotation index)
  await redis.set("articles:meta", {
    lastRotationIndex: isExtraType ? meta.lastRotationIndex : nextIndex,
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
