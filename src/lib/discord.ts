/**
 * Discord integration module.
 *
 * Connects to a Discord text channel to fetch and parse player stats.
 *
 * Environment variables needed:
 *   DISCORD_BOT_TOKEN - Your Discord bot token
 *   DISCORD_CHANNEL_ID - The channel ID where stats are posted
 */

const DISCORD_API = "https://discord.com/api/v10";

// --- Types ---

export interface StatEntry {
  rank: number;
  name: string;
  value: number;
  secondary?: number;
  trend?: "up" | "down" | null;
}

export interface SaveEntry extends StatEntry {
  ggp?: number;
}

export interface RosterEntry {
  name: string;
  position: string;
}

export interface Milestone {
  name: string;
  achievements: string[];
}

export interface ParsedStats {
  date: string;
  roster: RosterEntry[];
  plusMinus: StatEntry[];
  points: StatEntry[];
  goals: StatEntry[];
  assists: StatEntry[];
  hits: StatEntry[];
  saves: SaveEntry[];
  shutouts: StatEntry[];
  milestones: Milestone[];
}

export interface SeasonData {
  season: string;
  stats: ParsedStats;
}

export interface EnrichedPlayer {
  name: string;
  position: string;
  gamesPlayed?: number;
  points?: number;
  goals?: number;
  assists?: number;
  plusMinus?: number;
  hits?: number;
  pim?: number;
  shotPercentage?: number;
  passPercentage?: number;
  saves?: number;
  savePercentage?: number;
  goalieGamesPlayed?: number;
  shutouts?: number;
  shutoutPeriods?: number;
}

export interface AllTimeRecord {
  label: string;
  player: string;
  value: number;
  season: string;
  suffix?: string;
  prefix?: string;
  category: "skater" | "goalie";
}

// --- Helpers ---

function normalizeUnicode(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function getTrend(line: string): "up" | "down" | null {
  if (line.includes("\u2191")) return "up";
  if (line.includes("\u2193")) return "down";
  return null;
}

/** Parse ranked stat lines — handles T- tied ranks and GP/GGP secondary */
function parseStatLines(section: string): StatEntry[] {
  const entries: StatEntry[] = [];
  for (const line of section.split("\n")) {
    // Match: [T-]RANK. NAME[: ]VALUE [(SECONDARY)]
    const match = line.match(
      /T?-?(\d+)\.\s*([A-Z]+)[:\s]+([+-]?\d+(?:\.\d+)?)\s*(?:\(([^)]+)\))?/i
    );
    if (match) {
      let secondary: number | undefined;
      if (match[4]) {
        const sec = match[4].trim();
        if (sec.includes("/")) {
          // GP/GGP format like "173/42" — use first number (GP)
          secondary = parseFloat(sec.split("/")[0]);
        } else {
          secondary = parseFloat(sec.replace("%", ""));
        }
        if (isNaN(secondary)) secondary = undefined;
      }
      entries.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseFloat(match[3]),
        secondary,
        trend: getTrend(line),
      });
    }
  }
  return entries;
}

