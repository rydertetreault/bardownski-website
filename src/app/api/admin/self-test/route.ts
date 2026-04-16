import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { __INTERNAL_TEST__ } from "@/lib/match-history";
import type { ClubMatch } from "@/lib/chelstats";

const NS = "match-history:test";

function makeMatch(id: string, ts: number, scoreUs: number, scoreThem: number): ClubMatch {
  return {
    id,
    timestamp: ts,
    date: new Date(ts * 1000).toDateString(),
    opponent: "Test",
    homeAway: "home",
    scoreUs,
    scoreThem,
    matchType: "regular",
    shotsUs: 0,
    shotsThem: 0,
    toaUs: "0:00",
    toaThem: "0:00",
    passCompUs: 0,
    passCompThem: 0,
    result: "",
    players: [],
    threeStars: null,
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const { readAllMatchesNS, writeMatchesNS } = __INTERNAL_TEST__;
  const checks: { name: string; pass: boolean; detail?: string }[] = [];

  // Cleanup
  await redis.del(`${NS}:matches`, `${NS}:forfeits`, `${NS}:meta`);

  // Check 1: concurrent writes do not lose data (the core race fix)
  await Promise.all([
    writeMatchesNS(redis, NS, [makeMatch("A", 1000, 3, 1)]),
    writeMatchesNS(redis, NS, [makeMatch("B", 1001, 2, 2)]),
    writeMatchesNS(redis, NS, [makeMatch("C", 1002, 4, 0)]),
  ]);
  const afterConcurrent = await readAllMatchesNS(redis, NS);
  const ids = new Set(afterConcurrent.map((m) => m.id));
  checks.push({
    name: "concurrent-writes-no-loss",
    pass: ids.has("A") && ids.has("B") && ids.has("C"),
    detail: `got ids: ${[...ids].sort().join(",")}`,
  });

  // Check 2: re-writing an existing match ID is idempotent (no duplicates)
  await writeMatchesNS(redis, NS, [makeMatch("A", 1000, 3, 1)]);
  const afterDupe = await readAllMatchesNS(redis, NS);
  checks.push({
    name: "duplicate-write-no-extra-entries",
    pass: afterDupe.length === 3,
    detail: `count=${afterDupe.length}`,
  });

  // Check 3: production migration has run (meta exists, legacy key gone)
  const meta = await redis.get<{ schemaVersion: number }>("match-history:meta");
  const legacyExists = await redis.exists("match-history");
  checks.push({
    name: "production-migration-complete",
    pass: !!meta && meta.schemaVersion >= 2 && legacyExists === 0,
    detail: `meta=${JSON.stringify(meta)}, legacyExists=${legacyExists}`,
  });

  // Cleanup
  await redis.del(`${NS}:matches`, `${NS}:forfeits`, `${NS}:meta`);

  const allPass = checks.every((c) => c.pass);
  return NextResponse.json({ status: allPass ? "ok" : "fail", checks });
}
