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
  proHeight: number;
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
    proHeight: num(m.proHeight),
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
  // EA doesn't set the wins/losses/ties flags for some match types
  // (friendlies leave all three at 0) — fall back to comparing the score.
  const flagged =
    num(us.wins) > 0 ? "W" : num(us.losses) > 0 ? "L" : num(us.ties) > 0 ? "D" : null;
  const result: FcClubMatch["result"] =
    flagged ??
    (scoreUs > scoreThem ? "W" : scoreUs < scoreThem ? "L" : "D");

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

// Last-good snapshot so a slow/flaky upstream doesn't blank the site.
let lastGood: { data: FcStatsData; at: number } | null = null;

async function fetchRaw(timeoutMs: number): Promise<PctApiResponse | null> {
  const url = `${PCT_URL}/${CLUB_ID}?platform=${PLATFORM}`;
  const res = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as PctApiResponse;
}

export async function fetchFcStatsData(): Promise<FcStatsData | null> {
  try {
    // First attempt with a tight timeout; one retry with a generous one
    // (the upstream can be slow on cold starts).
    let data: PctApiResponse | null = null;
    try {
      data = await fetchRaw(10_000);
    } catch {
      data = null;
    }
    if (!data?.overallStats) {
      try {
        data = await fetchRaw(30_000);
      } catch {
        data = null;
      }
    }
    if (!data?.overallStats) return lastGood?.data ?? null;

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

    const result = { clubStats, members, matches };
    lastGood = { data: result, at: Date.now() };
    return result;
  } catch (err) {
    console.error("[fcstats] Failed to fetch:", err);
    return lastGood?.data ?? null;
  }
}

/* ── Derived data helpers ─────────────────────────────────────────────── */

/** GK / DEF / MID / FW display label from an EA position string. */
export function positionLabel(pos: string): string {
  const p = (pos || "").toLowerCase();
  if (p.includes("goalkeeper") || p === "gk") return "GK";
  if (p.includes("defender") || p.includes("back") || p === "cb" || p === "lb" || p === "rb") return "DEF";
  if (p.includes("midfielder") || p === "cm" || p === "cdm" || p === "cam" || p === "lm" || p === "rm") return "MID";
  if (p.includes("forward") || p.includes("striker") || p === "st" || p === "lw" || p === "rw" || p === "cf") return "FW";
  return "—";
}

/** 182cm → 6'0" style display. */
export function formatHeight(cm: number): string {
  if (!cm) return "—";
  const totalIn = Math.round(cm / 2.54);
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
}

/** Most recent N results, oldest → newest (form guide dots). */
export function computeFcForm(
  matches: FcClubMatch[],
  n = 5
): ("W" | "L" | "D")[] {
  return matches
    .slice(0, n)
    .map((m) => m.result)
    .reverse();
}

export interface FcRecordEntry {
  label: string;
  holder: string;
  value: string;
  detail?: string;
}

