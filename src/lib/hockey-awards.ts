/** Pure NHL27 awards over the supplied tracker data. No storage, clocks or archive fallback. */
import { computeMvpOddsFromMembers, mvpDefensePerGame, mvpForwardPerGame, mvpMarketFromScores, type MvpSkaterRates, type ChelstatsData, type ClubMember, type ClubMatch, type MatchPlayerStat } from "./chelstats";
import { resolveNhl27Name } from "./nhl27-api";
import { addClubWeeks, clubWeekStart } from "./club-time";

export interface SeasonMvpEntry {
  name: string; position: string; isGoalie: boolean; score: number; rank: number; games: number;
  /** Implied chance to finish first, 0–1, computed across the final ranked field (not per player).
   * Shares the odds table's conversion: normalized scores cubed, then divided by the field total. */
  probability: number;
  /** American odds for `probability`; "—" when no market exists (zero score or a one-player field). */
  americanOdds: string;
  /** Season totals for the scored role, straight from the source member row. */
  goals: number; assists: number; points: number;
  saves: number; savePct: number; gaa: number; shutouts: number;
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
  | "duplicate-player" | "conflicting-player" | "drop-in";
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
  /** Monday 00:00 Central Time, inclusive; following Monday 00:00 Central, exclusive (see club-time.ts). */
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
  /** Central-Time Monday start of the latest completed week won, not a match timestamp. */
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

/** Weekly goalie replacement level: backups on this team sit around 67-68% SV%. */
const GOALIE_REPLACEMENT_SV_PCT = 65;
const GOALIE_REPLACEMENT_GAA = 5;
/** Points per SV% point above replacement. Calibrated on 2026-27 weeks so a .800 week
 * (a really good week here) lands with strong forward weeks (~100-120 per game) and a
 * .730 week (the season average) near the median skater week. */
const GOALIE_SV_PCT_WEIGHT = 5;
/** Sustained-goaltending bonus: each game in the week earns 1 point per SV% point the
 * week's save percentage sits above .700, so holding a good rate over more games is
 * rewarded beyond sqrt(games). Below .700 the bonus is 0. */
const GOALIE_SUSTAIN_SV_PCT = 70;
const GOALIE_SUSTAIN_WEIGHT = 1;
const quantize = (n: number) => Math.round(n * 10) / 10 || 0;
const text = (v: unknown): string => typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
const key = (v: unknown) => text(v).toLowerCase();
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const count = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v >= 0;
// Display totals only; the score never depends on these and an unreported total shows as 0.
const total = (v: unknown): number => finite(v) && v >= 0 ? v : 0;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function ranked<T extends { score: number; rank: number; name: string; position: string }>(entries: T[]): T[] {
  entries.sort((a, b) => b.score - a.score || compare(a.name, b.name) || compare(a.position, b.position));
  let rank = 0;
  return entries.map((entry, i) => {
    if (i === 0 || entry.score !== entries[i - 1].score) rank = i + 1;
    return { ...entry, rank };
  });
}

/** Uses the unchanged legacy formula and its five-games-in-role gate for scoring and order.
 * Each source member is scored separately so display-name aliases cannot join players.
 * Invalid scoring inputs disqualify only that role. Inputs are never repaired/rebased.
 * Odds/probability are then derived once across the final deduplicated field — the
 * per-member call below sees a field of one, so its own odds are discarded.
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
        score: result.score, rank: 0, probability: 0, americanOdds: "—", games: result.isGoalie ? m.goalieGP : m.gamesPlayed,
        goals: result.isGoalie ? 0 : total(m.goals), assists: result.isGoalie ? 0 : total(m.assists),
        points: result.isGoalie ? 0 : total(m.goals) + total(m.assists),
        saves: result.isGoalie ? total(m.goalieSaves) : 0, savePct: result.isGoalie ? total(m.savePct) : 0,
        gaa: result.isGoalie ? total(m.gaa) : 0, shutouts: result.isGoalie ? total(m.shutouts) : 0 };
      const identity = key(m.username);
      const previous = best.get(identity);
      if (!previous || entry.score > previous.score || (entry.score === previous.score &&
        (entry.games > previous.games || (entry.games === previous.games && compare(entry.position, previous.position) < 0)))) best.set(identity, entry);
    }
  }
  // Market lines are index-aligned with the sorted board; exact score ties share odds as they share a rank.
  const board = ranked([...best.values()]);
  const market = mvpMarketFromScores(board.map(entry => entry.score));
  return board.map((entry, i) => ({ ...entry, ...market[i] }));
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
    && optionalCounts.every(k => p[k] == null || count(p[k]));
  // EA sometimes reports 0 shots on a game the player scored in (e.g. deflections).
  // That is real game data, not a reason to drop the whole appearance.
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
  saves: number; shotsAgainst: number; ga: number; shutouts: number; weightedShutouts: number;
  shutoutPeriods: number; wins: number;
}
const savePctOf = (t: Totals) => t.shotsAgainst > 0 ? t.saves / t.shotsAgainst * 100 : 0;
/** Per-game score for one role's weekly totals.
 * Skaters use the season MVP per-game formulas verbatim. Goalies use the MVP goalie
 * terms, but only for production they earn: SV% and GAA count above replacement
 * level (SV% reweighted to the skater scale), and there is no per-save workload term.
 * A replacement-level losing start scores 0, like a skater game with nothing on the sheet. */
function perGameScore(t: Totals): number {
  const gp = t.games;
  if (t.position === "G") {
    const gaa = t.ga / gp;
    return Math.max(savePctOf(t) - GOALIE_REPLACEMENT_SV_PCT, 0) * GOALIE_SV_PCT_WEIGHT
      + (t.shotsAgainst > 0 ? Math.max(GOALIE_REPLACEMENT_GAA - gaa, 0) * 3 : 0)
      + t.weightedShutouts / gp * 20
      + t.shutoutPeriods / gp * 30
      + t.wins / gp * 100 * 0.3;
  }
  const points = t.goals + t.assists;
  const rates: MvpSkaterRates = { ppg: points / gp, goalsPerGame: t.goals / gp,
    plusMinusPerGame: Math.max(t.plusMinus, 0) / gp, gwgPerGame: t.gwg / gp,
    shotPct: t.shots > 0 ? t.goals / t.shots * 100 : 0, hitsPerGame: t.hits / gp,
    blockedShotsPerGame: t.blockedShots / gp, takeawaysPerGame: t.takeaways / gp,
    giveawaysPerGame: t.giveaways / gp };
  return t.position === "D" ? mvpDefensePerGame(rates) : mvpForwardPerGame(rates);
}
/** Club roster keys. Match rows carry resolved display names ("MATT") or raw gamertags
 * for unmapped members; roster rows carry gamertags. Both resolve to the same key. */
function rosterKeys(members: readonly ClubMember[]): Set<string> {
  return new Set(members.map(m => key(resolveNhl27Name(text(m.username)))).filter(Boolean));
}
/** Drop-in guests (anyone not on the club roster) NEVER enter Player of the Week:
 * no standings, no leaders, no winners. An empty roster fails closed (nobody qualifies). */
function weekly(matches: ClubMatch[], start: number, now: number, members: readonly ClubMember[]): WeeklyAwards {
  const roster = rosterKeys(members);
  const end = addClubWeeks(start, 1);
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
    if (!p?.isOurPlayer || !text(p.name) || !text(p.playerId) || !roster.has(key(resolveNhl27Name(text(p.name))))) continue;
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
      if (!roster.has(key(resolveNhl27Name(text(p.name))))) { skip("drop-in", m.id, 1, text(p.playerId) || key(p.name)); continue; }
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
          saves: 0, shotsAgainst: 0, ga: 0, shutouts: 0, weightedShutouts: 0, shutoutPeriods: 0, wins: 0 };
        totals.set(roleKey, t);
      }
      if (compare(text(p.name), t.name) < 0) t.name = text(p.name);
      t.games++; t.wins += m.scoreUs > m.scoreThem ? 1 : 0; appearances++;
      if (role === "G") {
        t.saves += p.saves; t.shotsAgainst += p.shotsAgainst; t.ga += p.goalsAgainst;
        // Like shutouts, a scoreless period only counts when the goalie actually faced shots.
        if (p.shotsAgainst > 0) t.shutoutPeriods += p.shutoutPeriods ?? 0;
        if (p.goalsAgainst === 0 && p.shotsAgainst > 0) {
          t.shutouts++;
          t.weightedShutouts += p.shutoutPeriods == null ? (m.forfeit ? 0.5 : 1)
            : p.shutoutPeriods >= 3 ? 1 : p.shutoutPeriods === 2 ? 0.75 : 0.5;
        }
      } else {
        // Every goal is a shot on goal; keeps shooting % <= 100 when EA under-reports shots.
        t.goals += p.goals; t.assists += p.assists; t.hits += p.hits; t.shots += Math.max(p.shots, p.goals);
        t.plusMinus += p.plusMinus; t.gwg += p.gameWinningGoal;
        t.blockedShots += p.blockedShots ?? 0; t.takeaways += p.takeaways ?? 0; t.giveaways += p.giveaways ?? 0;
      }
    }
    coverage.acceptedAppearances += appearances;
    if (appearances) coverage.acceptedGames++; else skip("no-valid-appearances", m.id);
  }
  // Skater games (forward + defense) merge into one skater entry: a player who swaps between
  // forward and defense keeps every game, with a per-game score that is the games-weighted
  // average of each role's per-game score. Goalie games are scored separately as their own
  // entry and never mixed with skater games; a player shows whichever entry is stronger.
  const entryGroups = new Map<string, Totals[]>();
  for (const t of totals.values()) {
    const group = JSON.stringify([t.playerId, t.position === "G" ? "G" : "S"]);
    const rows = entryGroups.get(group) ?? []; rows.push(t); entryGroups.set(group, rows);
  }
  const best = new Map<string, WeeklyAwardEntry>();
  for (const roles of entryGroups.values()) {
    const playerId = roles[0].playerId;
    let weighted = 0, sustain = 0, gp = 0;
    let primary: { t: Totals; perGame: number } | null = null;
    for (const t of roles) {
      const rolePerGame = perGameScore(t);
      weighted += rolePerGame * t.games; gp += t.games;
      if (t.position === "G") sustain += Math.max(savePctOf(t) - GOALIE_SUSTAIN_SV_PCT, 0) * GOALIE_SUSTAIN_WEIGHT * t.games;
      // Displayed position: the role played most this week (ties: higher per-game score, then F < D < G order).
      if (!primary || t.games > primary.t.games || (t.games === primary.t.games &&
        (rolePerGame > primary.perGame || (rolePerGame === primary.perGame && compare(t.position, primary.t.position) < 0)))) primary = { t, perGame: rolePerGame };
    }
    if (!primary || gp === 0) continue;
    const perGame = weighted / gp;
    const eligible = gp >= 3;
    const rawScore = perGame * (coverage.acceptedGames < 3 || eligible ? Math.sqrt(gp) : 1) + sustain;
    if (!finite(rawScore * 10)) continue;
    const sum = (k: keyof Totals) => roles.reduce((n, t) => n + (t[k] as number), 0);
    const goalie = roles.find(t => t.position === "G");
    const goals = sum("goals"), assists = sum("assists");
    const name = roles.map(t => t.name).sort(compare)[0];
    const entry: WeeklyAwardEntry = { playerId, name, position: primary.t.position, isGoalie: primary.t.position === "G",
      games: gp, score: quantize(rawScore), rank: 0, eligible, goals, assists, points: goals + assists,
      saves: sum("saves"), shotsAgainst: sum("shotsAgainst"), savePct: goalie ? savePctOf(goalie) : 0,
      gaa: goalie ? goalie.ga / goalie.games : 0, shutouts: sum("shutouts"), wins: sum("wins") };
    const previous = best.get(playerId);
    if (!previous || (entry.eligible && !previous.eligible) || (entry.eligible === previous.eligible &&
      (entry.score > previous.score || (entry.score === previous.score && compare(entry.position, previous.position) < 0)))) best.set(playerId, entry);
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
  const monday = clubWeekStart(now);
  return { asOf: new Date(now).toISOString(), seasonMvp: calculateSeasonMvp(data.members),
    currentWeek: weekly(data.matches, monday, now, data.members), lastCompletedWeek: weekly(data.matches, addClubWeeks(monday, -1), now, data.members) };
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
/** `members` is the club roster for the same season; drop-in guests never win or rank. */
export function calculateWeeklyAwardHistory(matches: ClubMatch[], asOf: string, members: readonly ClubMember[]): WeeklyAwardHistory {
  const now = Date.parse(asOf);
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(asOf) || !finite(now)) throw new RangeError("Awards asOf must be an ISO timestamp with timezone");
  const starts = new Set<number>();
  for (const m of matches) {
    if (!m || !finite(m.timestamp)) continue;
    const start = clubWeekStart(m.timestamp * 1000), end = addClubWeeks(start, 1);
    // Date's finite representable range is narrower than Number's finite range.
    if (finite(start) && finite(new Date(end).getTime()) && end <= now) starts.add(start);
  }
  const weeks = [...starts].sort((a, b) => b - a)
    .map(start => weekly(matches, start, now, members)).filter(week => week.games > 0);
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
