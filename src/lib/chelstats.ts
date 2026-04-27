/**
 * Server-side chelstats API integration.
 *
 * Single endpoint provides club stats, member stats, and recent match history.
 * https://chelstats.app/api/clubs/stats?teamname=Bardownskii&console=common-gen5&strict=true
 */

import type {
  SeasonData,
  ParsedStats,
  StatEntry,
  SaveEntry,
  RosterEntry,
  MvpOddsEntry,
} from "@/lib/discord";

const CHELSTATS_URL = "https://chelstats.app/api/clubs/stats";
const TEAM_NAME = "Bardownskii";
const CONSOLE = "common-gen5";
const CLUB_ID = "149602";

// Gamertag → real name (used for stats display, matches getNickname keys)
const GAMERTAG_TO_NAME: Record<string, string> = {
  "Rydayro": "RYDER",
  "S1obbyRobby": "ROB",
  "Mhut8": "MATT",
  "u4 Pablo": "DYLAN",
  "oP wet": "COLIN",
  "u4 Hood": "KADEN",
  "Julio 3026": "JIMMY",
  "oP Ding1633": "LOGAN",
};

function resolveName(gamertag: string): string {
  return GAMERTAG_TO_NAME[gamertag] || gamertag;
}

/* ── Raw API response types (only fields we use) ──────────────────────── */

interface RawClubEntry {
  score: string;
  opponentScore: string;
  opponentClubId: string;
  teamSide: string;
  shots: string;
  toa: string;
  passa: string;
  passc: string;
  ppg: string;
  ppo: string;
  result: string;
  details: { name: string; clubId: number };
  goals: string;
  goalsAgainst: string;
  memberString: string;
}

interface RawMatchPlayer {
  playername: string;
  position: string;
  skgoals: string;
  skassists: string;
  skhits: string;
  skshots: string;
  skplusmin: string;
  skpim: string;
  skshotpct: string;
  skpasspct: string;
  sktakeaways: string;
  skgiveaways: string;
  skbs: string;
  ratingOffense: string;
  ratingDefense: string;
  ratingTeamplay: string;
  glsaves: string;
  glshots: string;
  glga: string;
  glgaa: string;
  glsavepct: string;
  glsoperiods: string;
  [key: string]: string;
}

interface RawGame {
  matchId: string;
  timestamp: number;
  timeAgo: { number: number; unit: string };
  clubs: Record<string, RawClubEntry>;
  players: Record<string, Record<string, RawMatchPlayer>>;
}

interface RawTeamStats {
  record: string;
  wins: string;
  losses: string;
  otl: string;
  goals: string;
  goalsAgainst: string;
  goals_per_game: string;
  goalsAgainst_per_game: string;
  seasons: string;
  titlesWon: string;
  currentDivision: string;
  bestDivision: string;
  starLevel: string;
  rankingPoints: string;
  promotions: string;
  holds: string;
  relegations: string;
  divGroupsWon: string;
  leaguesWon: string;
  totalGames: string;
  clubfinalsplayed: string;
  [key: string]: string;
}

interface RawMember {
  Username: string;
  Platform: string;
  Position: string;
  Record: string;
  "Games Played": string;
  Goals: string;
  Assists: string;
  Points: string;
  PPG: string;
  "+/-": string;
  Hits: string;
  Shots: string;
  "Shot %": string;
  PIM: string;
  Takeaways: string;
  Giveaways: string;
  "Win %": string;
  Wins: string;
  Losses: string;
  OTLs: string;
  GWGs: string;
  "Goalie games played": string;
  "Goalie wins": string;
  "Goalie losses": string;
  "Save %": string;
  GAA: string;
  Shutouts: string;
  "Goalie saves": string;
  "Goalie shots": string;
  "Goalie record": string;
  [key: string]: string | Record<string, unknown>;
}

interface ChelstatsApiResponse {
  team_stats: RawTeamStats;
  teamData: Record<string, string>;
  memberData: Record<string, RawMember>;
  recentGames: {
    RegularSeason: RawGame[];
    ClubFinals: RawGame[];
    PrivateGames: RawGame[];
  };
  clubRating: {
    "Club Overall Rating": number;
    "Category Ratings": Record<string, number>;
  };
  top100Ranking: string;
}