/** Club + player records computed from tracked matches and member totals. */
export function computeFcRecords(data: FcStatsData): {
  club: FcRecordEntry[];
  player: FcRecordEntry[];
} {
  const { clubStats, members, matches } = data;
  const real = matches.filter((m) => !m.forfeit);

  const biggestWin = real
    .filter((m) => m.result === "W")
    .sort((a, b) => (b.scoreUs - b.scoreThem) - (a.scoreUs - a.scoreThem))[0];
  const highestScoring = [...real].sort(
    (a, b) => b.scoreUs + b.scoreThem - (a.scoreUs + a.scoreThem)
  )[0];
  const mostGoalsFor = [...real].sort((a, b) => b.scoreUs - a.scoreUs)[0];

  const club: FcRecordEntry[] = [
    {
      label: "All-Time Record",
      holder: "Bardownski FC",
      value: clubStats.record,
      detail: `${clubStats.totalGames} games played`,
    },
    {
      label: "Skill Rating",
      holder: "Bardownski FC",
      value: String(clubStats.skillRating),
      detail: `${clubStats.promotions} promotions · ${clubStats.relegations} relegations`,
    },
  ];
  if (biggestWin)
    club.push({
      label: "Biggest Win",
      holder: `vs ${biggestWin.opponent}`,
      value: `${biggestWin.scoreUs}–${biggestWin.scoreThem}`,
      detail: biggestWin.date,
    });
  if (mostGoalsFor)
    club.push({
      label: "Most Goals in a Match",
      holder: `vs ${mostGoalsFor.opponent}`,
      value: String(mostGoalsFor.scoreUs),
      detail: mostGoalsFor.date,
    });
  if (highestScoring)
    club.push({
      label: "Highest-Scoring Match",
      holder: `vs ${highestScoring.opponent}`,
      value: `${highestScoring.scoreUs}–${highestScoring.scoreThem}`,
      detail: highestScoring.date,
    });

  const byGoals = [...members].sort((a, b) => b.goals - a.goals)[0];
  const byAssists = [...members].sort((a, b) => b.assists - a.assists)[0];
  const byPoints = [...members].sort((a, b) => b.points - a.points)[0];
  const byMotm = [...members].sort((a, b) => b.manOfTheMatch - a.manOfTheMatch)[0];
  const byRating = [...members]
    .filter((m) => m.gamesPlayed >= 5)
    .sort((a, b) => b.ratingAve - a.ratingAve)[0];
  const byGames = [...members].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];

  // Best single-game performance from the tracked window
  let bestGame: { player: FcMatchPlayer; match: FcClubMatch } | null = null;
  for (const m of real) {
    for (const p of m.players) {
      const pts = p.goals + p.assists;
      const bestPts = bestGame
        ? bestGame.player.goals + bestGame.player.assists
        : -1;
      if (pts > bestPts) bestGame = { player: p, match: m };
    }
  }

  const player: FcRecordEntry[] = [];
  if (byGoals)
    player.push({ label: "Most Goals", holder: byGoals.name, value: String(byGoals.goals), detail: `${byGoals.gamesPlayed} games` });
  if (byAssists)
    player.push({ label: "Most Assists", holder: byAssists.name, value: String(byAssists.assists), detail: `${byAssists.gamesPlayed} games` });
  if (byPoints)
    player.push({ label: "Most Goal Contributions", holder: byPoints.name, value: String(byPoints.points), detail: `${byPoints.goals}G + ${byPoints.assists}A` });
  if (byMotm)
    player.push({ label: "Most Man of the Match", holder: byMotm.name, value: String(byMotm.manOfTheMatch), detail: `${byMotm.gamesPlayed} games` });
  if (byRating)
    player.push({ label: "Best Match Rating", holder: byRating.name, value: byRating.ratingAve.toFixed(1), detail: "min. 5 games" });
  if (byGames)
    player.push({ label: "Most Appearances", holder: byGames.name, value: String(byGames.gamesPlayed), detail: "club leader" });
  if (bestGame)
    player.push({
      label: "Best Single Game",
      holder: bestGame.player.name,
      value: `${bestGame.player.goals}G ${bestGame.player.assists}A`,
      detail: `vs ${bestGame.match.opponent} · ${bestGame.match.date}`,
    });

  return { club, player };
}

/* ── Per-player aggregates from the tracked match window ──────────────── */

export interface FcPlayerMatchLog {
  matchId: string;
  date: string;
  opponent: string;
  result: "W" | "L" | "D";
  scoreUs: number;
  scoreThem: number;
  goals: number;
  assists: number;
  shots: number;
  rating: number;
  passesMade: number;
  passAttempts: number;
  tacklesMade: number;
  saves: number;
  mom: boolean;
}

export interface FcPlayerAggregate {
  gamertag: string;
  name: string;
  games: number;
  goals: number;
  assists: number;
  shots: number;
  saves: number;
  passesMade: number;
  passAttempts: number;
  tacklesMade: number;
  momCount: number;
  avgRating: number;
  log: FcPlayerMatchLog[];
}

