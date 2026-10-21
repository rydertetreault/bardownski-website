import { getNickname } from "../../../lib/nicknames";
import { resolveNhl27Name } from "../../../lib/nhl27-api";

/**
 * Game-backed records for the Records page, computed on the server from every
 * logged game: the saved 2025–2026 history plus every 2026–2027 game the
 * tracker has stored. Re-run on each revalidation, so records move as games
 * are played. Every record keeps the games behind it.
 */

export interface ArchivePlayer {
  name: string;
  position?: string;
  isGoalie?: boolean;
  isOurPlayer?: boolean;
  [stat: string]: unknown;
}

export interface ArchiveMatch {
  id: string;
  timestamp: number;
  date: string;
  opponent: string;
  scoreUs: number | null;
  scoreThem: number | null;
  matchType?: string;
  shotsUs?: number;
  forfeit?: boolean;
  players?: ArchivePlayer[];
}

/** Season-total row in the shape the Records client already uses. */
export interface LiveMember {
  [stat: string]: string | number;
  username: string;
  name: string;
  position: string;
}

export interface RecordGame {
  id: string;
  date: string;
  opponent: string;
  scoreUs: number;
  scoreThem: number;
  season: string;
  href: string;
}

export interface GamePerformance {
  name: string;
  position: string;
  number: number;
  season: string;
  game: RecordGame;
}

export interface SingleGameRecord {
  id: string;
  title: string;
  category: string;
  unit: "" | "signed";
  tags: string;
  rule: string;
  /** Best single-game performances, best first (ties at the cut-off are kept). */
  ranking: GamePerformance[];
  /** Best performance before the current season, for "record broken" checks. */
  previous: GamePerformance[];
}

export interface TeamGameRecord {
  value: number;
  games: RecordGame[];
  /** Set when the current season beat every earlier logged game. */
  broken?: { previous: number; previousGames: RecordGame[] };
}

export interface SeasonLog {
  key: string;
  label: string;
  games: number;
  /** Games actually played that season, when known (saved games can be fewer). */
  played: number | null;
  firstDate: string;
  lastDate: string;
}

export interface RecordsData {
  currentSeasonKey: string;
  currentSeasonLabel: string;
  seasons: SeasonLog[];
  gameCount: number;
  /** Current-season totals from the live tracker (empty when unavailable). */
  liveMembers: LiveMember[];
  playerGames: SingleGameRecord[];
  team: {
    goals: TeamGameRecord;
    margin: TeamGameRecord;
    shots: TeamGameRecord;
    /** Longest unbroken run of wins inside each season's logged games. */
    streaks: { season: string; value: number; games: RecordGame[] }[];
  };
  syncedAt: string | null;
}

export interface SeasonInput {
  key: string;
  label: string;
  /** Route tag for /matches/[id]?season=… */
  param: string;
  played?: number | null;
  matches: readonly ArchiveMatch[];
  /** Club roster gamertags for this season. Drop-ins (anyone else) never hold or
   * rank in a record. An empty roster fails closed: nobody from that season counts. */
  roster: readonly string[];
}

const RANKING_SIZE = 10;

type Tagged = ArchiveMatch & { scoreUs: number; scoreThem: number; seasonKey: string; seasonParam: string };

/** Match rows carry resolved names or raw gamertags; roster rows carry gamertags.
 * Both resolve to the same key (same rule as Player of the Week). */
const rosterKey = (name: unknown) => resolveNhl27Name(String(name ?? "")).toLowerCase();

function game(m: Tagged): RecordGame {
  return {
    id: m.id, date: m.date, opponent: m.opponent, scoreUs: m.scoreUs, scoreThem: m.scoreThem, season: m.seasonKey,
    href: `/matches/${encodeURIComponent(m.id)}?season=${m.seasonParam}`,
  };
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positionLabel(p: ArchivePlayer): string {
  if (p.isGoalie) return "G";
  const key = String(p.position ?? "").replace(/[\s_-]/g, "").toLowerCase();
  return ({ center: "C", leftwing: "LW", rightwing: "RW", leftdefense: "LD", rightdefense: "RD", defensemen: "D" } as Record<string, string>)[key] ?? "";
}

function best(matches: Tagged[], value: (m: Tagged) => number | null): { value: number; games: Tagged[] } {
  let top = -Infinity;
  let games: Tagged[] = [];
  for (const m of matches) {
    const v = value(m);
    if (v === null) continue;
    if (v > top) { top = v; games = [m]; }
    else if (v === top) games.push(m);
  }
  return { value: Number.isFinite(top) ? top : 0, games: games.sort((a, b) => a.timestamp - b.timestamp) };
}

function teamRecord(matches: Tagged[], currentKey: string, value: (m: Tagged) => number | null): TeamGameRecord {
  const all = best(matches, value);
  const before = best(matches.filter(m => m.seasonKey !== currentKey), value);
  const brokeIt = all.games.length > 0 && all.games.every(g => g.seasonKey === currentKey) && before.games.length > 0 && all.value > before.value;
  return { value: all.value, games: all.games.map(game),
    ...(brokeIt ? { broken: { previous: before.value, previousGames: before.games.map(game) } } : {}) };
}

function longestWinStreak(matches: Tagged[]): Tagged[] {
  let top: Tagged[] = [];
  let run: Tagged[] = [];
  for (const m of [...matches].sort((a, b) => a.timestamp - b.timestamp)) {
    run = m.scoreUs > m.scoreThem ? [...run, m] : [];
    if (run.length > top.length) top = run;
  }
  return top;
}

/** Current-season ClubMember rows → the Records client's member shape. */
export function liveMembersFrom(members: readonly Record<string, unknown>[] | undefined): LiveMember[] {
  return (members ?? []).filter(m => typeof m.username === "string").map(m => ({
    ...(Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "number" || typeof v === "string")) as Record<string, string | number>),
    username: String(m.username), name: getNickname(String(m.username)), position: String(m.position ?? ""),
  }));
}

