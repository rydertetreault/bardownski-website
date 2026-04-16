import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/**
 * Wipe all match-history Redis state. Intended for manual use at season
 * boundaries only. Requires CRON_SECRET auth.
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

  const redis = new Redis({ url, token });
  const deleted = await redis.del(
    "match-history:matches",
    "match-history:forfeits",
    "match-history:meta",
    "match-history",
    "match-history:migration-lock"
  );

  return NextResponse.json({ success: true, keysDeleted: deleted });
}
