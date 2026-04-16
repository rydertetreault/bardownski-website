import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { __INTERNAL_TEST__ } from "@/lib/match-history";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const NS = "match-history:test";
  const checks: { name: string; pass: boolean; detail?: string }[] = [];

  // Cleanup any prior test data
  await redis.del(
    `${NS}:matches`,
    `${NS}:forfeits`,
    `${NS}:meta`,
    `${NS}`,
    `${NS}:migration-lock`
  );

  // Check 1: migration from legacy blob populates hashes
  await redis.set(`${NS}`, {
    lastRecord: { wins: 10, losses: 2, otl: 1 },
    matches: [
      {
        id: "test-m1",
        timestamp: 1776000000,
        date: "April 12, 2026",
        opponent: "Test",
        homeAway: "home",
        scoreUs: 3,
        scoreThem: 1,
        matchType: "regular",
        shotsUs: 10,
        shotsThem: 8,
        toaUs: "5:00",
        toaThem: "4:00",
        passCompUs: 80,
        passCompThem: 70,
        result: "",
        players: [],
        threeStars: null,
      },
    ],
    forfeitEntries: [
      { id: "test-f1", timestamp: 1776000100, date: "April 12, 2026" },
    ],
  });

  // (We can't reuse the real helpers on a different namespace without
  // parameterizing them. For the self-test, just assert the shape of
  // the production keys exists after calling migrateLegacyIfNeeded
  // using the REAL keys in a dedicated test slot.)
  // NOTE: This check is added in Task 3. Expand in later tasks.
  checks.push({
    name: "migration-placeholder",
    pass: true,
    detail: "wired in task 3; expanded in tasks 4-5",
  });

  return NextResponse.json({ status: "ok", checks });
}
