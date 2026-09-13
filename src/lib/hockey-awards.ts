/** Pure NHL27 awards over the supplied tracker data. No storage, clocks or archive fallback. */
import { computeMvpOddsFromMembers, type ChelstatsData, type ClubMember, type ClubMatch, type MatchPlayerStat } from "./chelstats";

export interface SeasonMvpEntry {
  name: string; position: string; isGoalie: boolean; score: number; rank: number; games: number;
}
export type AwardPosition = "F" | "D" | "G";
export interface WeeklyAwardEntry {
  /** Source ID when available; otherwise a normalized name: key. */
  playerId: string;
  name: string; position: AwardPosition; isGoalie: boolean;
  games: number; score: number; rank: number; eligible: boolean;
  goals: number; assists: number; points: number; saves: number; shotsAgainst: number;
  /** 0–100, recomputed from aggregate saves/shots (not averaged percentages). */
  savePct: number;
  /** Goals allowed / actual goalie appearances. */
  gaa: number; shutouts: number; wins: number;
}
export type AwardSkipReason = "invalid-game" | "outside-week" | "future" | "private" | "synthetic"
  | "duplicate-game" | "conflicting-game" | "no-valid-appearances" | "invalid-player"
  | "duplicate-player" | "conflicting-player";
export interface AwardCoverageSample { gameId: string; playerId?: string; reason: AwardSkipReason }
export interface AwardCoverage {
  /** Stored input rows, not an assertion that the upstream week is fully captured. */
  inputGames: number; acceptedGames: number; skippedGames: number;
  acceptedAppearances: number; skippedAppearances: number;
  reasons: Partial<Record<AwardSkipReason, number>>;
  /** At most ten diagnostic examples, containing public IDs only. */
  samples: AwardCoverageSample[];
}
export interface WeeklyAwards {
  /** UTC Monday, inclusive; following Monday, exclusive. */
  start: string; end: string; status: "in-progress" | "complete";
  games: number; minimumGames: 3;
  standings: WeeklyAwardEntry[];
  /** Eligible top scorers, or provisional top scorers if nobody has three role games. */
  leaders: WeeklyAwardEntry[];
  /** Always empty until complete; only eligible, equal-top-score entries win. */
  winners: WeeklyAwardEntry[];
  coverage: AwardCoverage;
}
export interface HockeyAwards {
  asOf: string; seasonMvp: SeasonMvpEntry[];
  currentWeek: WeeklyAwards; lastCompletedWeek: WeeklyAwards;
}
export interface WeeklyAwardHistoryEntry {
  playerId: string; name: string; wins: number; rank: number;
  /** UTC Monday start of the latest completed week won, not a match timestamp. */
  lastWin: string;
}
export interface WeeklyAwardHistory {
  asOf: string;
  /** Latest first; only observed completed weeks with at least one accepted game. */
  weeks: WeeklyAwards[];
  rankings: WeeklyAwardHistoryEntry[];
  /** Completed weeks with at least one eligible winner. */
  awardedWeeks: number;
  /** Sum of ranking wins; shared awards can make this exceed awardedWeeks. */
  totalAwards: number;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
const quantize = (n: number) => Math.round(n * 10) / 10 || 0;
const text = (v: unknown): string => typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
const key = (v: unknown) => text(v).toLowerCase();
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const count = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v >= 0;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function ranked<T extends { score: number; rank: number; name: string; position: string }>(entries: T[]): T[] {
  entries.sort((a, b) => b.score - a.score || compare(a.name, b.name) || compare(a.position, b.position));
  let rank = 0;
  return entries.map((entry, i) => {
    if (i === 0 || entry.score !== entries[i - 1].score) rank = i + 1;
    return { ...entry, rank };
  });
}

/** Uses the unchanged legacy formula and its five-games-in-role gate, not odds.
 * Each source member is scored separately so display-name aliases cannot join players.
 * Invalid scoring inputs disqualify only that role. Inputs are never repaired/rebased.
 */
export function calculateSeasonMvp(members: ClubMember[]): SeasonMvpEntry[] {
  const best = new Map<string, SeasonMvpEntry>();
  for (const m of members) {
    if (!m || !text(m.username) || !text(m.position)) continue;
    const defense = /^(d|sktr)$|defense/i.test(m.position);
    const skaterFields: (keyof ClubMember)[] = ["ppg", "goals", "plusMinus", "hits", "takeaways", "giveaways",
      ...(defense ? ["blockedShots" as const] : ["gwg" as const, "shotPct" as const])];
    const goalieFields: (keyof ClubMember)[] = ["goalieWins", "savePct", "gaa", "shutouts", "shutoutPeriods", "goalieSaves"];
    const skater = count(m.gamesPlayed) && m.gamesPlayed >= 5 && skaterFields.every(k => finite(m[k]) && (k === "plusMinus" || (m[k] as number) >= 0));
    const goalie = count(m.goalieGP) && m.goalieGP >= 5 && goalieFields.every(k => finite(m[k]) && (m[k] as number) >= 0);
    if (!skater && !goalie) continue;
    // Formatting in the existing helper reads these even for an ineligible role.
    const safe = { ...m, gamesPlayed: skater ? m.gamesPlayed : 0, goalieGP: goalie ? m.goalieGP : 0,
      savePct: goalie ? m.savePct : 0, gaa: goalie ? m.gaa : 0 };
    for (const result of computeMvpOddsFromMembers([safe])) {
      if (!finite(result.score)) continue;
      const entry: SeasonMvpEntry = { name: result.name, position: result.position, isGoalie: result.isGoalie,
        score: result.score, rank: 0, games: result.isGoalie ? m.goalieGP : m.gamesPlayed };
      const identity = key(m.username);
      const previous = best.get(identity);
      if (!previous || entry.score > previous.score || (entry.score === previous.score &&
        (entry.games > previous.games || (entry.games === previous.games && compare(entry.position, previous.position) < 0)))) best.set(identity, entry);
    }
  }
  return ranked([...best.values()]);
}

type SourcePlayer = MatchPlayerStat & { playerId?: string };
function position(p: SourcePlayer): AwardPosition | null {
  const role = key(p.position).replace(/[\s_-]/g, "");
  if (/^(g|gk|goalie|goaltender)$/.test(role)) return p.isGoalie === true ? "G" : null;
  if (p.isGoalie !== false) return null;
  if (/^(d|ld|rd|(?:left|right)?defen[sc]e(?:man|men)?)$/.test(role)) return "D";
  if (/^(f|c|lw|rw|forward|center|centre|leftwing|rightwing|winger|skater)$/.test(role)) return "F";
  // SKTR is not evidence of an actual defensive appearance.
  return null;
}
const skaterCounts = ["goals", "assists", "hits", "shots", "gameWinningGoal"] as const;
const optionalCounts = ["blockedShots", "takeaways", "giveaways"] as const;
function validPlayer(p: SourcePlayer, role: AwardPosition): boolean {
  if (role === "G") return [p.saves, p.shotsAgainst, p.goalsAgainst].every(count)
    && p.saves + p.goalsAgainst === p.shotsAgainst
    && (p.shutoutPeriods == null || (count(p.shutoutPeriods) && p.shutoutPeriods <= 3));
  return skaterCounts.every(k => count(p[k])) && finite(p.plusMinus) && Number.isSafeInteger(p.plusMinus)
    && optionalCounts.every(k => p[k] == null || count(p[k])) && p.goals <= p.shots;
}
// Stable serialization distinguishes malformed values and ignores object insertion order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).sort(compare).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => compare(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return `${typeof value}:${String(value)}`;
}
function fingerprint(m: ClubMatch): string {
  return canonical({ timestamp: m.timestamp, matchType: m.matchType, scoreUs: m.scoreUs, scoreThem: m.scoreThem,
    forfeit: !!m.forfeit, synthetic: (m as ClubMatch & { synthetic?: boolean }).synthetic,
    players: Array.isArray(m.players) ? m.players.filter(p => p?.isOurPlayer === true) : m.players });
}
interface Totals {
  playerId: string; name: string; position: AwardPosition; games: number; goals: number; assists: number;
  hits: number; shots: number; plusMinus: number; gwg: number; blockedShots: number; takeaways: number; giveaways: number;
  saves: number; shotsAgainst: number; ga: number; shutouts: number; weightedShutouts: number; wins: number;
}
function weekly(matches: ClubMatch[], start: number, now: number): WeeklyAwards {
  const end = start + WEEK;
  const status = now >= end ? "complete" : "in-progress";
  const coverage: AwardCoverage = { inputGames: matches.length, acceptedGames: 0, skippedGames: 0,
    acceptedAppearances: 0, skippedAppearances: 0, reasons: {}, samples: [] };
  function skip(reason: AwardSkipReason, gameId: string, n = 1, playerId?: string) {
    if (playerId !== undefined) coverage.skippedAppearances += n; else coverage.skippedGames += n;
    coverage.reasons[reason] = (coverage.reasons[reason] ?? 0) + n;
    if (coverage.samples.length < 10) coverage.samples.push({ gameId, reason, ...(playerId === undefined ? {} : { playerId }) });
  }
  const groups = new Map<string, ClubMatch[]>();
  for (const m of matches) {
    if (!m || !text(m.id)) { skip("invalid-game", "missing-id"); continue; }
    const group = groups.get(m.id) ?? []; group.push(m); groups.set(m.id, group);
  }
  const accepted: ClubMatch[] = [];
  for (const [id, group] of [...groups].sort(([a], [b]) => compare(a, b))) {
    const m = group[0];
    if (group.some(other => fingerprint(other) !== fingerprint(m))) { skip("conflicting-game", id, group.length); continue; }
    if (group.length > 1) skip("duplicate-game", id, group.length - 1);
    if (!count(m.timestamp) || !finite(m.timestamp * 1000) || !count(m.scoreUs) || !count(m.scoreThem) || !Array.isArray(m.players)) { skip("invalid-game", id); continue; }
    if (m.matchType === "private") { skip("private", id); continue; }
    if (m.matchType !== "regular" && m.matchType !== "finals") { skip("invalid-game", id); continue; }
    if (/^(forfeit|synthetic)(?:-|:)/i.test(id) || (m as ClubMatch & { synthetic?: boolean }).synthetic === true) { skip("synthetic", id); continue; }
    const time = m.timestamp * 1000;
    if (time > now) { skip("future", id); continue; }
    if (time < start || time >= end) { skip("outside-week", id); continue; }
    accepted.push(m);
  }
  // Only unambiguous name aliases can join ID-less historical rows to source IDs.
  const aliases = new Map<string, Set<string>>();
  for (const m of accepted) for (const p of m.players as SourcePlayer[]) {
    if (!p?.isOurPlayer || !text(p.name) || !text(p.playerId)) continue;
    const ids = aliases.get(key(p.name)) ?? new Set<string>(); ids.add(text(p.playerId)); aliases.set(key(p.name), ids);
  }
  function identity(p: SourcePlayer): string {
    const ids = aliases.get(key(p.name));
    return text(p.playerId) || (ids?.size === 1 ? [...ids][0] : `name:${key(p.name)}`);
  }
  const totals = new Map<string, Totals>();
  for (const m of accepted) {
    const players = new Map<string, SourcePlayer[]>();
    for (const p of m.players as SourcePlayer[]) {
      if (!p || p.isOurPlayer !== true) continue;
      if (!text(p.name)) { skip("invalid-player", m.id, 1, text(p.playerId) || "missing-name"); continue; }
      const id = identity(p); const rows = players.get(id) ?? []; rows.push(p); players.set(id, rows);
    }
    let appearances = 0;
    for (const [id, rows] of [...players].sort(([a], [b]) => compare(a, b))) {
      const p = rows[0];
      const projection = (row: SourcePlayer) => canonical({ ...row, playerId: id, name: key(row.name) });
      if (rows.some(row => projection(row) !== projection(p))) { skip("conflicting-player", m.id, rows.length, id); continue; }
      if (rows.length > 1) skip("duplicate-player", m.id, rows.length - 1, id);
      const role = position(p);
      if (!role || !validPlayer(p, role)) { skip("invalid-player", m.id, 1, id); continue; }
      const roleKey = JSON.stringify([id, role]);
      let t = totals.get(roleKey);
      if (!t) {
        t = { playerId: id, name: text(p.name), position: role, games: 0, goals: 0, assists: 0, hits: 0,
          shots: 0, plusMinus: 0, gwg: 0, blockedShots: 0, takeaways: 0, giveaways: 0,
          saves: 0, shotsAgainst: 0, ga: 0, shutouts: 0, weightedShutouts: 0, wins: 0 };
        totals.set(roleKey, t);
      }
      if (compare(text(p.name), t.name) < 0) t.name = text(p.name);
      t.games++; t.wins += m.scoreUs > m.scoreThem ? 1 : 0; appearances++;
      if (role === "G") {
        t.saves += p.saves; t.shotsAgainst += p.shotsAgainst; t.ga += p.goalsAgainst;
        if (p.goalsAgainst === 0 && p.shotsAgainst > 0) {
          t.shutouts++;
          t.weightedShutouts += p.shutoutPeriods == null ? (m.forfeit ? 0.5 : 1)
            : p.shutoutPeriods >= 3 ? 1 : p.shutoutPeriods === 2 ? 0.75 : 0.5;
        }
      } else {
        t.goals += p.goals; t.assists += p.assists; t.hits += p.hits; t.shots += p.shots;
        t.plusMinus += p.plusMinus; t.gwg += p.gameWinningGoal;
        t.blockedShots += p.blockedShots ?? 0; t.takeaways += p.takeaways ?? 0; t.giveaways += p.giveaways ?? 0;
      }
    }
    coverage.acceptedAppearances += appearances;
    if (appearances) coverage.acceptedGames++; else skip("no-valid-appearances", m.id);
  }
  const best = new Map<string, WeeklyAwardEntry>();
  for (const t of totals.values()) {
    const gp = t.games, points = t.goals + t.assists;
    const savePct = t.shotsAgainst > 0 ? t.saves / t.shotsAgainst * 100 : 0;
    const gaa = t.ga / gp;
    // Historical weekly weights, with the requested three-role-game qualification.
    let perGame: number;
    if (t.position === "G") perGame = Math.max(0, (savePct - 65) * 2 + (5 - gaa) * 4
      + t.weightedShutouts / gp * 22 + Math.max(t.wins / gp * 100 - 50, 0) * 0.2 + t.saves / gp * 1.5);
    else if (t.position === "D") perGame = points / gp * 16 + Math.max(t.plusMinus, 0) / gp * 6
      + t.hits / gp * 0.8 + t.blockedShots / gp * 1.5 + t.takeaways / gp - t.giveaways / gp * 0.5;
    else perGame = points / gp * 8 + Math.max(t.plusMinus, 0) / gp * 3 + t.gwg / gp * 15
      + (t.shots > 0 ? t.goals / t.shots * 100 : 0) * 0.15 + t.hits / gp * 0.3
      + t.takeaways / gp * 0.3 - t.giveaways / gp * 0.2 + t.blockedShots / gp * 0.4;
    const eligible = gp >= 3;
    const rawScore = perGame * (coverage.acceptedGames < 3 || eligible ? Math.sqrt(gp) : 1);
    if (!finite(rawScore * 10)) continue;
    const entry: WeeklyAwardEntry = { playerId: t.playerId, name: t.name, position: t.position, isGoalie: t.position === "G",
      games: gp, score: quantize(rawScore), rank: 0, eligible, goals: t.goals, assists: t.assists, points,
      saves: t.saves, shotsAgainst: t.shotsAgainst, savePct, gaa, shutouts: t.shutouts, wins: t.wins };
    const previous = best.get(t.playerId);
    if (!previous || (entry.eligible && !previous.eligible) || (entry.eligible === previous.eligible &&
      (entry.score > previous.score || (entry.score === previous.score && compare(entry.position, previous.position) < 0)))) best.set(t.playerId, entry);
  }
  const standings = ranked([...best.values()]);
  const eligible = standings.filter(p => p.eligible);
  const candidates = eligible.length ? eligible : standings;
  const leaders = candidates.filter(p => p.score === candidates[0]?.score);
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), status,
    games: coverage.acceptedGames, minimumGames: 3, standings, leaders,
    winners: status === "complete" ? eligible.filter(p => p.score === eligible[0]?.score) : [], coverage };
}

