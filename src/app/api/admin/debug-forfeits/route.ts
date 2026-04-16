import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/**
 * Temporary diagnostic endpoint to inspect the match-history Redis state.
 * Remove once the forfeit-rendering issue is resolved.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
  }

  const redis = new Redis({ url, token });

  const [matchesHash, forfeitsHash, meta, legacyExists] = await Promise.all([
    redis.hgetall<Record<string, { id: string; timestamp: number }>>(
      "match-history:matches"
    ),
    redis.hgetall<Record<string, { id: string; timestamp: number; date: string }>>(
      "match-history:forfeits"
    ),
    redis.get("match-history:meta"),
    redis.exists("match-history"),
  ]);

  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - 21 * 24 * 60 * 60;

  const matchIds = matchesHash ? Object.keys(matchesHash) : [];
  const forfeitsArr = forfeitsHash ? Object.values(forfeitsHash) : [];

  return NextResponse.json({
    now,
    cutoff,
    nowDate: new Date(now * 1000).toISOString(),
    cutoffDate: new Date(cutoff * 1000).toISOString(),
    meta,
    legacyBlobExists: legacyExists === 1,
    matches: {
      count: matchIds.length,
      ids: matchIds.slice(0, 30),
    },
    forfeits: {
      count: forfeitsArr.length,
      entries: forfeitsArr,
      visibleCount: forfeitsArr.filter((f) => f.timestamp >= cutoff).length,
    },
  });
}
