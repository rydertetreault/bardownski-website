/** Isolated NHL27 ingestion. No archive imports, persistence, or season overrides. */
import type { ChelstatsData, ClubMatch, ClubMember, ClubStats, MatchPlayerStat } from "./chelstats";

export const NHL27_IDENTITY = Object.freeze({
  gameTitle: "NHL27",
  clubId: "29202",
  platform: "common-gen5",
  season: "2026–2027",
  storageKey: "hockey:nhl27:2026-2027:common-gen5:29202",
} as const);

export const NHL27_STATS_URL = "https://chelstats.app/api/clubs/stats?teamname=Bardownski&console=common-gen5&teamId=29202&strict=true";
export type Nhl27MatchPlayerStat = MatchPlayerStat & { playerId: string };
export interface Nhl27Snapshot {
  identity: typeof NHL27_IDENTITY;
  fetchedAt: string;
  /** Ranking metadata only; not a whole-response freshness guarantee. */
  rankingUpdatedAt?: string;
  data: ChelstatsData;
}

type Row = Record<string, unknown>;
const NAMES: Readonly<Record<string, string>> = {
  rydayro: "RYDER", s1obbyrobby: "ROB", mhut8: "MATT", "u4 pablo": "DYLAN",
  "op wet": "COLIN", "u4 hood": "KADEN", "julio 3026": "JIMMY", "op ding1633": "LOGAN",
};

/** Matches use display names; member.username remains the source gamertag. */
export function resolveNhl27Name(gamertag: string): string {
  const name = gamertag.trim().replace(/\s+/g, " ");
  return Object.hasOwn(NAMES, name.toLowerCase()) ? NAMES[name.toLowerCase()] : name;
}

function fail(path: string, reason: string): never {
  // Paths/reasons are internal constants, never upstream values or response bodies.
  throw new Error(`NHL27 snapshot: ${path} ${reason}`);
}
function row(value: unknown, path: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
  return value as Row;
}
function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) fail(path, "must be a nonempty string");
  return value.trim();
}
function numeric(value: unknown, path: string, integer = false, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" && (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) {
    fail(path, "must be a finite numeric string or number");
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n))) fail(path, "is out of range");
  return n;
}
function count(r: Row, key: string, path: string, signed = false): number {
  return numeric(r[key], `${path}.${key}`, true, signed ? -Number.MAX_SAFE_INTEGER : 0);
}
/** Optional non-core fields: absent/null => neutral value; malformed supplied values still fail. */
function optional(r: Row, key: string, path: string, integer = false, fallback = 0, max = Number.MAX_SAFE_INTEGER): number {
  return r[key] == null ? fallback : numeric(r[key], `${path}.${key}`, integer, 0, max);
}
function optionalRow(value: unknown, path: string): Row {
  return value == null ? {} : row(value, path);
}
function id(value: unknown, path: string): string {
  if (typeof value === "number") return String(numeric(value, path, true, 1));
  const result = text(value, path);
  if (!/^\d+$/.test(result) || /^0+$/.test(result)) fail(path, "must be a positive source ID");
  return result;
}
function equal(value: unknown, expected: string, path: string): void {
  if (value !== expected) fail(path, "does not match the verified NHL27 identity");
}
function record(value: unknown, wins: number, losses: number, otl: number, path: string): string {
  const result = text(value, path);
  if (result !== `${wins}-${losses}-${otl}`) fail(path, "does not match win/loss/OTL totals");
  return result;
}
function iso(value: unknown, path: string): string {
  const result = text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(result) || !Number.isFinite(Date.parse(result))) {
    fail(path, "must be a valid UTC ISO timestamp");
  }
  const normalized = new Date(result).toISOString();
  if (normalized.slice(0, 19) !== result.slice(0, 19)) fail(path, "must be a valid UTC ISO timestamp");
  return normalized;
}

