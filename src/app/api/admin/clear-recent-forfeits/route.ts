import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

interface ForfeitEntry {
  id: string;
  timestamp: number;
  date: string;
}

/**
 * Delete forfeit entries from the Redis forfeits hash whose timestamp
 * falls within the last N hours (default 6). Used to clean up ghost
 * forfeits created by a sync anomaly without wiping real history.
 *
 * Requires CRON_SECRET auth. Query params:
 *   - hours: lookback window in hours (default 6)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 503 });
  }

  const hoursParam = request.nextUrl.searchParams.get("hours");
  const hours = hoursParam ? parseInt(hoursParam, 10) : 6;
  if (!Number.isFinite(hours) || hours <= 0) {
    return NextResponse.json({ error: "Invalid hours param" }, { status: 400 });
  }

  const redis = new Redis({ url, token });
  const FORFEITS_KEY = "match-history:forfeits";

  const raw = await redis.hgetall<Record<string, ForfeitEntry>>(FORFEITS_KEY);
  if (!raw) {
    return NextResponse.json({ success: true, deleted: 0, kept: 0 });
  }

  const cutoff = Math.floor(Date.now() / 1000) - hours * 60 * 60;
  const toDelete: string[] = [];
  let kept = 0;
  for (const [id, entry] of Object.entries(raw)) {
    if (entry.timestamp >= cutoff) {
      toDelete.push(id);
    } else {
      kept++;
    }
  }

  if (toDelete.length > 0) {
    await redis.hdel(FORFEITS_KEY, ...toDelete);
  }

  return NextResponse.json({
    success: true,
    deleted: toDelete.length,
    kept,
    cutoff,
    hours,
  });
}