export function buildRecordsData(
  seasons: readonly SeasonInput[], currentSeasonKey: string,
  { liveMembers = [], syncedAt = null }: { liveMembers?: LiveMember[]; syncedAt?: string | null } = {},
): RecordsData {
  // Private games are scrimmages and don't count. EA flags games the opponent
  // quit as forfeits, but those were really played and keep full stats, so they
  // count; only placeholder forfeits with no game data are skipped.
  const valid = (m: ArchiveMatch): m is ArchiveMatch & { scoreUs: number; scoreThem: number } =>
    m.matchType !== "private" && !(m.forfeit && !m.players?.length) &&
    Number.isFinite(m.scoreUs) && Number.isFinite(m.scoreThem);
  const logs = seasons.map(s => {
    const seen = new Set<string>();
    const matches: Tagged[] = s.matches.filter(valid).filter(m => !seen.has(m.id) && seen.add(m.id))
      .map(m => ({ ...m, seasonKey: s.key, seasonParam: s.param }))
      .sort((a, b) => a.timestamp - b.timestamp);
    return { ...s, matches };
  });
  const matches = logs.flatMap(s => s.matches);
  const rosters = new Map(logs.map(s => [s.key, new Set(s.roster.map(rosterKey).filter(Boolean))]));
  const onRoster = (p: ArchivePlayer, season: string) => rosters.get(season)?.has(rosterKey(p.name)) ?? false;
  const current = currentSeasonKey;

  const singleGame = (
    id: string, title: string, category: string,
    stat: (p: ArchivePlayer) => number | null,
    { goalie = false, unit = "" as "" | "signed", tags = "", rule = "" } = {},
  ): SingleGameRecord => {
    const performances: (GamePerformance & { timestamp: number })[] = [];
    for (const m of matches) {
      for (const p of m.players ?? []) {
        if (p.isOurPlayer === false || Boolean(p.isGoalie) !== goalie || !onRoster(p, m.seasonKey)) continue;
        const number = stat(p);
        if (number === null) continue;
        performances.push({ name: getNickname(p.name), position: positionLabel(p), number, season: m.seasonKey, game: game(m), timestamp: m.timestamp });
      }
    }
    performances.sort((a, b) => b.number - a.number || a.timestamp - b.timestamp);
    const strip = (list: typeof performances) => list.map(e => ({ name: e.name, position: e.position, number: e.number, season: e.season, game: e.game }));
    const cutoff = performances[Math.min(RANKING_SIZE, performances.length) - 1]?.number;
    const earlier = performances.filter(e => e.season !== current);
    return { id, title, category, unit, tags,
      rule: rule || `Highest ${title.toLowerCase().replace(/^(most|best) /, "").replace(/ in one game$/, "")} by one Bardownski ${goalie ? "goalie" : "skater"} in a single logged game. Private games excluded; games the opponent quit early still count. Ties keep every game.`,
      ranking: strip(performances.filter((e, i) => i < RANKING_SIZE || e.number === cutoff)),
      previous: strip(earlier.filter(e => e.number === earlier[0]?.number)) };
  };
  const stat = (key: string) => (p: ArchivePlayer) => finite(p[key]);

  const playerGames = [
    singleGame("game-points", "Most points in one game", "Scoring",
      p => { const g = finite(p.goals), a = finite(p.assists); return g === null || a === null ? null : g + a; },
      { tags: "points pts single game" }),
    singleGame("game-goals", "Most goals in one game", "Scoring", stat("goals"), { tags: "goals single game" }),
    singleGame("game-assists", "Most assists in one game", "Scoring", stat("assists"), { tags: "assists single game" }),
    singleGame("game-shots", "Most shots in one game", "Scoring", stat("shots"), { tags: "shots single game" }),
    singleGame("game-pm", "Best plus/minus in one game", "Efficiency", stat("plusMinus"),
      { unit: "signed", tags: "+/- +/− plus minus single game" }),
    singleGame("game-hits", "Most hits in one game", "Physical", stat("hits"), { tags: "hits single game" }),
    singleGame("game-takeaways", "Most takeaways in one game", "Defense", stat("takeaways"), { tags: "takeaways steals single game" }),
    singleGame("game-block", "Most blocked shots in one game", "Defense", stat("blockedShots"), { tags: "blocks blocked shots single game" }),
    singleGame("game-save", "Most saves in one game", "Goaltending", stat("saves"), { goalie: true, tags: "saves goalie single game" }),
  ].filter(r => r.ranking.length);


  return {
    currentSeasonKey: current,
    currentSeasonLabel: seasons.find(s => s.key === current)?.label ?? current,
    seasons: logs.map(s => ({ key: s.key, label: s.label, games: s.matches.length, played: s.played ?? null,
      firstDate: s.matches[0]?.date ?? "", lastDate: s.matches.at(-1)?.date ?? "" })),
    gameCount: matches.length,
    liveMembers,
    playerGames,
    team: {
      goals: teamRecord(matches, current, m => m.scoreUs),
      margin: teamRecord(matches, current, m => m.scoreUs - m.scoreThem),
      shots: teamRecord(matches, current, m => finite(m.shotsUs)),
      streaks: logs.map(s => { const run = longestWinStreak(s.matches); return { season: s.key, value: run.length, games: run.map(game) }; }),
    },
    syncedAt,
  };
}
