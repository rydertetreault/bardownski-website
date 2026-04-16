/**
 * Match-history self-test endpoint.
 *
 * Verification route for the Redis-backed match history. Later tasks will
 * populate this with real checks; for now it is a stub that only enforces
 * the CRON_SECRET auth and returns an empty checks list.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ status: "ok", checks: [] });
}
