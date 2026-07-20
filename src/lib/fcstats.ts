/**
 * Server-side EA FC 26 Pro Clubs stats integration.
 *
 * Single endpoint provides club stats, member stats, and recent match history
 * via proclubstracker.com (a wrapper around EA's proclubs.ea.com/api/fc API,
 * same pattern as chelstats.app for NHL).
 *
 * https://proclubstracker.com/api/clubs/6062840?platform=common-gen5
 */

const PCT_URL = "https://proclubstracker.com/api/clubs";
const CLUB_ID = "6062840";
const PLATFORM = "common-gen5";

// Gamertag → real name (matches the hockey site keys where applicable)
const GAMERTAG_TO_NAME: Record<string, string> = {
  "Rydayro": "RYDER",
  "S1obbyRobby": "ROB",
  "Mhut8": "MATT",
  "u4 Pablo": "DYLAN",
  "oP wet": "COLIN",
  "u4 Hood": "KADEN",
  "Julio 3026": "JIMMY",
  "oP Ding1633": "LOGAN",
  "Tr3yyw4y": "TREY",
};

function resolveName(gamertag: string): string {
  return GAMERTAG_TO_NAME[gamertag] || gamertag;
}

/* ── Raw API response types (only fields we use) ──────────────────────── */

interface RawOverallStats {
  gamesPlayed: string;
  gamesPlayedPlayoff: string;
  goals: string;
  goalsAgainst: string;
  wins: string;
  losses: string;
  ties: string;
  promotions: string;
  relegations: string;
  skillRating: string;
  wstreak: string;
  unbeatenstreak: string;
  leagueAppearances: string;
  [key: string]: string | null;
}

interface RawMember {
  name: string;
  gamesPlayed: string;
  winRate: string;
  goals: string;
  assists: string;
  cleanSheetsDef: string;
  cleanSheetsGK: string;
  shotSuccessRate: string;
  passesMade: string;
  passSuccessRate: string;
  ratingAve: string;
  tacklesMade: string;
  tackleSuccessRate: string;
  proName: string;
  proPos: string;
  proHeight: string;
  proOverall: string;
  manOfTheMatch: string;
  redCards: string;
  favoritePosition: string;
  [key: string]: string;
}

interface RawMatchClub {
  goals: string;
  goalsAgainst: string;
  score: string;
  wins: string;
  losses: string;
  ties: string;
  winnerByDnf: string;
  details: { name: string; clubId: number } | null;
}

interface RawMatchPlayer {
  playername: string;
  pos: string;
  goals: string;
  assists: string;
  shots: string;
  rating: string;
  passesmade: string;
  passattempts: string;
  tacklesmade: string;
  tackleattempts: string;
  saves: string;
  goalsconceded: string;
  cleansheetsany: string;
  mom: string;
  redcards: string;
  [key: string]: string;
}

interface RawMatch {
  matchId: string;
  timestamp: number;
  timeAgo: { number: number; unit: string };
  clubs: Record<string, RawMatchClub>;
  players: Record<string, Record<string, RawMatchPlayer>>;
}

interface PctApiResponse {
  clubId: string;
  platform: string;
  overallStats: RawOverallStats | null;
  memberStats: { members: RawMember[] } | null;
  matches: {
    league?: RawMatch[];
    playoff?: RawMatch[];
    friendly?: RawMatch[];
  } | null;
  clubInfoData: Record<string, { name: string; clubId: number }> | null;
}

/* ── Public types ─────────────────────────────────────────────────────── */

export interface FcClubStats {
  name: string;
  record: string; // W-L-D
  wins: number;
  losses: number;
  ties: number;
  goals: number;
  goalsAgainst: number;
  goalsPerGame: number;
  goalsAgainstPerGame: number;
  totalGames: number;
  promotions: number;
  relegations: number;
  skillRating: number;
  winStreak: number;
  unbeatenStreak: number;
}

export interface FcClubMember {
  gamertag: string;
  name: string;
  position: string;
  proName: string;
  proOverall: number;
  gamesPlayed: number;
  winRate: number;
  goals: number;
  assists: number;
  points: number;
  ratingAve: number;
  shotSuccessRate: number;
  passesMade: number;
  passSuccessRate: number;
  tacklesMade: number;
  tackleSuccessRate: number;
  manOfTheMatch: number;
  redCards: number;
  cleanSheets: number;
}

export interface FcMatchPlayer {
  gamertag: string;
  name: string;
  position: string;
  goals: number;
  assists: number;
  shots: number;
  rating: number;
  passesMade: number;
  passAttempts: number;
  tacklesMade: number;
  saves: number;
  mom: boolean;
  redCards: number;
}

export interface FcClubMatch {
  id: string;
  timestamp: number;
  date: string;
  matchType: "league" | "playoff" | "friendly";
  opponent: string;
  scoreUs: number;
  scoreThem: number;
  result: "W" | "L" | "D";
  forfeit: boolean;
  players: FcMatchPlayer[];
}

