/**
 * Match sync cron endpoint.
 *
 * Runs daily via Vercel Cron as a safety net. Matches are primarily
 * accumulated on page loads via getMatchHistory / pollAndAccumulate;
 * this cron catches anything missed during long quiet stretches before
 * games rotate out of the Chelstats 5-game API window.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchChelstatsData } from "@/lib/chelstats";
import { pollAndAccumulate } from "@/lib/match-history";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chelstats = await fetchChelstatsData();
    if (!chelstats) {
      return NextResponse.json(
        { error: "Failed to fetch chelstats data" },
        { status: 502 }
      );
    }

    const result = await pollAndAccumulate(chelstats);

    return NextResponse.json({
      success: true,
      newMatches: result.newMatches,
      newForfeits: result.newForfeits,
      totalGamesInRecord:
        chelstats.clubStats.wins +
        chelstats.clubStats.losses +
        chelstats.clubStats.otl,
      apiMatchesReturned: chelstats.matches.length,
    });
  } catch (err) {
    console.error("[sync-matches] Failed:", err);
    return NextResponse.json(
      {
        error: "sync-matches failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
