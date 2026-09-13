import { NextRequest, NextResponse } from "next/server";



/** Retired NHL26 maintenance endpoint: preserve the archived season unchanged. */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ error: "The NHL26 archive is protected. Legacy reset/repair endpoints are retired." }, { status: 410 });
}
