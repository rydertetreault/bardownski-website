import { NextRequest, NextResponse } from "next/server";
import { refreshHockeyTracker } from "@/lib/hockey-tracker";
import { NHL27_IDENTITY } from "@/lib/nhl27-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** NHL27 only. Legacy NHL26 persistence and weekly publishing stay retired. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  const result = await refreshHockeyTracker({force:true});
  return NextResponse.json({
    success: result.status === "connected", status:result.status, synced:result.synced,
    identity:NHL27_IDENTITY, storedMatches:result.matches.length,
    totalGames:result.snapshot?.data.clubStats.totalGames ?? null,
    updatedAt:result.snapshot?.fetchedAt ?? null, syncedAt:result.snapshot?.syncedAt ?? null,
    ...(result.error ? {error:result.error} : {}),
  },{status:result.status === "connected" ? 200 : 503});
}
