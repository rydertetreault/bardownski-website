import type { Match } from "@/types";

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

/** Only show weeks with saved games; UTC matches the server-formatted dates. */
export function getWeekPeriods(matches: Match[]) {
  const starts = new Set<number>();
  for (const match of matches) {
    const monday = new Date(match.timestamp * 1000);
    const day = monday.getUTCDay();
    monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
    monday.setUTCHours(0, 0, 0, 0);
    starts.add(monday.getTime() / 1000);
  }
  const format = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  return [...starts].sort((a, b) => b - a).map((startTs) => {
    const endTs = startTs + 7 * 24 * 60 * 60 - 1;
    return { startTs, endTs, dateRange: `${format(startTs)} – ${format(endTs)}` };
  });
}
