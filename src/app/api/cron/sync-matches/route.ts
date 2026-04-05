/**
 * Match sync cron endpoint.
 *
 * Runs every 5 minutes via Vercel Cron to accumulate matches from the
 * Chelstats API into Redis before they rotate out of the 5-game window.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchChelstatsData } from "@/lib/chelstats";
import { pollAndAccumulate } from "@/lib/match-history";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
