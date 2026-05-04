import type { Match } from "@/types";

export const CHAMPIONSHIP = {
  season: "Season 4",
  division: "Elite Division",
  recordInRun: "16-2-1",
  opponent: "B A N G N A T I O N",
  scoreUs: 5,
  scoreThem: 3,
  date: "May 3, 2026",
} as const;

/**
 * Custom recap shown on the championship-clinching match's detail page.
 * Focused on the game itself, not the whole bracket run. Multi-paragraph,
 * separated by \n\n.
 */
export const CHAMPIONSHIP_DESCRIPTION = [
  "This was the night. Bardownski lifted the Season 4 Elite Division Club Finals trophy with a 5-3 win, the first championship in the seven-year history of this club.",
  "The 5-3 score does not tell the real story of the game. This club has been built on offense for years. Out-shoot, out-skill, out-score, and let the top line carry the night. Tonight was a different team.",
  "Sticks in lanes. Bodies in front of pucks. Structure in our own end that the roster has been building toward all season. We won this one with our defensive game. Not despite it. Because of it.",
  "JRT IV turned in a goaltending masterclass between the pipes, swinging the moments only championship goalies can. The wall stood when the trophy was on the line.",
  "Xavier Laflamme came through where it counted, capping the run as the MVP of the bracket with the kind of relentless effort that has defined his year. He has been the engine of this team for a long time, and through the bracket he kept the engine running.",
  "First title in club history. The progression this club has been chasing for seven years, finally caught.",
].join("\n\n");

/**
 * Match IDs for the championship-clinching game(s). Add the chelstats
 * matchId here once known to avoid relying on the date+opponent fallback.
 */
const CHAMPIONSHIP_CLINCHER_IDS: Set<string> = new Set();

type ClincherCheckable = Pick<
  Match,
  "id" | "opponent" | "scoreUs" | "scoreThem" | "date" | "matchType"
>;

export function isChampionshipClincher(match: ClincherCheckable): boolean {
  if (CHAMPIONSHIP_CLINCHER_IDS.has(match.id)) return true;
  // Fallback: opponent + final score + finals matchType is unique enough.
  // Date check intentionally omitted — chelstats formats timestamps in
  // server-local time which can shift the game's date by ±1 from the
  // user-stated calendar date due to Newfoundland timezone (UTC-2:30).
  return (
    match.opponent === CHAMPIONSHIP.opponent &&
    match.matchType === "finals" &&
    match.scoreUs === CHAMPIONSHIP.scoreUs &&
    match.scoreThem === CHAMPIONSHIP.scoreThem
  );
}