/** Parse saves section — handles all format variants across seasons */
function parseSavesSection(savesText: string): {
  saves: SaveEntry[];
  shutoutsFromSaves: StatEntry[];
} {
  const saves: SaveEntry[] = [];
  const shutoutsFromSaves: StatEntry[] = [];

  for (const line of savesText.split("\n")) {
    const trend = getTrend(line);

    // Format A (2025): "1. RYDER: 828 (71.00%) 76 GGP"
    let match = line.match(
      /T?-?(\d+)\.\s*([A-Z]+)[:\s]+(\d+)\s*\((\d+(?:\.\d+)?%?)\)\s*(\d+)\s*GGP/i
    );
    if (match) {
      saves.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseInt(match[3]),
        secondary: parseFloat(match[4].replace("%", "")),
        trend,
        ggp: parseInt(match[5]),
      });
      continue;
    }

    // Format B (2024/2023): "1. JIMMY: 502 (3 | 0.769%) 41 GGP"
    // Also handles no GGP: "1. RYDER: 5152 (20 | 0.746%)"
    match = line.match(
      /T?-?(\d+)\.\s*([A-Z]+)[:\s]+(\d+)\s*\((\d+)\s*\|\s*(\d+(?:\.\d+)?%?)\)\s*(?:(\d+)\s*GGP)?/i
    );
    if (match) {
      let savePct = parseFloat(match[5].replace("%", ""));
      // Normalize decimal save% (0.769) to percentage (76.9)
      if (savePct < 1) savePct = Math.round(savePct * 10000) / 100;
      saves.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseInt(match[3]),
        secondary: savePct,
        trend,
        ggp: match[6] ? parseInt(match[6]) : undefined,
      });
      shutoutsFromSaves.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseInt(match[4]),
        trend,
      });
      continue;
    }

    // Format C (2024 alt): "1. RYDER: 0.775% (2 / 316) (22)"
    match = line.match(
      /T?-?(\d+)\.\s*([A-Z]+)[:\s]+(\d+(?:\.\d+)?%)\s*\((\d+)\s*\/\s*(\d+)\)\s*(?:\((\d+)\))?/i
    );
    if (match) {
      let savePct = parseFloat(match[3].replace("%", ""));
      if (savePct < 1) savePct = Math.round(savePct * 10000) / 100;
      saves.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseInt(match[5]), // saves count
        secondary: savePct,
        trend,
        ggp: match[6] ? parseInt(match[6]) : undefined,
      });
      shutoutsFromSaves.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseInt(match[4]), // shutouts
        trend,
      });
      continue;
    }

    // Format A without GGP: "3. COLIN: 25 (66.00) 3 GGP" already matched above.
    // Fallback: simple "RANK. NAME: SAVES (PCT%) [GGP GGP]"
    match = line.match(
      /T?-?(\d+)\.\s*([A-Z]+)[:\s]+(\d+)\s*\((\d+(?:\.\d+)?%?)\)\s*(?:(\d+)\s*GGP)?/i
    );
    if (match) {
      saves.push({
        rank: parseInt(match[1]),
        name: match[2].trim(),
        value: parseInt(match[3]),
        secondary: parseFloat(match[4].replace("%", "")),
        trend,
        ggp: match[5] ? parseInt(match[5]) : undefined,
      });
      continue;
    }
  }

  return { saves, shutoutsFromSaves };
}

function detectSeason(text: string): string {
  const seasonMatch = text.match(/(\d{4})\s*SEASON/i);
  if (seasonMatch) return seasonMatch[1];

  const welcomeMatch = text.match(/WELCOME TO THE (\d{4})/i);
  if (welcomeMatch) return welcomeMatch[1];

  const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    const year = parseInt(dateMatch[3]);
    if (year >= 2026) return "2025";
    return dateMatch[3];
  }

  return "Unknown";
}

// --- Core parser (works on already-normalized text) ---

