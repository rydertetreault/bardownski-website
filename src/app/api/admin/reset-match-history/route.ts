import { NextRequest, NextResponse } from "next/server";

/**
 * Retired destructive NHL26 maintenance endpoint. Authentication remains
 * fail-closed; even authorized calls cannot wipe the preserved archive.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ error: "The NHL26 archive is protected. Legacy reset/repair endpoints are retired." }, { status: 410 });
}
