import type { Match } from "@/types";
import { addClubWeeks, clubWeekStart, formatClubDate } from "@/lib/club-time";

export function getResult(match: Match): "W" | "L" | null {
  if (
    match.status !== "final" ||
    typeof match.scoreUs !== "number" ||
    typeof match.scoreThem !== "number" ||
    !Number.isFinite(match.scoreUs) ||
    !Number.isFinite(match.scoreThem) ||
    match.scoreUs < 0 ||
    match.scoreThem < 0
  )
    return null;
  return match.scoreUs > match.scoreThem ? "W" : "L";
}

/** Only show weeks with saved games. Mon–Sun Central Time weeks, matching Player of the Week. */
export function getWeekPeriods(matches: Match[]) {
  const starts = new Set<number>();
  for (const match of matches) {
    const start = clubWeekStart(match.timestamp * 1000);
    if (Number.isFinite(start)) starts.add(start / 1000);
  }
  const format = (timestamp: number) => formatClubDate(timestamp * 1000, {
    month: "short", day: "numeric", year: "numeric",
  });
  return [...starts].sort((a, b) => b - a).map((startTs) => {
    // DST weeks are 167 or 169 hours, so step by calendar week, not a fixed duration.
    const endTs = addClubWeeks(startTs * 1000, 1) / 1000 - 1;
    return { startTs, endTs, dateRange: `${format(startTs)} – ${format(endTs)}` };
  });
}