function parseContent(text: string): ParsedStats | null {
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  const date = dateMatch ? dateMatch[1] : "Unknown";

  const sections = text.split(/\n{2,}/);

  const findSection = (keyword: string): string => {
    const idx = sections.findIndex((s) =>
      s.split("\n")[0].toUpperCase().includes(keyword)
    );
    if (idx === -1) return "";
    let result = sections[idx];
    for (let i = idx + 1; i < sections.length; i++) {
      const firstLine = sections[i].split("\n")[0].trim();
      if (/^T?-?\d+\./.test(firstLine)) {
        result += "\n" + sections[i];
      } else {
        break;
      }
    }
    return result;
  };

  // Roster
  const roster: RosterEntry[] = [];
  const rosterIdx = sections.findIndex((s) =>
    s.toUpperCase().includes("ROSTER")
  );
  if (rosterIdx !== -1) {
    const rosterText = sections.slice(rosterIdx, rosterIdx + 2).join("\n");
    for (const line of rosterText.split("\n")) {
      const match = line.match(/^-?\s*([A-Z]+)\s*\(([^)]+)\),?/i);
      if (match && !match[0].toUpperCase().includes("ROSTER")) {
        roster.push({ name: match[1].trim(), position: match[2].trim() });
      }
    }
  }

  const plusMinus = parseStatLines(findSection("PLUS/MINUS"));
  const points = parseStatLines(findSection("POINTS"));
  const goals = parseStatLines(findSection("GOALS"));
  const assists = parseStatLines(findSection("ASSISTS"));
  const hits = parseStatLines(findSection("HITS"));

  // Saves — try both "SAVES" and "SAVE PERCENTAGE" headers
  let savesText = findSection("SAVES");
  if (!savesText) savesText = findSection("SAVE PERCENTAGE");
  const { saves, shutoutsFromSaves } = savesText
    ? parseSavesSection(savesText)
    : { saves: [], shutoutsFromSaves: [] };

  // Shutouts — standalone section (2025) or extracted from saves (2023/2024)
  const shutouts: StatEntry[] = [];
  const shutoutsText = findSection("SHUTOUTS");
  if (shutoutsText) {
    for (const line of shutoutsText.split("\n")) {
      const match = line.match(
        /T?-?(\d+)\.\s*([A-Z]+)[:\s]+(\d+)\s*\|\s*(\d+)/i
      );
      if (match) {
        shutouts.push({
          rank: parseInt(match[1]),
          name: match[2].trim(),
          value: parseInt(match[3]),
          secondary: parseInt(match[4]),
          trend: getTrend(line),
        });
      }
    }
  }
  // Fall back to shutouts extracted from saves data
  if (shutouts.length === 0 && shutoutsFromSaves.length > 0) {
    shutouts.push(...shutoutsFromSaves);
  }

  // Milestones
  const milestones: Milestone[] = [];
  const milestonesIdx = sections.findIndex((s) =>
    s.toUpperCase().includes("MILESTONES")
  );
  if (milestonesIdx !== -1) {
    const milestonesText = sections.slice(milestonesIdx).join("\n");
    let current: Milestone | null = null;
    for (const line of milestonesText.split("\n")) {
      if (line.toUpperCase().includes("MILESTONES:")) continue;
      const playerMatch = line.match(/^([A-Z]+)\s*-\s*</i);
      if (playerMatch) {
        if (current) milestones.push(current);
        current = { name: playerMatch[1].trim(), achievements: [] };
      } else if (current) {
        const achievement = line.replace(/,\s*$/, "").trim();
        if (achievement) current.achievements.push(achievement);
      }
    }
    if (current) milestones.push(current);
  }

  // Only return if we found some actual data
  if (points.length === 0 && goals.length === 0 && roster.length === 0)
    return null;

  return {
    date,
    roster,
    plusMinus,
    points,
    goals,
    assists,
    hits,
    saves,
    shutouts,
    milestones,
  };
}

// --- API ---