export function computeFcPlayerMatchAggregates(
  matches: FcClubMatch[]
): Map<string, FcPlayerAggregate> {
  const map = new Map<string, FcPlayerAggregate>();
  // oldest → newest so logs read chronologically
  const ordered = [...matches].sort((a, b) => a.timestamp - b.timestamp);
  for (const m of ordered) {
    for (const p of m.players) {
      let agg = map.get(p.gamertag);
      if (!agg) {
        agg = {
          gamertag: p.gamertag,
          name: p.name,
          games: 0,
          goals: 0,
          assists: 0,
          shots: 0,
          saves: 0,
          passesMade: 0,
          passAttempts: 0,
          tacklesMade: 0,
          momCount: 0,
          avgRating: 0,
          log: [],
        };
        map.set(p.gamertag, agg);
      }
      agg.games += 1;
      agg.goals += p.goals;
      agg.assists += p.assists;
      agg.shots += p.shots;
      agg.saves += p.saves;
      agg.passesMade += p.passesMade;
      agg.passAttempts += p.passAttempts;
      agg.tacklesMade += p.tacklesMade;
      if (p.mom) agg.momCount += 1;
      agg.avgRating += p.rating;
      agg.log.push({
        matchId: m.id,
        date: m.date,
        opponent: m.opponent,
        result: m.result,
        scoreUs: m.scoreUs,
        scoreThem: m.scoreThem,
        goals: p.goals,
        assists: p.assists,
        shots: p.shots,
        rating: p.rating,
        passesMade: p.passesMade,
        passAttempts: p.passAttempts,
        tacklesMade: p.tacklesMade,
        saves: p.saves,
        mom: p.mom,
      });
    }
  }
  for (const agg of map.values()) {
    if (agg.games > 0) agg.avgRating = +(agg.avgRating / agg.games).toFixed(2);
    agg.log.reverse(); // newest first for display
  }
  return map;
}

/* ── Auto-generated FC news ───────────────────────────────────────────── */

export interface FcNewsItem {
  id: string;
  title: string;
  excerpt: string;
  body: string[];
  category: "Match Report" | "Club News" | "Feature";
  date: string;
  timestamp: number;
  image: string;
}

const FC_STILL = (n: number) =>
  `/fc/images/gallery/fc-still-${String(n).padStart(2, "0")}.webp`;

/** Deterministic still pick so articles keep a stable cover image. */
function stillFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FC_STILL((h % 29) + 1);
}

function matchHeadline(m: FcClubMatch): string {
  const diff = m.scoreUs - m.scoreThem;
  if (m.forfeit && m.result === "W") return `${m.opponent} forfeit hands Bardownski FC the points`;
  if (m.result === "W" && diff >= 4) return `Bardownski FC demolish ${m.opponent} ${m.scoreUs}-${m.scoreThem}`;
  if (m.result === "W" && diff >= 2) return `Bardownski FC cruise past ${m.opponent} ${m.scoreUs}-${m.scoreThem}`;
  if (m.result === "W") return `Bardownski FC edge ${m.opponent} in ${m.scoreUs}-${m.scoreThem} thriller`;
  if (m.result === "D") return `Bardownski FC share the points with ${m.opponent}`;
  if (diff <= -4) return `Rough night: Bardownski FC fall ${m.scoreUs}-${m.scoreThem} to ${m.opponent}`;
  return `Bardownski FC come up short against ${m.opponent}`;
}

