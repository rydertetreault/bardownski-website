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
import type { ClubMember } from "@/lib/chelstats";
import { getDisplayNameFromGamertag } from "@/lib/nicknames";
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

interface StatsSnapshot {
  [name: string]: {
    goals: number;
    assists: number;
    points: number;
    hits: number;
    saves: number;
    shutouts: number;
    gamesPlayed: number;
    goalieGP: number;
  };
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function buildSnapshot(members: ClubMember[]): StatsSnapshot {
  const snap: StatsSnapshot = {};
  for (const m of members) {
    // Key by nickname so it matches Discord snapshot keys
    const key = getDisplayNameFromGamertag(m.username);
    snap[key] = {
      goals: m.goals,
      assists: m.assists,
      points: m.points,
      hits: m.hits,
      saves: m.goalieSaves,
      shutouts: m.shutouts,
      gamesPlayed: m.gamesPlayed,
      goalieGP: m.goalieGP,
    };
  }
  return snap;
}

/**
 * March 17th stats drop baseline.
 * These are the exact stats as of the last known Discord stats drop.
 * Player of the Week deltas are computed against this baseline on first run.
 */
function getMarch17Baseline(): StatsSnapshot {
  return {
    "XAVIER LAFLAMME": { goals: 479, assists: 367, points: 846, hits: 1618, saves: 0, shutouts: 0, gamesPlayed: 0, goalieGP: 0 },
    "MATT HUT":        { goals: 456, assists: 300, points: 756, hits: 1000, saves: 0, shutouts: 0, gamesPlayed: 0, goalieGP: 0 },
    "GOTTA BE":        { goals: 107, assists: 184, points: 291, hits: 0, saves: 0, shutouts: 0, gamesPlayed: 0, goalieGP: 0 },
    "JENE RENE TETREAU IV": { goals: 0, assists: 0, points: 0, hits: 0, saves: 1000, shutouts: 7, gamesPlayed: 0, goalieGP: 0 },
    "WOLFGANG MOZART":  { goals: 0, assists: 150, points: 0, hits: 0, saves: 0, shutouts: 0, gamesPlayed: 0, goalieGP: 0 },
    "SLOBBY ROBBY":     { goals: 0, assists: 150, points: 0, hits: 0, saves: 0, shutouts: 0, gamesPlayed: 0, goalieGP: 0 },
    "JIMMY LEMONS":     { goals: 0, assists: 100, points: 0, hits: 0, saves: 0, shutouts: 0, gamesPlayed: 0, goalieGP: 0 },
  };
}

function computePlayerOfWeekFromDelta(
  members: ClubMember[],
  prevSnap: StatsSnapshot | null
): WeeklyPlayer | null {
  if (!prevSnap) {
    // No previous snapshot — return null so the caller falls back to Discord
    return null;
  }

  let best: WeeklyPlayer | null = null;

  for (const m of members) {
    const key = getDisplayNameFromGamertag(m.username);
    const prev = prevSnap[key];
    const prevGoals = prev?.goals ?? 0;
    const prevAssists = prev?.assists ?? 0;
    const prevHits = prev?.hits ?? 0;
    const prevSaves = prev?.saves ?? 0;
    const prevShutouts = prev?.shutouts ?? 0;

    // Skater deltas
    const deltaGoals = Math.max(0, m.goals - prevGoals);
    const deltaAssists = Math.max(0, m.assists - prevAssists);
    const deltaPoints = deltaGoals + deltaAssists;
    const deltaHits = Math.max(0, m.hits - prevHits);

    // Goalie deltas
    const deltaSaves = Math.max(0, m.goalieSaves - prevSaves);
    const deltaShutouts = Math.max(0, m.shutouts - prevShutouts);

    // Score both roles, pick whichever is higher
    const skaterScore = deltaPoints * 3 + deltaHits * 0.2;
    const goalieScore = deltaSaves * 0.5 + deltaShutouts * 10;

    const isGoalie = goalieScore > skaterScore && m.goalieGP > 0;
    const score = isGoalie ? goalieScore : skaterScore;

    if (score > 0 && (!best || score > best.weeklyScore)) {
      best = {
        name: getDisplayNameFromGamertag(m.username),
        position: isGoalie ? "G" : (m.position || "F"),
        isGoalie,
        deltaGoals,
        deltaAssists,
        deltaPoints,
        deltaHits,
        deltaSaves,
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
    let prevSnap = await redis.get<StatsSnapshot>("stats-snapshot-prev");

    // No previous snapshot (first run) — seed from March 17th stats drop baseline
    if (!prevSnap) {
      prevSnap = getMarch17Baseline();
    }

    weeklyPlayer = computePlayerOfWeekFromDelta(chelstats.members, prevSnap);

    // Store as current Player of the Week
    if (weeklyPlayer) {
      await redis.set("player-of-week", weeklyPlayer);
    }

    // Snapshot current stats for next week's comparison
    await redis.set("stats-snapshot-prev", buildSnapshot(chelstats.members));
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

  // Allow ?reseed=true to rebuild the stats snapshot from Discord
  if (request.nextUrl.searchParams.get("reseed") === "true") {
    await redis.del("stats-snapshot-prev");
  }

  // Allow ?type= to force a specific article type
  const forceType = request.nextUrl.searchParams.get("type") as typeof GENERATORS[number] | null;
  const nextIndex = forceType
    ? GENERATORS.indexOf(forceType as typeof GENERATORS[number])
    : (meta.lastRotationIndex + 1) % GENERATORS.length;
  const articleType = GENERATORS[nextIndex >= 0 ? nextIndex : 0];

  let article: Article | null = null;

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

  if (!article) {
    console.error(`[weekly-update] Failed to generate article type: ${articleType}`);
    return NextResponse.json(
      { error: `Failed to generate ${articleType}` },
      { status: 500 }
    );
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