export interface FcStatsData {
  clubStats: FcClubStats;
  members: FcClubMember[];
  matches: FcClubMatch[];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function num(v: string | null | undefined): number {
  const n = parseInt(v ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function flt(v: string | null | undefined): number {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function transformMember(m: RawMember): FcClubMember {
  const goals = num(m.goals);
  const assists = num(m.assists);
  return {
    gamertag: m.name,
    name: resolveName(m.name),
    position: m.favoritePosition || "unknown",
    proName: m.proName || "",
    proOverall: num(m.proOverall),
    gamesPlayed: num(m.gamesPlayed),
    winRate: num(m.winRate),
    goals,
    assists,
    points: goals + assists,
    ratingAve: flt(m.ratingAve),
    shotSuccessRate: num(m.shotSuccessRate),
    passesMade: num(m.passesMade),
    passSuccessRate: num(m.passSuccessRate),
    tacklesMade: num(m.tacklesMade),
    tackleSuccessRate: num(m.tackleSuccessRate),
    manOfTheMatch: num(m.manOfTheMatch),
    redCards: num(m.redCards),
    cleanSheets: num(m.cleanSheetsDef) + num(m.cleanSheetsGK),
  };
}

function transformMatch(
  game: RawMatch,
  matchType: FcClubMatch["matchType"]
): FcClubMatch | null {
  const us = game.clubs[CLUB_ID];
  if (!us) return null;

  const oppEntry = Object.entries(game.clubs).find(([id]) => id !== CLUB_ID);
  const opponent =
    oppEntry?.[1]?.details?.name ?? "Unknown";

  const scoreUs = num(us.goals);
  const scoreThem = num(us.goalsAgainst);
  const result: FcClubMatch["result"] =
    num(us.wins) > 0 ? "W" : num(us.losses) > 0 ? "L" : "D";

  const ourPlayers = game.players[CLUB_ID] || {};
  const players: FcMatchPlayer[] = Object.values(ourPlayers).map((p) => ({
    gamertag: p.playername,
    name: resolveName(p.playername),
    position: p.pos || "unknown",
    goals: num(p.goals),
    assists: num(p.assists),
    shots: num(p.shots),
    rating: flt(p.rating),
    passesMade: num(p.passesmade),
    passAttempts: num(p.passattempts),
    tacklesMade: num(p.tacklesmade),
    saves: num(p.saves),
    mom: num(p.mom) > 0,
    redCards: num(p.redcards),
  }));

  // Sort: MOM first, then by rating
  players.sort((a, b) => Number(b.mom) - Number(a.mom) || b.rating - a.rating);

  const forfeit = oppEntry ? num(oppEntry[1].winnerByDnf) > 0 : false;

  return {
    id: game.matchId,
    timestamp: game.timestamp,
    date: new Date(game.timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    matchType,
    opponent,
    scoreUs,
    scoreThem,
    result,
    forfeit,
    players,
  };
}

/* ── Main fetch ───────────────────────────────────────────────────────── */

export async function fetchFcStatsData(): Promise<FcStatsData | null> {
  try {
    const url = `${PCT_URL}/${CLUB_ID}?platform=${PLATFORM}`;

    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;

    const data: PctApiResponse = await res.json();
    if (!data.overallStats) return null;

    const os = data.overallStats;
    const wins = num(os.wins);
    const losses = num(os.losses);
    const ties = num(os.ties);
    const totalGames = num(os.gamesPlayed);

    const clubStats: FcClubStats = {
      name: data.clubInfoData?.[CLUB_ID]?.name ?? "Bardownskii",
      record: `${wins}-${losses}-${ties}`,
      wins,
      losses,
      ties,
      goals: num(os.goals),
      goalsAgainst: num(os.goalsAgainst),
      goalsPerGame: totalGames ? +(num(os.goals) / totalGames).toFixed(2) : 0,
      goalsAgainstPerGame: totalGames
        ? +(num(os.goalsAgainst) / totalGames).toFixed(2)
        : 0,
      totalGames,
      promotions: num(os.promotions),
      relegations: num(os.relegations),
      skillRating: num(os.skillRating),
      winStreak: num(os.wstreak),
      unbeatenStreak: num(os.unbeatenstreak),
    };

    const members: FcClubMember[] = (data.memberStats?.members || []).map(
      transformMember
    );
    // Sort by points, then rating
    members.sort((a, b) => b.points - a.points || b.ratingAve - a.ratingAve);

    const matches: FcClubMatch[] = [];
    const mt = data.matches || {};
    for (const game of mt.league || []) {
      const m = transformMatch(game, "league");
      if (m) matches.push(m);
    }
    for (const game of mt.playoff || []) {
      const m = transformMatch(game, "playoff");
      if (m) matches.push(m);
    }
    for (const game of mt.friendly || []) {
      const m = transformMatch(game, "friendly");
      if (m) matches.push(m);
    }

    matches.sort((a, b) => b.timestamp - a.timestamp);

    return { clubStats, members, matches };
  } catch (err) {
    console.error("[fcstats] Failed to fetch:", err);
    return null;
  }
}