function matchReport(m: FcClubMatch): string[] {
  const paras: string[] = [];
  const comp =
    m.matchType === "league" ? "league" : m.matchType === "playoff" ? "playoff" : "friendly";
  const opener =
    m.result === "W"
      ? `Bardownski FC took the ${comp} clash against ${m.opponent} ${m.scoreUs}-${m.scoreThem}${m.forfeit ? " after the opposition failed to finish the match" : ""}.`
      : m.result === "D"
        ? `Bardownski FC and ${m.opponent} couldn't be separated, playing out a ${m.scoreUs}-${m.scoreThem} draw in ${comp} action.`
        : `Bardownski FC were beaten ${m.scoreUs}-${m.scoreThem} by ${m.opponent} in ${comp} play.`;
  paras.push(opener);

  const scorers = m.players.filter((p) => p.goals > 0);
  if (scorers.length > 0) {
    const parts = scorers.map(
      (p) => `${p.name}${p.goals > 1 ? ` (${p.goals})` : ""}`
    );
    paras.push(
      `On the scoresheet: ${parts.join(", ")}.` +
        (m.players.some((p) => p.assists > 0)
          ? ` Assists came from ${m.players
              .filter((p) => p.assists > 0)
              .map((p) => `${p.name}${p.assists > 1 ? ` (${p.assists})` : ""}`)
              .join(", ")}.`
          : "")
    );
  }

  const mom = m.players.find((p) => p.mom);
  if (mom) {
    paras.push(
      `${mom.name} took Man of the Match honours with a ${mom.rating.toFixed(1)} rating${mom.goals + mom.assists > 0 ? ` and ${mom.goals}G ${mom.assists}A on the night` : ""}.`
    );
  }

  const gk = m.players.find((p) => p.saves > 0);
  if (gk && m.result !== "L") {
    paras.push(`${gk.name} made ${gk.saves} save${gk.saves === 1 ? "" : "s"} between the sticks.`);
  }
  return paras;
}

/** Build news items from live data: match reports + feature pieces. */
export function buildFcNews(data: FcStatsData): FcNewsItem[] {
  const items: FcNewsItem[] = [];

  // Match reports for the tracked window
  for (const m of data.matches) {
    items.push({
      id: `match-${m.id}`,
      title: matchHeadline(m),
      excerpt: `${m.matchType.charAt(0).toUpperCase() + m.matchType.slice(1)} · ${m.date} — full report.`,
      body: matchReport(m),
      category: "Match Report",
      date: m.date,
      timestamp: m.timestamp,
      image: stillFor(m.id),
    });
  }

  // Feature: top scorer
  const topScorer = [...data.members].sort((a, b) => b.goals - a.goals)[0];
  if (topScorer && topScorer.goals > 0) {
    const latestTs = data.matches[0]?.timestamp ?? Math.floor(Date.now() / 1000);
    items.push({
      id: "feature-top-scorer",
      title: `${topScorer.name} leads the line with ${topScorer.goals} goals`,
      excerpt: `A look at the numbers behind the club's top scorer.`,
      body: [
        `${topScorer.name} sits top of the Bardownski FC scoring charts with ${topScorer.goals} goals and ${topScorer.assists} assists across ${topScorer.gamesPlayed} appearances.`,
        `An average match rating of ${topScorer.ratingAve.toFixed(1)} and ${topScorer.manOfTheMatch} Man of the Match award${topScorer.manOfTheMatch === 1 ? "" : "s"} tell the story of a player carrying the attack.`,
        `With a ${topScorer.passSuccessRate}% pass completion rate, the production isn't just goals — it's all-around play driving the club forward.`,
      ],
      category: "Feature",
      date: new Date(latestTs * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp: latestTs - 1,
      image: stillFor("feature-top-scorer"),
    });
  }

  // Feature: club form
  const form = computeFcForm(data.matches, 5);
  if (form.length >= 3) {
    const w = form.filter((r) => r === "W").length;
    const latestTs = data.matches[0]?.timestamp ?? Math.floor(Date.now() / 1000);
    items.push({
      id: "feature-form",
      title:
        w >= 4
          ? "Bardownski FC are the hottest team in the division"
          : w >= 2
            ? "Form check: Bardownski FC finding their level"
            : "Form check: searching for answers",
      excerpt: `Breaking down the last ${form.length} matches.`,
      body: [
        `Over the last ${form.length} matches, Bardownski FC have gone ${w}-${form.filter((r) => r === "L").length}-${form.filter((r) => r === "D").length} (${form.join(" ")}).`,
        `The club sits at a ${data.clubStats.skillRating} skill rating with an all-time record of ${data.clubStats.record}, scoring ${data.clubStats.goalsPerGame} goals per game.`,
        w >= 3
          ? "The pieces are clicking — the passing game is sharp and the finishing is ruthless. The next promotion push is on."
          : "There's work to do, but the underlying numbers say this group is closer than the results suggest.",
      ],
      category: "Club News",
      date: new Date(latestTs * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp: latestTs - 2,
      image: stillFor("feature-form"),
    });
  }

  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}