/* ── Transformed types ────────────────────────────────────────────────── */

export interface ClubStats {
  record: string;
  wins: number;
  losses: number;
  otl: number;
  goals: number;
  goalsAgainst: number;
  goalsPerGame: number;
  goalsAgainstPerGame: number;
  totalGames: number;
  seasons: number;
  titlesWon: number;
  currentDivision: number;
  bestDivision: number;
  starLevel: number;
  overallRating: number;
}

export interface ClubMember {
  username: string;
  position: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  ppg: number;
  plusMinus: number;
  hits: number;
  shots: number;
  shotPct: number;
  pim: number;
  gwg: number;
  winPct: number;
  takeaways: number;
  giveaways: number;
  interceptions: number;
  blockedShots: number;
  faceoffPct: number;
  passCompPct: number;
  goalieGP: number;
  goalieWins: number;
  goalieRecord: string;
  goalieSaves: number;
  goalieShots: number;
  savePct: number;
  gaa: number;
  shutouts: number;
  shutoutPeriods: number;
  overallRating: number;
  playstyle: string;
}

export interface MatchPlayerStat {
  name: string;
  position: string;
  goals: number;
  assists: number;
  hits: number;
  shots: number;
  plusMinus: number;
  pim: number;
  powerPlayGoals: number;
  shortHandedGoals: number;
  gameWinningGoal: number;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  savePct: number;
  isGoalie: boolean;
  isOurPlayer: boolean;
}

export interface ThreeStar {
  name: string;
  score: number;
  isOurPlayer: boolean;
  isGoalie: boolean;
}

export interface ClubMatch {
  id: string;
  timestamp: number;
  date: string;
  opponent: string;
  homeAway: "home" | "away";
  scoreUs: number;
  scoreThem: number;
  matchType: "regular" | "finals" | "private";
  shotsUs: number;
  shotsThem: number;
  toaUs: string;
  toaThem: string;
  passCompUs: number;
  passCompThem: number;
  result: string;
  players: MatchPlayerStat[];
  threeStars: [ThreeStar, ThreeStar, ThreeStar] | null;
  forfeit?: boolean;
}