function clubStats(root: Row, team: Row): ClubStats {
  const r = row(root.team_stats, "team_stats");
  if (r.clubId != null) equal(id(r.clubId, "team_stats.clubId"), NHL27_IDENTITY.clubId, "team_stats.clubId");
  const wins = count(r, "wins", "team_stats");
  const losses = count(r, "losses", "team_stats");
  const otl = count(r, "otl", "team_stats");
  const totalGames = count(r, "totalGames", "team_stats");
  if (wins + losses + otl !== totalGames) fail("team_stats.totalGames", "does not match the record");
  const goals = count(r, "goals", "team_stats");
  const goalsAgainst = count(r, "goalsAgainst", "team_stats");
  const rating = optionalRow(root.clubRating, "clubRating");
  return {
    record: record(r.record, wins, losses, otl, "team_stats.record"), wins, losses, otl, totalGames, goals, goalsAgainst,
    // Rates may be recovered exactly from validated totals. Division/rating/history
    // fields are non-core: unknown => 0 (not a claimed competition standing).
    goalsPerGame: optional(r, "goals_per_game", "team_stats", false, totalGames ? goals / totalGames : 0),
    goalsAgainstPerGame: optional(r, "goalsAgainst_per_game", "team_stats", false, totalGames ? goalsAgainst / totalGames : 0),
    seasons: optional(r, "seasons", "team_stats", true),
    titlesWon: optional(r, "titlesWon", "team_stats", true),
    currentDivision: optional(r, "currentDivision", "team_stats", true),
    bestDivision: optional(r, "bestDivision", "team_stats", true, optional(team, "bestDivision", "teamData", true)),
    starLevel: optional(r, "starLevel", "team_stats", true),
    overallRating: optional(rating, "Club Overall Rating", "clubRating", false, 0, 100),
  };
}

function member(value: unknown): ClubMember {
  const p = "memberData[]";
  const r = row(value, p);
  const c = (key: string, signed = false) => count(r, key, p, signed);
  const pct = (key: string) => numeric(r[key], `${p}.${key}`, false, 0, 100);
  const gamesPlayed = c("Games Played"); // Skater GP, NOT goalie GP.
  const goals = c("Goals"), assists = c("Assists"), points = c("Points");
  if (points !== goals + assists) fail(`${p}.Points`, "does not match goals plus assists");
  const goalieGP = c("Goalie games played");
  const goalieWins = c("Goalie wins"), goalieLosses = c("Goalie losses"), goalieOtl = c("Goalie OTLs");
  const goalieSaves = c("Goalie saves"), goalieShots = c("Goalie shots");
  if (goalieSaves > goalieShots || goalieWins + goalieLosses + goalieOtl > goalieGP) fail(p, "has inconsistent goalie totals");
  const rating = optionalRow(r.overallRating, `${p}.overallRating`);
  return {
    username: text(r.Username, `${p}.Username`), position: text(r.Position, `${p}.Position`),
    gamesPlayed, goals, assists, points,
    ppg: optional(r, "PPG", p, false, gamesPlayed ? points / gamesPlayed : 0),
    plusMinus: c("+/-", true), hits: c("Hits"), shots: c("Shots"), shotPct: pct("Shot %"),
    pim: c("PIM"), gwg: c("GWGs"), winPct: pct("Win %"), takeaways: c("Takeaways"), giveaways: c("Giveaways"),
    // These ancillary stats are sometimes unrecovered by chelstats. Neutral
    // compatibility defaults are limited to non-core fields; never GP/G/A/P.
    interceptions: optional(r, "Interceptions", p, true), blockedShots: optional(r, "Blocked shots", p, true),
    faceoffPct: optional(r, "FO %", p, false, 0, 100), passCompPct: optional(r, "Pass %", p, false, 0, 100),
    goalieGP, goalieWins,
    goalieRecord: r["Goalie record"] == null ? `${goalieWins}-${goalieLosses}-${goalieOtl}` : record(r["Goalie record"], goalieWins, goalieLosses, goalieOtl, `${p}.Goalie record`),
    goalieSaves, goalieShots, savePct: pct("Save %"), // Member source is percentage points, unlike matches.
    gaa: numeric(r.GAA, `${p}.GAA`), shutouts: c("Shutouts"),
    shutoutPeriods: optional(r, "Shutout periods", p, true),
    overallRating: optional(rating, "Overall Rating", `${p}.overallRating`, false, 0, 100),
    playstyle: rating.playstyle == null || rating.playstyle === "" ? "" : text(rating.playstyle, `${p}.overallRating.playstyle`),
  };
}