/** asOf must include an explicit timezone; invalid dates throw rather than use a clock. */
export function calculateHockeyAwards(data: ChelstatsData, asOf: string): HockeyAwards {
  const now = Date.parse(asOf);
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(asOf) || !finite(now)) throw new RangeError("Awards asOf must be an ISO timestamp with timezone");
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  const monday = day.getTime();
  return { asOf: new Date(now).toISOString(), seasonMvp: calculateSeasonMvp(data.members),
    currentWeek: weekly(data.matches, monday, now), lastCompletedWeek: weekly(data.matches, monday - WEEK, now) };
}

/** Pure history over current NHL27 tracker matches supplied by the caller (no archive fallback).
 * Candidate weeks come only from representable source timestamps, never a calendar-range loop.
 * Every calculation receives ALL input rows so cross-week/invalid conflicts still fail closed.
 * Empty/rejected-only weeks are omitted; accepted weeks without eligible winners remain visible.
 * Identity is weekly()'s playerId, including its within-week unambiguous name aliases. We do not
 * infer aliases across weeks: unresolved ID-less winners keep their normalized name: key, separate
 * from source IDs even if names match. Names alone cannot distinguish two ID-less people.
 * The display name is the lexically smallest winning name for that identity, independent of order.
 */
export function calculateWeeklyAwardHistory(matches: ClubMatch[], asOf: string): WeeklyAwardHistory {
  const now = Date.parse(asOf);
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(asOf) || !finite(now)) throw new RangeError("Awards asOf must be an ISO timestamp with timezone");
  const starts = new Set<number>();
  for (const m of matches) {
    if (!m || !finite(m.timestamp)) continue;
    const day = new Date(m.timestamp * 1000);
    if (!finite(day.getTime())) continue;
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    const start = day.getTime(), end = start + WEEK;
    // Date's finite representable range is narrower than Number's finite range.
    if (finite(start) && finite(new Date(end).getTime()) && end <= now) starts.add(start);
  }
  const weeks = [...starts].sort((a, b) => b - a)
    .map(start => weekly(matches, start, now)).filter(week => week.games > 0);
  const winners = new Map<string, WeeklyAwardHistoryEntry>();
  let awardedWeeks = 0, totalAwards = 0;
  for (const week of weeks) {
    const seen = new Set<string>();
    for (const winner of week.winners) {
      const previous = winners.get(winner.playerId);
      if (previous && compare(winner.name, previous.name) < 0) previous.name = winner.name;
      if (seen.has(winner.playerId)) continue;
      seen.add(winner.playerId);
      if (previous) previous.wins++;
      else winners.set(winner.playerId, { playerId: winner.playerId, name: winner.name,
        wins: 1, rank: 0, lastWin: week.start });
    }
    if (seen.size) awardedWeeks++;
    totalAwards += seen.size;
  }
  const rankings = [...winners.values()].sort((a, b) => b.wins - a.wins
    || compare(a.name, b.name) || compare(a.playerId, b.playerId));
  let rank = 0;
  rankings.forEach((entry, i) => {
    if (i === 0 || entry.wins !== rankings[i - 1].wins) rank = i + 1;
    entry.rank = rank;
  });
  return { asOf: new Date(now).toISOString(), weeks, rankings, awardedWeeks, totalAwards };
}