export interface ChelstatsData {
  clubStats: ClubStats;
  members: ClubMember[];
  matches: ClubMatch[];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function num(val: string | undefined): number {
  return parseInt(val || "0") || 0;
}

function flt(val: string | undefined): number {
  return parseFloat(val || "0") || 0;
}

function formatToa(seconds: string | undefined): string {
  const s = parseInt(seconds || "0") || 0;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function passCompPct(attempts: string | undefined, completions: string | undefined): number {
  const a = num(attempts);
  const c = num(completions);
  if (a === 0) return 0;
  return Math.round((c / a) * 100);
}

function transformGame(
  game: RawGame,
  matchType: ClubMatch["matchType"]
): ClubMatch | null {
  const ourClub = game.clubs[CLUB_ID];
  if (!ourClub) return null;

  const opponentId = ourClub.opponentClubId;
  const opponentClub = game.clubs[opponentId];

  // Extract per-match player stats for our club
  const rawPlayers = game.players?.[CLUB_ID] ?? {};
  const players: MatchPlayerStat[] = Object.values(rawPlayers).map((p) => {
    const isGoalie = num(p.glshots) > 0 || p.position === "goalie";
    return {
      name: resolveName(p.playername || "Unknown"),
      position: p.position || "skater",
      goals: num(p.skgoals),
      assists: num(p.skassists),
      hits: num(p.skhits),
      shots: num(p.skshots),
      plusMinus: parseInt(p.skplusmin || "0") || 0,
      pim: num(p.skpim),
      powerPlayGoals: num(p.skppg),
      shortHandedGoals: num(p.skshg),
      gameWinningGoal: num(p.skgwg),
      saves: num(p.glsaves),
      shotsAgainst: num(p.glshots),
      goalsAgainst: num(p.glga),
      savePct: flt(p.glsavepct),
      isGoalie,
      isOurPlayer: true,
    };
  });

  // Sort: goalies first, then by points (goals + assists) descending
  players.sort((a, b) => {
    if (a.isGoalie !== b.isGoalie) return a.isGoalie ? -1 : 1;
    return (b.goals + b.assists) - (a.goals + a.assists);
  });

  // Calculate three stars from performance stats (both teams)
  const allRated: {
    name: string;
    score: number;
    isOurPlayer: boolean;
    isGoalie: boolean;
  }[] = [];

  for (const [clubId, clubPlayers] of Object.entries(game.players ?? {})) {
    const isOurs = clubId === CLUB_ID;
    for (const p of Object.values(clubPlayers)) {
      const isGoalie = num(p.glshots) > 0 || p.position === "goalie";
      let score: number;

      if (isGoalie) {
        // Goalie: saves + save% bonus + shutout period bonus - goals against penalty
        const svPct = flt(p.glsavepct);
        score =
          num(p.glsaves) * 0.8 +
          svPct * 20 +
          num(p.glsoperiods) * 2 -
          num(p.glga) * 2;
      } else {
        // Skater: goals + assists + shots + hits
        score =
          num(p.skgoals) * 4 +
          num(p.skassists) * 2 +
          num(p.skshots) * 0.3 +
          num(p.skhits) * 0.2;
      }

      allRated.push({
        name: isOurs
          ? resolveName(p.playername || "Unknown")
          : (p.playername || "Unknown"),
        score: Math.round(score * 10) / 10,
        isOurPlayer: isOurs,
        isGoalie,
      });
    }
  }

  allRated.sort((a, b) => b.score - a.score);

  const threeStars: ClubMatch["threeStars"] =
    allRated.length >= 3
      ? [
          { name: allRated[0].name, score: allRated[0].score, isOurPlayer: allRated[0].isOurPlayer, isGoalie: allRated[0].isGoalie },
          { name: allRated[1].name, score: allRated[1].score, isOurPlayer: allRated[1].isOurPlayer, isGoalie: allRated[1].isGoalie },
          { name: allRated[2].name, score: allRated[2].score, isOurPlayer: allRated[2].isOurPlayer, isGoalie: allRated[2].isGoalie },
        ]
      : null;

  // Result code >= 16384 indicates opponent DNF/forfeit (16384 is the DNF bit flag)
  const resultCode = parseInt(ourClub.result || "0") || 0;
  const isForfeit = resultCode >= 16384;

  return {
    id: game.matchId,
    timestamp: game.timestamp,
    date: formatTimestamp(game.timestamp),
    opponent: opponentClub?.details?.name ?? `Club #${opponentId}`,
    homeAway: ourClub.teamSide === "0" ? "home" : "away",
    scoreUs: num(ourClub.score),
    scoreThem: num(ourClub.opponentScore),
    matchType,
    shotsUs: num(ourClub.shots),
    shotsThem: num(opponentClub?.shots),
    toaUs: formatToa(ourClub.toa),
    toaThem: formatToa(opponentClub?.toa),
    passCompUs: passCompPct(ourClub.passa, ourClub.passc),
    passCompThem: passCompPct(opponentClub?.passa, opponentClub?.passc),
    result: ourClub.result || "",
    players,
    threeStars,
    ...(isForfeit && { forfeit: true }),
  };
}

function transformMember(raw: RawMember): ClubMember {
  const rating = raw.overallRating as Record<string, unknown> | undefined;
  return {
    username: raw.Username,
    position: raw.Position,
    gamesPlayed: num(raw["Games Played"]),
    goals: num(raw.Goals),
    assists: num(raw.Assists),
    points: num(raw.Points),
    ppg: flt(raw.PPG),
    plusMinus: parseInt(raw["+/-"] as string) || 0,
    hits: num(raw.Hits),
    shots: num(raw.Shots),
    shotPct: flt(raw["Shot %"]),
    pim: num(raw.PIM),
    gwg: num(raw.GWGs),
    winPct: num(raw["Win %"]),
    takeaways: num(raw.Takeaways as string),
    giveaways: num(raw.Giveaways as string),
    interceptions: num(raw.Interceptions as string),
    blockedShots: num(raw["Blocked shots"] as string),
    faceoffPct: flt(raw["FO %"] as string),
    passCompPct: flt(raw["Pass %"] as string),
    goalieGP: num(raw["Goalie games played"]),
    goalieWins: num(raw["Goalie wins"]),
    goalieRecord: (raw["Goalie record"] as string) || "0-0-0",
    goalieSaves: num(raw["Goalie saves"]),
    goalieShots: num(raw["Goalie shots"]),
    savePct: flt(raw["Save %"]),
    gaa: flt(raw.GAA),
    shutouts: num(raw.Shutouts),
    shutoutPeriods: num(raw["Shutout periods"] as string),
    overallRating: (rating?.["Overall Rating"] as number) ?? 0,
    playstyle: (rating?.playstyle as string) ?? "",
  };
}

/* ── Main fetch ───────────────────────────────────────────────────────── */

export async function fetchChelstatsData(): Promise<ChelstatsData | null> {
  try {
    const url = `${CHELSTATS_URL}?teamname=${encodeURIComponent(TEAM_NAME)}&console=${CONSOLE}&strict=true`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;

    const data: ChelstatsApiResponse = await res.json();
    if (!data.team_stats) return null;

    const ts = data.team_stats;

    const clubStats: ClubStats = {
      record: ts.record || "0-0-0",
      wins: num(ts.wins),
      losses: num(ts.losses),
      otl: num(ts.otl),
      goals: num(ts.goals),
      goalsAgainst: num(ts.goalsAgainst),
      goalsPerGame: flt(ts.goals_per_game),
      goalsAgainstPerGame: flt(ts.goalsAgainst_per_game),
      totalGames: num(ts.totalGames),
      seasons: num(ts.seasons),
      titlesWon: num(ts.titlesWon),
      currentDivision: num(ts.currentDivision),
      bestDivision: num(ts.bestDivision),
      starLevel: num(ts.starLevel),
      overallRating: data.clubRating?.["Club Overall Rating"] ?? 0,
    };

    // Members
    const members: ClubMember[] = Object.values(data.memberData || {}).map(
      transformMember
    );

    // Matches — combine all types, sort newest first
    const matches: ClubMatch[] = [];
    const rg = data.recentGames || {};

    for (const game of rg.RegularSeason || []) {
      const m = transformGame(game, "regular");
      if (m) matches.push(m);
    }
    for (const game of rg.ClubFinals || []) {
      const m = transformGame(game, "finals");
      if (m) matches.push(m);
    }
    for (const game of rg.PrivateGames || []) {
      const m = transformGame(game, "private");
      if (m) matches.push(m);
    }

    matches.sort((a, b) => b.timestamp - a.timestamp);

    return { clubStats, members, matches };
  } catch (err) {
    console.error("[chelstats] Failed to fetch:", err);
    return null;
  }
}

/* ── Adapter: convert chelstats members → Discord SeasonData format ─── */

function makeLeaderboard(
  members: ClubMember[],
  getValue: (m: ClubMember) => number,
  getSecondary?: (m: ClubMember) => number | undefined,
  filter?: (m: ClubMember) => boolean
): StatEntry[] {
  return members
    .filter(filter || (() => true))
    .filter((m) => getValue(m) !== 0 || !filter)
    .sort((a, b) => getValue(b) - getValue(a))
    .map((m, i) => ({
      rank: i + 1,
      name: resolveName(m.username),
      value: getValue(m),
      secondary: getSecondary?.(m),
    }));
}

export function chelstatsToSeasonData(members: ClubMember[]): SeasonData {
  const roster: RosterEntry[] = members.map((m) => ({
    name: resolveName(m.username),
    position: m.position,
  }));

  const points = makeLeaderboard(
    members,
    (m) => m.points,
    (m) => m.gamesPlayed
  );

  const goals = makeLeaderboard(
    members,
    (m) => m.goals,
    (m) => m.shotPct
  );

  const assists = makeLeaderboard(
    members,
    (m) => m.assists,
    (m) => Math.round(m.passCompPct * 10) / 10
  );

  const plusMinus = makeLeaderboard(
    members,
    (m) => m.plusMinus
  );

  const hits = makeLeaderboard(
    members,
    (m) => m.hits,
    (m) => m.pim
  );

  // Goalie saves — only players with goalie games
  const saves: SaveEntry[] = members
    .filter((m) => m.goalieGP > 0)
    .sort((a, b) => b.goalieSaves - a.goalieSaves)
    .map((m, i) => {
      // savePct from chelstats is already a percentage (e.g. 68.000)
      const svPct = m.savePct > 1 ? Math.round(m.savePct * 10) / 10 : Math.round(m.savePct * 1000) / 10;
      return {
        rank: i + 1,
        name: resolveName(m.username),
        value: m.goalieSaves,
        secondary: svPct,
        ggp: m.goalieGP,
      };
    });

  const shutouts = makeLeaderboard(
    members,
    (m) => m.shutouts,
    (m) => m.shutoutPeriods,
    (m) => m.goalieGP > 0
  );

  const shots = makeLeaderboard(
    members,
    (m) => m.shots,
    (m) => m.shotPct
  );

  const gwg = makeLeaderboard(
    members,
    (m) => m.gwg
  );

  const takeaways = makeLeaderboard(
    members,
    (m) => m.takeaways,
    (m) => m.gamesPlayed
  );

  const blockedShots = makeLeaderboard(
    members,
    (m) => m.blockedShots,
    (m) => m.gamesPlayed
  );

  const giveaways = makeLeaderboard(
    members,
    (m) => m.giveaways,
    (m) => m.gamesPlayed
  );

  const pim = makeLeaderboard(
    members,
    (m) => m.pim,
    (m) => m.gamesPlayed
  );

  const interceptions = makeLeaderboard(
    members,
    (m) => m.interceptions,
    (m) => m.gamesPlayed
  );

  const faceoffPct = makeLeaderboard(
    members,
    (m) => m.faceoffPct,
    (m) => m.gamesPlayed,
    (m) => m.faceoffPct > 0
  );

  const stats: ParsedStats = {
    date: "Live from EA",
    roster,
    points,
    goals,
    assists,
    plusMinus,
    hits,
    saves,
    shutouts,
    milestones: [],
    shots,
    gwg,
    takeaways,
    blockedShots,
    giveaways,
    pim,
    interceptions,
    faceoffPct,
  };

  return { season: "2025", stats };
}

/* ── Top Players (driven by MVP odds ranking) ────────────────────────── */

export interface TopPlayerEntry {
  name: string;
  position: string;
  isGoalie: boolean;
  // Skater stats (when isGoalie = false)
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
  // Goalie stats (when isGoalie = true)
  goalieGP?: number;
  savePct?: number;
  shutouts?: number;
  gaa?: number;
}

/**
 * Returns the top N players using the MVP odds ranking (already calibrated
 * so skaters and goalies are comparable). Each player only appears once,
 * keeping whichever role (skater/goalie) scored higher.
 */
export function computeTopPlayers(
  members: ClubMember[],
  limit: number = 3
): TopPlayerEntry[] {
  if (members.length === 0) return [];

  const mvpEntries = computeMvpOddsFromMembers(members);
  if (mvpEntries.length === 0) return [];

  // Lookup table: resolved display name → ClubMember
  const byName = new Map<string, ClubMember>();
  for (const m of members) {
    byName.set(resolveName(m.username), m);
  }

  // Dedupe by name — MVP entries can list the same player twice (skater +
  // goalie). The first occurrence is the higher-scoring one since the list
  // is already sorted.
  const seen = new Set<string>();
  const top: TopPlayerEntry[] = [];

  for (const entry of mvpEntries) {
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);

    const m = byName.get(entry.name);
    if (!m) continue;

    top.push({
      name: entry.name,
      position: entry.isGoalie ? "Goalie" : m.position,
      isGoalie: entry.isGoalie,
      ...(entry.isGoalie
        ? {
            goalieGP: m.goalieGP,
            savePct: m.savePct > 1 ? m.savePct : m.savePct * 100,
            shutouts: m.shutouts,
            gaa: m.gaa,
          }
        : {
            gamesPlayed: m.gamesPlayed,
            goals: m.goals,
            assists: m.assists,
            points: m.points,
          }),
    });

    if (top.length >= limit) break;
  }

  return top;
}

/* ── MVP Odds from live chelstats data ─────────────────────────────── */

export function computeMvpOddsFromMembers(
  members: ClubMember[]
): MvpOddsEntry[] {
  if (members.length === 0) return [];

  // Exclude specific players from skater odds (goalie-only in MVP race)
  const SKATER_EXCLUDE = new Set(["Rydayro"]);
  const MIN_GP = 5;

  const entries: { member: ClubMember; score: number; isGoalie: boolean }[] = [];

  for (const m of members) {
    // --- Skater score ---
    // Per-game rate stats measure quality. Log-dampened sqrt(GP) rewards
    // volume with diminishing returns so high-GP skaters don't run away
    // from goalies who naturally play fewer games.
    if (m.gamesPlayed >= MIN_GP && !SKATER_EXCLUDE.has(m.username)) {
      const gp = m.gamesPlayed;
      const perGame =
        m.ppg * 20 +                          // offensive production rate
        (m.goals / gp) * 15 +                 // goal-scoring rate
        Math.max(m.plusMinus, 0) / gp * 8 +   // two-way impact
        (m.gwg / gp) * 30 +                   // clutch factor
        m.shotPct * 0.3 +                     // shooting efficiency
        (m.hits / gp) * 0.5 +                 // physical presence
        (m.takeaways / gp) * 0.5 -            // defensive play
        (m.giveaways / gp) * 0.3;             // turnover penalty
      const gpScale = Math.sqrt(gp) * (1 / (1 + Math.log10(gp / 100)));
      const score = perGame * gpScale;
      entries.push({ member: m, score, isGoalie: false });
    }

    // --- Goalie score ---
    // Rate stats calibrated so an elite goalie season ≈ elite skater season.
    // Goalies keep full sqrt(GP) — sustaining good rates over many games is
    // genuinely harder in net, unlike skaters whose rates naturally sustain.
    if (m.goalieGP >= MIN_GP) {
      const ggp = m.goalieGP;
      const goalieWinPct = ggp > 0 ? (m.goalieWins / ggp) * 100 : 0;
      const perGame =
        m.savePct * 0.5 +                     // save percentage (core stat)
        Math.max(10 - m.gaa, 0) * 3 +         // GAA inverted (lower = better)
        (m.shutouts / ggp) * 20 +             // shutout rate
        (m.shutoutPeriods / ggp) * 30 +       // shutout periods rate (consistency)
        goalieWinPct * 0.3 +                  // win percentage
        (m.goalieSaves / ggp) * 0.3;          // workload per game
      const score = perGame * Math.sqrt(ggp);
      entries.push({ member: m, score, isGoalie: true });
    }
  }

  if (entries.length === 0) return [];

  entries.sort((a, b) => b.score - a.score);

  // Raise normalized scores to a power to concentrate probability toward top
  // players, producing realistic sportsbook-style odds.
  const maxScore = entries[0].score;
  const SHARPNESS = 3;
  const weights = entries.map((e) => Math.pow(e.score / maxScore, SHARPNESS));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  return entries.map((entry, index) => {
    const m = entry.member;
    const prob = totalWeight > 0 ? weights[index] / totalWeight : 0;

    let odds: string;
    if (prob > 0) {
      const raw = prob >= 0.5
        ? Math.round(-(prob / (1 - prob)) * 100)
        : Math.round(((1 - prob) / prob) * 100);
      odds = prob >= 0.5 ? `${raw}` : `+${raw}`;
    } else {
      odds = "—";
    }

    const svDisplay =
      m.savePct > 1
        ? m.savePct.toFixed(1)
        : (m.savePct * 100).toFixed(1);

    const highlights: string[] = [];
    if (entry.isGoalie) {
      highlights.push(`${m.goalieGP} GP`);
      highlights.push(`${svDisplay}% SV`);
      highlights.push(`${m.shutouts} SO`);
      highlights.push(`${m.gaa.toFixed(2)} GAA`);
    } else {
      highlights.push(`${m.gamesPlayed} GP`);
      highlights.push(`${m.points} PTS`);
      highlights.push(`${m.goals} G`);
      highlights.push(`${m.assists} A`);
    }

    return {
      name: resolveName(m.username),
      position: entry.isGoalie ? "Goalie" : m.position,
      score: entry.score,
      probability: prob,
      americanOdds: odds,
      isGoalie: entry.isGoalie,
      highlights: highlights.slice(0, 4),
    };
  });
}