function player(value: unknown, playerId: string, isOurPlayer: boolean): Nhl27MatchPlayerStat {
  const p = "recentGames[].players[][]";
  const r = row(value, p);
  const c = (key: string, signed = false) => count(r, key, p, signed);
  const position = text(r.position, `${p}.position`);
  const name = text(r.playername, `${p}.playername`);
  return {
    playerId: id(playerId, `${p}.playerId`), name: isOurPlayer ? resolveNhl27Name(name) : name,
    position, isGoalie: /^(g|gk|goalie)$/i.test(position), isOurPlayer,
    goals: c("skgoals"), assists: c("skassists"), hits: c("skhits"), shots: c("skshots"),
    plusMinus: c("skplusmin", true), pim: c("skpim"), blockedShots: c("skbs"),
    takeaways: c("sktakeaways"), giveaways: c("skgiveaways"), powerPlayGoals: c("skppg"),
    shortHandedGoals: c("skshg"), gameWinningGoal: c("skgwg"), saves: c("glsaves"),
    shotsAgainst: c("glshots"), goalsAgainst: c("glga"),
    // Public raw glsavepct=0.93 is already the fraction expected by MatchPlayerStat.
    // Do not divide by 100, multiply by 100, or recompute from rounded saves/shots.
    savePct: numeric(r.glsavepct, `${p}.glsavepct`, false, 0, 1), shutoutPeriods: c("glsoperiods"),
  };
}
function toa(r: Row): string {
  const seconds = optional(r, "toa", "recentGames[].clubs[]", true);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function passes(r: Row): number {
  const a = optional(r, "passa", "recentGames[].clubs[]", true);
  const c = optional(r, "passc", "recentGames[].clubs[]", true);
  return a ? Math.round(c / a * 100) : 0;
}
function dnf(r: Row): boolean {
  // Verified public fixture: result=16385 (0x4001) accompanies winnerByDnf=1.
  // Inspect the bit, not a >= threshold. Check both teams to include our DNF losses.
  const result = optional(r, "result", "recentGames[].clubs[]", true, 0, 0x7fffffff);
  const winner = optional(r, "winnerByDnf", "recentGames[].clubs[]", true, 0, 1);
  const goalieWinner = optional(r, "winnerByGoalieDnf", "recentGames[].clubs[]", true, 0, 1);
  return (result & 0x4000) !== 0 || winner === 1 || goalieWinner === 1;
}
function game(value: unknown, matchType: ClubMatch["matchType"]): ClubMatch {
  const p = "recentGames[]";
  const r = row(value, p), clubs = row(r.clubs, `${p}.clubs`);
  const ours = row(clubs[NHL27_IDENTITY.clubId], `${p}.clubs.29202`);
  const opponentId = id(ours.opponentClubId, `${p}.opponentClubId`);
  if (opponentId === NHL27_IDENTITY.clubId) fail(`${p}.opponentClubId`, "cannot be our club");
  const opponent = row(clubs[opponentId], `${p}.opponent`);
  for (const [entry, expected, path] of [[ours, NHL27_IDENTITY.clubId, `${p}.clubs.29202`], [opponent, opponentId, `${p}.opponent`]] as const) {
    const nested = optionalRow(entry.details, `${path}.details`);
    if (nested.clubId != null) equal(id(nested.clubId, `${path}.details.clubId`), expected, `${path}.details.clubId`);
  }
  if (opponent.opponentClubId != null) equal(id(opponent.opponentClubId, `${p}.opponent.opponentClubId`), NHL27_IDENTITY.clubId, `${p}.opponent.opponentClubId`);
  const details = optionalRow(opponent.details, `${p}.opponent.details`);
  const rawPlayers = optionalRow(r.players, `${p}.players`);
  const allPlayers: Nhl27MatchPlayerStat[] = [];
  for (const [clubId, values] of Object.entries(rawPlayers)) {
    if (clubId !== NHL27_IDENTITY.clubId && clubId !== opponentId) fail(`${p}.players`, "contains an unrelated club");
    for (const [playerId, v] of Object.entries(row(values, `${p}.players[]`))) allPlayers.push(player(v, playerId, clubId === NHL27_IDENTITY.clubId));
  }
  const players = allPlayers.filter(p => p.isOurPlayer).sort((a, b) => Number(b.isGoalie) - Number(a.isGoalie) || (b.goals + b.assists) - (a.goals + a.assists));
  const stars = allPlayers.map(p => ({
    name: p.name, isGoalie: p.isGoalie, isOurPlayer: p.isOurPlayer,
    score: Math.round((p.isGoalie ? p.saves * 0.8 + p.savePct * 20 + p.shutoutPeriods * 2 - p.goalsAgainst * 2 : p.goals * 4 + p.assists * 2 + p.shots * 0.3 + p.hits * 0.2) * 10) / 10,
  })).sort((a, b) => b.score - a.score);
  const timestamp = numeric(r.timestamp, `${p}.timestamp`, true, 0, 8640000000000);
  const side = numeric(ours.teamSide, `${p}.teamSide`, true, 0, 1);
  const result = count(ours, "result", `${p}.clubs.29202`);
  return {
    id: id(r.matchId, `${p}.matchId`), timestamp,
    date: new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
    opponent: details.name == null ? `Club #${opponentId}` : text(details.name, `${p}.opponent.details.name`),
    homeAway: side === 0 ? "home" : "away", matchType,
    // Never use recentScore strings, result codes, or the opponent's score to invent a score.
    scoreUs: count(ours, "score", `${p}.clubs.29202`), scoreThem: count(ours, "opponentScore", `${p}.clubs.29202`),
    shotsUs: optional(ours, "shots", p, true), shotsThem: optional(opponent, "shots", p, true),
    toaUs: toa(ours), toaThem: toa(opponent), passCompUs: passes(ours), passCompThem: passes(opponent),
    result: String(result), players, threeStars: stars.length >= 3 ? [stars[0], stars[1], stars[2]] : null,
    forfeit: dnf(ours) || dnf(opponent),
  };
}

/**
 * Pure parser: omitted fetchedAt uses source ranking.updatedAt, never the clock.
 * Fetch supplies the actual retrieval time. Identity metadata is mandatory even
 * for empty seasons, so adapted/frozen NHL26 data cannot pass as a live snapshot.
 * Missing recent groups/players mean no recovered history, not fabricated games.
 */
export function parseNhl27Snapshot(payload: unknown, fetchedAt?: string): Nhl27Snapshot {
  const root = row(payload, "payload"), team = row(root.teamData, "teamData");
  equal(id(team.clubId, "teamData.clubId"), NHL27_IDENTITY.clubId, "teamData.clubId");
  equal(team.name, "Bardownski", "teamData.name");
  equal(team.platform, NHL27_IDENTITY.platform, "teamData.platform");
  const info = optionalRow(team.clubInfo, "teamData.clubInfo");
  if (info.clubId != null) equal(id(info.clubId,"teamData.clubInfo.clubId"), NHL27_IDENTITY.clubId, "teamData.clubInfo.clubId");
  const ranking = row(row(root.clubRanking, "clubRanking").entry, "clubRanking.entry");
  equal(ranking.gameTitle, NHL27_IDENTITY.gameTitle, "clubRanking.entry.gameTitle");
  for (const [key, expected] of [["clubId", NHL27_IDENTITY.clubId], ["name", "Bardownski"], ["platform", NHL27_IDENTITY.platform]]) {
    // Bind the game-title assertion to this club, not an unbound ranking entry.
    // These identity fields are present in the verified public schema and are
    // required even if teamData independently identifies the expected club.
    equal(key === "clubId" ? id(ranking[key], "clubRanking.entry.clubId") : ranking[key], expected, `clubRanking.entry.${key}`);
  }
  const stats = clubStats(root, team);
  if (!Array.isArray(root.memberData)) fail("memberData", "must be an array");
  const members = root.memberData.map(member);
  if (stats.totalGames > 0 && !members.length) fail("memberData", "must contain members for a played season");
  const names = new Set(members.map(m => m.username.toLowerCase()));
  if (names.size !== members.length) fail("memberData", "contains duplicate usernames");
  const recent = optionalRow(root.recentGames, "recentGames");
  const matches: ClubMatch[] = [];
  const groups = { RegularSeason: "regular", ClubFinals: "finals", PrivateGames: "private" } as const;
  for (const [key, type] of Object.entries(groups)) {
    if (recent[key] == null) continue;
    if (!Array.isArray(recent[key])) fail(`recentGames.${key}`, "must be an array");
    matches.push(...recent[key].map(v => game(v, type)));
  }
  if (new Set(matches.map(m => m.id)).size !== matches.length) fail("recentGames", "contains duplicate match IDs");
  matches.sort((a, b) => b.timestamp - a.timestamp);
  return { identity: NHL27_IDENTITY, fetchedAt: iso(fetchedAt ?? ranking.updatedAt, "fetchedAt"), rankingUpdatedAt: iso(ranking.updatedAt, "rankingUpdatedAt"), data: { clubStats: stats, members, matches } };
}

/** One public GET, no cache or fallback. Timeout covers response body decoding too. */
export async function fetchNhl27Snapshot(): Promise<Nhl27Snapshot> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("NHL27 fetch timed out after 20 seconds"));
    }, 20_000);
  });
  try {
    const payload = await Promise.race([timeout, (async () => {
      let response: Response;
      try {
        response = await fetch(NHL27_STATS_URL, { method: "GET", cache: "no-store", signal: controller.signal, credentials: "omit", redirect: "error" });
      } catch {
        throw new Error(controller.signal.aborted ? "NHL27 fetch timed out after 20 seconds" : "NHL27 fetch failed: network request unsuccessful");
      }
      if (!response.ok) throw new Error(`NHL27 fetch failed: HTTP ${response.status}`);
      try { return await response.json() as unknown; }
      catch { throw new Error("NHL27 fetch failed: response is not valid JSON"); }
    })()]);
    return parseNhl27Snapshot(payload, new Date().toISOString());
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
