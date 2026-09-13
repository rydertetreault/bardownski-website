import { NextResponse } from "next/server";
import { getMatchDetail } from "@/lib/match-detail";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = new URL(request.url).searchParams.get("season");
  if (season !== "2026-2027" && season !== "2025-2026") {
    return NextResponse.json({ error: "A valid season is required." }, { status: 400 });
  }
  try {
    const detail = await getMatchDetail(id, season);
    if (!detail) return NextResponse.json({ error: "Match report not found." }, { status: 404 });
    return NextResponse.json(detail, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Match report is temporarily unavailable." }, { status: 503 });
  }
}