export async function fetchChannelMessages(limit = 300) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn("Discord credentials not configured");
    return [];
  }

  const all: any[] = [];
  let before: string | undefined;

  // Discord API caps at 100 per request — paginate to reach older messages
  while (all.length < limit) {
    const batchSize = Math.min(100, limit - all.length);
    const url = `${DISCORD_API}/channels/${channelId}/messages?limit=${batchSize}${before ? `&before=${before}` : ""}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("Failed to fetch Discord messages:", res.status);
      break;
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);
    before = batch[batch.length - 1].id;

    // Less than requested means we've hit the end of the channel
    if (batch.length < batchSize) break;
  }

  return all;
}

// --- Public parsers ---

export function parseStats(messages: unknown[]): ParsedStats | null {
  const statsMessage = (messages as any[]).find((msg) => {
    const normalized = normalizeUnicode(msg.content || "");
    return normalized.includes("BARDOWNSKI STATS");
  });
  if (!statsMessage) return null;
  return parseContent(normalizeUnicode(statsMessage.content));
}

const DATE_OVERRIDES: Record<string, string> = {
  "2023": "06/10/23",
};

// Corrections for known typos in Discord messages
// Format: { [season]: { [stat]: { [player]: correctedValue } } }
const STAT_CORRECTIONS: Record<string, Partial<Record<keyof ParsedStats, Record<string, number>>>> = {
  "2025": {
    goals: { COLIN: 98 },
  },
};

export function parseAllSeasons(messages: unknown[]): SeasonData[] {
  const seen = new Set<string>();
  const seasons: SeasonData[] = [];

  for (const msg of messages as any[]) {
    const normalized = normalizeUnicode(msg.content || "");
    if (!normalized.includes("BARDOWNSKI STATS")) continue;

    const season = detectSeason(normalized);
    if (season === "Unknown" || seen.has(season)) continue;

    const stats = parseContent(normalized);
    if (stats) {
      if (DATE_OVERRIDES[season]) stats.date = DATE_OVERRIDES[season];
      // Apply typo corrections
      const corrections = STAT_CORRECTIONS[season];
      if (corrections) {
        for (const [stat, playerMap] of Object.entries(corrections)) {
          const entries = stats[stat as keyof ParsedStats] as StatEntry[] | undefined;
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              if (entry.name in (playerMap as Record<string, number>)) {
                entry.value = (playerMap as Record<string, number>)[entry.name];
              }
            }
          }
        }
      }
      seen.add(season);
      seasons.push({ season, stats });
    }
  }

  seasons.sort((a, b) => parseInt(b.season) - parseInt(a.season));
  return seasons;
}

export function computeAllTimeRecords(seasons: SeasonData[]): AllTimeRecord[] {
  const best: Record<
    string,
    { player: string; value: number; season: string }
  > = {};

  const track = (
    key: string,
    entries: StatEntry[],
    season: string,
    higher = true
  ) => {
    for (const e of entries) {
      if (
        !best[key] ||
        (higher ? e.value > best[key].value : e.value < best[key].value)
      ) {
        best[key] = { player: e.name, value: e.value, season };
      }
    }
  };

  for (const { season, stats } of seasons) {
    track("goals", stats.goals, season);
    track("assists", stats.assists, season);
    track("points", stats.points, season);
    track("plusMinus", stats.plusMinus, season);
    track("hits", stats.hits, season);
    track("saves", stats.saves, season);
    track("shutouts", stats.shutouts, season);

    // Best save % (from saves entries where secondary = save%)
    for (const e of stats.saves) {
      if (
        e.secondary !== undefined &&
        e.ggp !== undefined &&
        e.ggp >= 10 &&
        (!best["savePercentage"] ||
          e.secondary > best["savePercentage"].value)
      ) {
        best["savePercentage"] = {
          player: e.name,
          value: e.secondary,
          season,
        };
      }
    }
  }

  return [
    {
      label: "Most Goals",
      category: "skater",
      ...(best["goals"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Most Assists",
      category: "skater",
      ...(best["assists"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Most Points",
      category: "skater",
      ...(best["points"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Best +/-",
      category: "skater",
      prefix: "+",
      ...(best["plusMinus"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Most Hits",
      category: "skater",
      ...(best["hits"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Most Saves",
      category: "goalie",
      ...(best["saves"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Best SV%",
      category: "goalie",
      suffix: "%",
      ...(best["savePercentage"] || { player: "—", value: 0, season: "" }),
    },
    {
      label: "Most Shutouts",
      category: "goalie",
      ...(best["shutouts"] || { player: "—", value: 0, season: "" }),
    },
  ];
}

// --- Season MVP ---

export interface SeasonMVP {
  season: string;
  player: string;
  position: string;
  highlights: string[];
  projected?: boolean;
}

// Manual MVP overrides for seasons decided by the team
const MVP_OVERRIDES: Record<string, { player: string; isGoalie: boolean }> = {
  "2023": { player: "MATT", isGoalie: false },
};

// Seasons still in progress get a "Projected" label
const PROJECTED_SEASONS = new Set(["2025"]);

export function computeSeasonMVPs(seasons: SeasonData[]): SeasonMVP[] {
  const mvps: SeasonMVP[] = [];

  for (const { season, stats } of seasons) {
    // Confirmed goalies from roster only — don't mark skaters who appear in saves
    const rosterGoalies = new Set(
      stats.roster
        .filter((r) => /\b(goalie|gk|g)\b/i.test(r.position))
        .map((r) => r.name)
    );

    const playerMap: Record<string, {
      points: number; goals: number; assists: number;
      plusMinus: number; hits: number;
      saves: number; savePercentage: number; shutouts: number;
      shutoutPeriods: number; goalieGamesPlayed: number; isGoalie: boolean;
    }> = {};

    const ensure = (name: string) => {
      if (!playerMap[name]) {
        playerMap[name] = {
          points: 0, goals: 0, assists: 0, plusMinus: 0, hits: 0,
          saves: 0, savePercentage: 0, shutouts: 0, shutoutPeriods: 0,
          goalieGamesPlayed: 0, isGoalie: rosterGoalies.has(name),
        };
      }
      return playerMap[name];
    };

    for (const e of stats.points) { ensure(e.name).points = e.value; }
    for (const e of stats.goals) { ensure(e.name).goals = e.value; }
    for (const e of stats.assists) { ensure(e.name).assists = e.value; }
    for (const e of stats.plusMinus) { ensure(e.name).plusMinus = e.value; }
    for (const e of stats.hits) { ensure(e.name).hits = e.value; }
    for (const e of stats.saves) {
      const p = ensure(e.name);
      p.saves = e.value;
      p.savePercentage = e.secondary ?? 0;
      p.goalieGamesPlayed = (e as SaveEntry).ggp ?? 0;
    }
    for (const e of stats.shutouts) {
      const p = ensure(e.name);
      p.shutouts = e.value;
      p.shutoutPeriods = e.secondary ?? 0;
    }

    let bestName = "";
    let forceGoalie: boolean | null = null;

    // Check for manual override first
    const override = MVP_OVERRIDES[season];
    if (override && playerMap[override.player]) {
      bestName = override.player;
      forceGoalie = override.isGoalie;
    } else {
      // Score skaters and goalies separately, then normalize to compare fairly
      const skaters: { name: string; score: number }[] = [];
      const goalies: { name: string; score: number }[] = [];

      for (const [name, p] of Object.entries(playerMap)) {
        if (p.isGoalie) {
          if (p.goalieGamesPlayed < 10) continue;
          const score =
            p.savePercentage * 2.0 +
            p.shutouts * 12 +
            p.shutoutPeriods * 3 +
            p.saves * 0.02 +
            p.goalieGamesPlayed * 0.5;
          goalies.push({ name, score });
        } else {
          const score =
            p.points * 2.5 +
            p.goals * 0.5 +
            Math.max(p.plusMinus, 0) * 1.0 +
            p.hits * 0.15;
          skaters.push({ name, score });
        }
      }

      const maxSkater = Math.max(...skaters.map((s) => s.score), 1);
      const maxGoalie = Math.max(...goalies.map((g) => g.score), 1);
      const GOALIE_BONUS = 1.15;

      let bestScore = -Infinity;
      for (const s of skaters) {
        const norm = s.score / maxSkater;
        if (norm > bestScore) { bestScore = norm; bestName = s.name; }
      }
      for (const g of goalies) {
        const norm = Math.min((g.score / maxGoalie) * GOALIE_BONUS, 1.15);
        if (norm > bestScore) { bestScore = norm; bestName = g.name; }
      }
    }

    if (bestName) {
      const p = playerMap[bestName];
      const showAsGoalie = forceGoalie !== null ? forceGoalie : p.isGoalie;
      const rosterEntry = stats.roster.find((r) => r.name === bestName);
      const position = rosterEntry?.position ?? (showAsGoalie ? "Goalie" : "Skater");
      const highlights: string[] = [];

      if (showAsGoalie) {
        if (p.savePercentage)
          highlights.push(`${p.savePercentage.toFixed(1)}% SV`);
        if (p.saves) highlights.push(`${p.saves} SVS`);
        if (p.shutouts) highlights.push(`${p.shutouts} SO`);
        if (p.goalieGamesPlayed)
          highlights.push(`${p.goalieGamesPlayed} GP`);
      } else {
        if (p.points) highlights.push(`${p.points} PTS`);
        if (p.goals) highlights.push(`${p.goals} G`);
        if (p.assists) highlights.push(`${p.assists} A`);
        if (p.plusMinus > 0) highlights.push(`+${p.plusMinus}`);
      }

      mvps.push({
        season,
        player: bestName,
        position,
        highlights: highlights.slice(0, 4),
        projected: PROJECTED_SEASONS.has(season),
      });
    }
  }

  return mvps;
}

// --- MVP Odds ---

export interface MvpOddsEntry {
  name: string;
  position: string;
  score: number;
  probability: number;
  americanOdds: string;
  isGoalie: boolean;
  highlights: string[];
}

export function computeMvpOdds(messages: unknown[]): MvpOddsEntry[] {
  const stats = parseStats(messages);
  if (!stats) return [];

  // Build player data — collect all stats for every player
  const playerMap: Record<string, {
    points: number; goals: number; assists: number;
    plusMinus: number; hits: number;
    saves: number; savePercentage: number; shutouts: number;
    shutoutPeriods: number; goalieGamesPlayed: number;
  }> = {};

  const ensure = (name: string) => {
    if (!playerMap[name]) {
      playerMap[name] = {
        points: 0, goals: 0, assists: 0, plusMinus: 0, hits: 0,
        saves: 0, savePercentage: 0, shutouts: 0, shutoutPeriods: 0,
        goalieGamesPlayed: 0,
      };
    }
    return playerMap[name];
  };

  for (const e of stats.points) { ensure(e.name).points = e.value; }
  for (const e of stats.goals) { ensure(e.name).goals = e.value; }
  for (const e of stats.assists) { ensure(e.name).assists = e.value; }
  for (const e of stats.plusMinus) { ensure(e.name).plusMinus = e.value; }
  for (const e of stats.hits) { ensure(e.name).hits = e.value; }
  for (const e of stats.saves) {
    const p = ensure(e.name);
    p.saves = e.value;
    p.savePercentage = e.secondary ?? 0;
    p.goalieGamesPlayed = (e as SaveEntry).ggp ?? 0;
  }
  for (const e of stats.shutouts) {
    const p = ensure(e.name);
    p.shutouts = e.value;
    p.shutoutPeriods = e.secondary ?? 0;
  }

  // Players can have BOTH a skater entry and a goalie entry if they have
  // meaningful stats in both roles (skater stats > 0 AND goalie GGP >= 10)
  const skaters: { name: string; score: number }[] = [];
  const goalies: { name: string; score: number }[] = [];

  for (const [name, p] of Object.entries(playerMap)) {
    // Skater entry: anyone with points, goals, or hits
    const hasSkaterStats = p.points > 0 || p.goals > 0 || p.hits > 0;
    if (hasSkaterStats) {
      const score =
        p.points * 2.5 +
        p.goals * 0.5 +
        Math.max(p.plusMinus, 0) * 1.0 +
        p.hits * 0.15;
      skaters.push({ name, score });
    }

    // Goalie entry: anyone with 10+ goalie games played
    if (p.goalieGamesPlayed >= 10) {
      const score =
        p.savePercentage * 2.0 +
        p.shutouts * 12 +
        p.shutoutPeriods * 3 +
        p.saves * 0.02 +
        p.goalieGamesPlayed * 0.5;
      goalies.push({ name, score });
    }
  }

  if (skaters.length === 0 && goalies.length === 0) return [];

  // Normalize each group to 0–1, then apply a goalie factor
  const maxSkater = Math.max(...skaters.map((s) => s.score), 1);
  const maxGoalie = Math.max(...goalies.map((g) => g.score), 1);
  const GOALIE_FACTOR = 0.35;

  const all = [
    ...skaters.map((s) => ({
      name: s.name,
      normalizedScore: s.score / maxSkater,
      isGoalie: false,
    })),
    ...goalies.map((g) => ({
      name: g.name,
      normalizedScore: (g.score / maxGoalie) * GOALIE_FACTOR,
      isGoalie: true,
    })),
  ];

  all.sort((a, b) => b.normalizedScore - a.normalizedScore);
  const top5 = all.slice(0, 5);

  // Probabilities sum to 100% across the displayed top 5
  const totalScore = top5.reduce((s, e) => s + e.normalizedScore, 0);

  return top5.map((entry) => {
    const p = playerMap[entry.name];
    const prob = totalScore > 0 ? entry.normalizedScore / totalScore : 0;

    // Convert to American odds
    let odds: string;
    if (prob >= 0.5) {
      odds = `${Math.round(-(prob / (1 - prob)) * 100)}`;
    } else if (prob > 0) {
      odds = `+${Math.round(((1 - prob) / prob) * 100)}`;
    } else {
      odds = "—";
    }

    const rosterEntry = stats.roster.find((r) => r.name === entry.name);
    const rosterPos = rosterEntry?.position ?? "Skater";
    // Show role-specific position label for dual players
    const position = entry.isGoalie ? "Goalie" : rosterPos;

    const highlights: string[] = [];
    if (entry.isGoalie) {
      highlights.push(`${(p.savePercentage || 0).toFixed(1)}% SV`);
      highlights.push(`${p.shutouts} SO`);
      highlights.push(`${p.shutoutPeriods} SOP`);
    } else {
      highlights.push(`${p.points} PTS`);
      highlights.push(`${p.goals} G`);
      highlights.push(`${p.assists} A`);
    }

    return {
      name: entry.name,
      position,
      score: entry.normalizedScore,
      probability: prob,
      americanOdds: odds,
      isGoalie: entry.isGoalie,
      highlights: highlights.slice(0, 3),
    };
  });
}

// --- Player of the Cycle ---

export interface CyclePlayer {
  name: string;
  position: string;
  isGoalie: boolean;
  deltaGoals: number;
  deltaAssists: number;
  deltaPoints: number;
  deltaHits: number;
  deltaSaves: number;
  cycleScore: number;
}

export function computePlayerOfCycle(messages: unknown[]): CyclePlayer | null {
  // Filter to BARDOWNSKI STATS messages — Discord returns newest first
  const statMessages = (messages as any[]).filter((msg) => {
    const normalized = normalizeUnicode(msg.content || "");
    return normalized.includes("BARDOWNSKI STATS");
  });

  // Compare against 2 drops back to combine the last two cycles
  const compareIndex = statMessages.length >= 3 ? 2 : 1;
  if (statMessages.length < 2) return null;

  const current = parseContent(normalizeUnicode(statMessages[0].content));
  const previous = parseContent(normalizeUnicode(statMessages[compareIndex].content));

  if (!current || !previous) return null;

  // Build previous-stat lookup maps
  const prevGoals = Object.fromEntries(previous.goals.map((e) => [e.name, e.value]));
  const prevAssists = Object.fromEntries(previous.assists.map((e) => [e.name, e.value]));
  const prevHits = Object.fromEntries(previous.hits.map((e) => [e.name, e.value]));
  const prevSaves = Object.fromEntries(previous.saves.map((e) => [e.name, e.value]));

  // All players appearing in the current stats
  const allNames = new Set([
    ...current.goals.map((e) => e.name),
    ...current.assists.map((e) => e.name),
    ...current.saves.map((e) => e.name),
  ]);

  let best: CyclePlayer | null = null;

  for (const name of allNames) {
    const isGoalie = current.saves.some((e) => e.name === name);

    const curGoals = current.goals.find((e) => e.name === name)?.value ?? 0;
    const curAssists = current.assists.find((e) => e.name === name)?.value ?? 0;
    const curHits = current.hits.find((e) => e.name === name)?.value ?? 0;
    const curSaves = current.saves.find((e) => e.name === name)?.value ?? 0;

    const deltaGoals = Math.max(0, curGoals - (prevGoals[name] ?? 0));
    const deltaAssists = Math.max(0, curAssists - (prevAssists[name] ?? 0));
    const deltaHits = Math.max(0, curHits - (prevHits[name] ?? 0));
    const deltaSaves = Math.max(0, curSaves - (prevSaves[name] ?? 0));
    const deltaPoints = deltaGoals + deltaAssists;

    const score = isGoalie
      ? deltaSaves * 0.5
      : deltaPoints * 3 + deltaHits * 0.2;

    if (!best || score > best.cycleScore) {
      const rosterEntry = current.roster.find((r) => r.name === name);
      best = {
        name,
        position: rosterEntry?.position ?? (isGoalie ? "G" : "—"),
        isGoalie,
        deltaGoals,
        deltaAssists,
        deltaPoints,
        deltaHits,
        deltaSaves,
        cycleScore: score,
      };
    }
  }

  // Only return if there was actual movement this cycle
  if (!best || best.cycleScore <= 0) return null;

  return best;
}

// --- Enriched player data ---

export function getEnrichedPlayers(stats: ParsedStats): EnrichedPlayer[] {
  return stats.roster.map((player) => {
    const pm = stats.plusMinus.find((e) => e.name === player.name);
    const pts = stats.points.find((e) => e.name === player.name);
    const g = stats.goals.find((e) => e.name === player.name);
    const a = stats.assists.find((e) => e.name === player.name);
    const h = stats.hits.find((e) => e.name === player.name);
    const sv = stats.saves.find((e) => e.name === player.name) as
      | SaveEntry
      | undefined;
    const so = stats.shutouts.find((e) => e.name === player.name);

    return {
      name: player.name,
      position: player.position,
      gamesPlayed: pts?.secondary,
      points: pts?.value,
      goals: g?.value,
      assists: a?.value,
      plusMinus: pm?.value,
      hits: h?.value,
      pim: h?.secondary,
      shotPercentage: g?.secondary,
      passPercentage: a?.secondary,
      saves: sv?.value,
      savePercentage: sv?.secondary,
      goalieGamesPlayed: sv?.ggp,
      shutouts: so?.value,
      shutoutPeriods: so?.secondary,
    };
  });
}
