/**
 * Line connection: one score for ANY lineup of two or more players, goalie included.
 *
 * Every pair in the lineup (skater–skater and goalie–skater) gets a pair score.
 * A pair with no games together starts at a projection from both players'
 * ratings and recent form; each shared game moves it toward what actually
 * happened with those two on the ice together. The lineup score is the mean of
 * its pair scores, then pulled toward the whole unit's own record when that exact
 * group (with that goalie in net) has played together. Players slotted away from
 * the positions they actually play lose points for fit.
 *
 * Pure: no fetching, clock, storage or cross-season lookups. The caller supplies
 * one season's players and games.
 */
import type { ClubMatch, ClubMember } from "./chelstats";
import type { ChemistryGame } from "./line-chemistry";
import { normalizeChemistryName } from "./line-chemistry";
import { getPlayerGrade, getPlayerPerformanceRating } from "./line-ratings";
import type { GoalieGame } from "./goalie-lines";

export type Position = "C" | "LW" | "RW" | "D" | "G";
/** Slot roles. "any" = pair builder, no positional expectation. */
export type SlotRole = "any" | "C" | "W" | "LW" | "RW" | "D" | "LD" | "RD";

export interface ConnectionPlayer {
  id: string;
  /** Source OVR (0–100] when available. */
  overallRating: number | null;
  /** Local fallback when OVR is unavailable. */
  performanceRating: number | null;
  /** Games recorded at each position this season (from match lineups). */
  positionGames: Record<Position, number>;
  /** Skater positions split by how many of our skaters were in that game
   * (a lone skater plays C; with a teammate, he may move to the wing). */
  positionGamesBySize?: Record<number, Record<Position, number>>;
  /** Roster position, used only when no match positions were recorded. */
  memberPosition: string | null;
  /** True for club members; guests are never suggested. */
  member: boolean;
}

export interface ConnectionGame {
  id: string;
  date: string;
  timestamp: number;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  skaters: string[];
  goalie: string | null;
  goalieSaves: number | null;
  goalieShots: number | null;
  /** Position each of our skaters played in this game, when recorded. */
  positions?: Record<string, Position>;
  /** False for partial scoresheets: their skater list is not a whole lineup. */
  complete?: boolean;
  /** Game mode when the feed recorded it. */
  mode?: "3s" | "6s";
}

export interface ConnectionRecord {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Line records only: games where a drop-in guest filled an open spot. */
  dropInGames?: number;
}

export interface PairConnection {
  players: [string, string];
  /** True when one side is the goalie. */
  withGoalie: boolean;
  percentage: number;
  record: ConnectionRecord;
}

export interface PositionNote {
  id: string;
  role: SlotRole;
  /** 0–1: how familiar the player is with this slot. */
  familiarity: number;
  /** Most-played position this season, if known. */
  usual: Position | null;
}

export type ConnectionEvidence = "proven" | "early" | "pairs" | "projection";

export interface ConnectionResult {
  percentage: number;
  /** Unrounded, unclamped score; used for ranking so fit still separates capped lines. */
  score: number;
  grade: string;
  participants: string[];
  pairs: PairConnection[];
  /** Games with every selected player (and the selected goalie in net). */
  unit: ConnectionRecord & { matchingGames: ConnectionGame[]; savePct: number | null };
  evidence: ConnectionEvidence;
  /** Points removed for players away from their usual positions. */
  positionPenalty: number;
  outOfPosition: PositionNote[];
}

export interface LineupSlot { id: string; role: SlotRole }

/** Shared-game weight: after K games together, results and projection count equally. */
export const PAIR_PRIOR_GAMES = 4;
/** A player's own form is shrunk toward even over this many games. */
const FORM_PRIOR_GAMES = 5;
/** Points lost per slotted skater who never plays that position (scaled by familiarity). */
const POSITION_PENALTY = 12;
/** Overall position history counts as this many games against lineup-size-specific history. */
const SIZE_PRIOR_GAMES = 2;
/** Extra points lost when a goalie-first player is slotted as a skater. */
const GOALIE_AS_SKATER_PENALTY = 10;
/** Result-scale points per rating point above/below the roster's average rating. */
const TALENT_WEIGHT = 0.3;
/** The club's own average shows as this connection; results are relative to the club. */
const CLUB_AVERAGE = 60;
/** Connection points per result-score point above/below the club average. */
const SPREAD = 2;

export const CONNECTION_DESCRIPTION =
  "Connection is a Bardownski index from 0 to 100, not a win probability. " +
  `The club's own season average shows as ${CLUB_AVERAGE}. Results are scored as half win share (draws count half) and half goal share, ` +
  `and every point above or below the club's result is worth ${SPREAD} connection points. ` +
  "Each player starts from their form: the club's results in games they played in that role (skater or goalie), pulled toward the club average over their first five games. " +
  "Their rating (OVR, or a points and plus-minus rating when OVR is missing) nudges that up or down against the roster average. " +
  "Every pair in your lineup, including goalie–skater pairs, starts at the average of the two players. " +
  `Each game they played together moves the pair toward their real results; after ${PAIR_PRIOR_GAMES} shared games, real results and the projection count equally. ` +
  "The lineup's connection is the average of all its pairs. If the whole unit (with the same goalie in net) has played together, its own record is blended in the same way. " +
  `Each skater slotted away from the positions they actually play loses up to ${POSITION_PENALTY} points, scaled by how rarely they play there. ` +
  "Positions are read for the same number of our skaters (a lone skater usually plays center, even if he's a winger beside a teammate); " +
  `a goalie playing as a skater loses a further ${GOALIE_AS_SKATER_PENALTY}. ` +
  "Grades: A ≥80, B ≥65, C ≥45, D ≥30, F below 30. Team results depend on opponents and teammates too, so small samples move quickly.";

const POSITIONS: readonly Position[] = ["C", "LW", "RW", "D", "G"];
const emptyPositions = (): Record<Position, number> => ({ C: 0, LW: 0, RW: 0, D: 0, G: 0 });

/** How well a player who plays `position` fits a slot `role` (0–1). */
const AFFINITY: Record<Exclude<SlotRole, "any">, Record<Position, number>> = {
  C: { C: 1, LW: 0.6, RW: 0.6, D: 0.2, G: 0 },
  W: { C: 0.7, LW: 1, RW: 1, D: 0.2, G: 0 },
  LW: { C: 0.6, LW: 1, RW: 0.7, D: 0.2, G: 0 },
  RW: { C: 0.6, LW: 0.7, RW: 1, D: 0.2, G: 0 },
  D: { C: 0.2, LW: 0.2, RW: 0.2, D: 1, G: 0 },
  LD: { C: 0.2, LW: 0.2, RW: 0.2, D: 1, G: 0 },
  RD: { C: 0.2, LW: 0.2, RW: 0.2, D: 1, G: 0 },
};

/** Normalizes feed and roster spellings; unknown values (e.g. "SKTR") → null. */
export function normalizePosition(raw: string | null | undefined): Position | null {
  const value = (raw ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (["g", "gk", "goalie", "goaltender", "goalkeeper"].includes(value)) return "G";
  if (["c", "center", "centre"].includes(value)) return "C";
  if (["lw", "leftwing"].includes(value)) return "LW";
  if (["rw", "rightwing"].includes(value)) return "RW";
  if (["d", "ld", "rd", "defense", "defence", "defensemen", "defenseman", "defenceman", "leftdefense", "rightdefense"].includes(value)) return "D";
  return null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const validRating = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100;
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function connectionGrade(score: number): string {
  return score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : score >= 30 ? "D" : "F";
}

/* ── Dataset builders (server side) ─────────────────────────────────────── */

/** Positions come from OUR players' recorded match lineups for this season. */
export function buildConnectionPlayers(
  members: readonly ClubMember[],
  matches: readonly Pick<ClubMatch, "players">[],
  games: readonly ChemistryGame[],
): ConnectionPlayer[] {
  const players = new Map<string, ConnectionPlayer>();
  const ensure = (id: string, member = false): ConnectionPlayer => {
    const existing = players.get(id);
    if (existing) { if (member) existing.member = true; return existing; }
    const created: ConnectionPlayer = { id, overallRating: null, performanceRating: null, positionGames: emptyPositions(), memberPosition: null, member };
    players.set(id, created);
    return created;
  };
  for (const member of members) {
    const id = normalizeChemistryName(member.username);
    if (!id) continue;
    const player = ensure(id, true);
    player.memberPosition = member.position ?? null;
    if (validRating(member.overallRating)) player.overallRating = member.overallRating;
    else if (getPlayerGrade(member.overallRating) === null) {
      const performance = getPlayerPerformanceRating(member).rating;
      if (performance !== null) player.performanceRating = performance;
    }
  }
  for (const match of matches) {
    const seen = new Set<string>();
    const ours = (match.players ?? []).filter(player => player.isOurPlayer === true);
    // Every one of our skaters (guests too) takes a real spot on the ice.
    const lineupSize = new Set(ours.filter(player => !player.isGoalie && normalizePosition(player.position) !== "G")
      .map(player => normalizeChemistryName(player.name)).filter(Boolean)).size;
    for (const player of ours) {
      const id = normalizeChemistryName(player.name);
      const position = player.isGoalie ? "G" : normalizePosition(player.position);
      if (!id || !position || seen.has(id)) continue;
      seen.add(id);
      const entry = ensure(id);
      entry.positionGames[position]++;
      if (position !== "G" && lineupSize > 0) {
        const bySize = entry.positionGamesBySize ??= {};
        (bySize[lineupSize] ??= emptyPositions())[position]++;
      }
    }
  }
  for (const game of games) for (const id of game.skaters) ensure(id);
  return [...players.values()].sort((a, b) => lexical(a.id, b.id));
}

/** Joins canonical chemistry games with their verified goalie and, when the
 * source match is supplied, the position each of our skaters played. */
export function buildConnectionGames(
  games: readonly ChemistryGame[], goalieGames: readonly GoalieGame[],
  matches: readonly (Pick<ClubMatch, "id" | "players"> & { gameMode?: "3s" | "6s" })[] = [],
): ConnectionGame[] {
  const goalies = new Map(goalieGames.map(game => [game.id, game]));
  const lineups = new Map<string, Record<string, Position>>();
  const modes = new Map<string, "3s" | "6s">();
  for (const match of matches) {
    if (match.gameMode === "3s" || match.gameMode === "6s") modes.set(String(match.id).trim(), match.gameMode);
    const positions: Record<string, Position> = {};
    for (const player of match.players ?? []) {
      if (player.isOurPlayer !== true || player.isGoalie) continue;
      const id = normalizeChemistryName(player.name), position = normalizePosition(player.position);
      if (id && position && position !== "G") positions[id] = position;
    }
    lineups.set(String(match.id).trim(), positions);
  }
  return games.map(game => {
    const goalie = goalies.get(game.id);
    const positions = lineups.get(game.id);
    const mode = modes.get(game.id);
    return {
      ...(positions ? { positions } : {}),
      ...(mode ? { mode } : {}),
      complete: game.coverage !== "partial-scoresheet",
      id: game.id, date: game.date, timestamp: game.timestamp, opponent: game.opponent,
      goalsFor: game.goalsFor, goalsAgainst: game.goalsAgainst, skaters: [...game.skaters],
      goalie: goalie?.goalieId ?? null,
      goalieSaves: goalie?.saves ?? null, goalieShots: goalie?.shotsAgainst ?? null,
    };
  });
}

/** Recorded mode, else inferred: three or fewer of our skaters is a 3s game. */
export function connectionGameMode(game: Pick<ConnectionGame, "mode" | "skaters">): "3s" | "6s" {
  return game.mode ?? (game.skaters.length <= 3 ? "3s" : "6s");
}

/* ── Evaluation ─────────────────────────────────────────────────────────── */

function record(games: readonly ConnectionGame[]): ConnectionRecord {
  const result: ConnectionRecord = { games: games.length, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 };
  for (const game of games) {
    result.goalsFor += game.goalsFor;
    result.goalsAgainst += game.goalsAgainst;
    if (game.goalsFor > game.goalsAgainst) result.wins++;
    else if (game.goalsFor < game.goalsAgainst) result.losses++;
    else result.draws++;
  }
  return result;
}

/** 0–100: half win share (draws half), half goal share. Even = 50. */
export function resultScore(r: ConnectionRecord): number {
  if (!r.games) return 50;
  const goals = r.goalsFor + r.goalsAgainst;
  return 100 * (0.5 * (r.wins + r.draws / 2) / r.games + 0.5 * (goals ? r.goalsFor / goals : 0.5));
}

const blend = (observed: number, games: number, prior: number, weight: number) =>
  (games * observed + weight * prior) / (games + weight);

type Participant = { id: string; goalie: boolean };

const plays = (game: ConnectionGame, p: Participant) =>
  p.goalie ? game.goalie === p.id : game.skaters.includes(p.id);

/** Reusable per-season context; caches baselines and pair scores across calls. */
export class ConnectionModel {
  private readonly players: Map<string, ConnectionPlayer>;
  private readonly baselines = new Map<string, number>();
  private readonly pairCache = new Map<string, { percentage: number; record: ConnectionRecord }>();
  /** The club's result score over every game in the season. */
  readonly clubScore: number;
  private readonly averageTalent: number;

  constructor(readonly games: readonly ConnectionGame[], players: readonly ConnectionPlayer[]) {
    this.players = new Map(players.map(player => [player.id, player]));
    this.clubScore = resultScore(record(games));
    const rated = players.filter(player => player.member).map(player => player.overallRating ?? player.performanceRating)
      .filter((value): value is number => value !== null);
    this.averageTalent = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : 0;
  }

  /** Result-scale value → displayed connection points. */
  private display(raw: number): number {
    return CLUB_AVERAGE + SPREAD * (raw - this.clubScore);
  }

  player(id: string): ConnectionPlayer | undefined { return this.players.get(id); }

  /** Most-played position (with that many of our skaters, when known); falls back to the roster position. */
  usualPosition(id: string, lineupSize?: number): Position | null {
    const player = this.players.get(id);
    if (!player) return null;
    const sized = lineupSize ? player.positionGamesBySize?.[lineupSize] : undefined;
    const counts = sized && POSITIONS.some(position => sized[position] > 0) ? sized : player.positionGames;
    let best: Position | null = null, most = 0;
    for (const position of POSITIONS) if (counts[position] > most) { best = position; most = counts[position]; }
    return best ?? normalizePosition(player.memberPosition);
  }

  /** True when a player mostly plays goal: never suggested as a skater. */
  isGoalieFirst(id: string): boolean {
    const player = this.players.get(id);
    if (!player) return false;
    const total = POSITIONS.reduce((sum, position) => sum + player.positionGames[position], 0);
    return total ? player.positionGames.G / total > 0.5 : normalizePosition(player.memberPosition) === "G";
  }

  /**
   * 0–1 fit for a slot. With `lineupSize` (how many of our skaters), games at
   * that size lead: a lone skater plays C even if he's a winger beside a
   * teammate. Few games at that size are blended with his overall pattern.
   */
  familiarity(id: string, role: SlotRole, lineupSize?: number): number {
    if (role === "any") return 1;
    const player = this.players.get(id);
    if (!player) return 0.5;
    const fit = (counts: Record<Position, number>) => {
      const total = POSITIONS.reduce((sum, position) => sum + counts[position], 0);
      return total ? { value: POSITIONS.reduce((sum, position) => sum + counts[position] * AFFINITY[role][position], 0) / total, games: total } : null;
    };
    const overall = fit(player.positionGames);
    const sized = lineupSize && player.positionGamesBySize?.[lineupSize] ? fit(player.positionGamesBySize[lineupSize]) : null;
    if (sized && overall) return blend(sized.value, sized.games, overall.value, SIZE_PRIOR_GAMES);
    if (sized) return sized.value;
    if (overall) return overall.value;
    const fallback = normalizePosition(player.memberPosition);
    return fallback ? AFFINITY[role][fallback] : 0.5;
  }

  baseline(p: Participant): number {
    const key = `${p.goalie ? "G" : "S"}:${p.id}`;
    const cached = this.baselines.get(key);
    if (cached !== undefined) return cached;
    const player = this.players.get(p.id);
    const talent = player?.overallRating ?? player?.performanceRating ?? null;
    const own = record(this.games.filter(game => plays(game, p)));
    const form = blend(resultScore(own), own.games, this.clubScore, FORM_PRIOR_GAMES);
    const value = form + (talent === null || !this.averageTalent ? 0 : TALENT_WEIGHT * (talent - this.averageTalent));
    this.baselines.set(key, value);
    return value;
  }

  pair(a: Participant, b: Participant): { percentage: number; record: ConnectionRecord } {
    const [x, y] = [a, b].sort((l, r) => lexical(`${l.goalie}${l.id}`, `${r.goalie}${r.id}`));
    const key = `${x.goalie ? "G" : "S"}:${x.id}|${y.goalie ? "G" : "S"}:${y.id}`;
    const cached = this.pairCache.get(key);
    if (cached) return cached;
    const shared = record(this.games.filter(game => plays(game, x) && plays(game, y)));
    const prior = (this.baseline(x) + this.baseline(y)) / 2;
    const result = { percentage: this.display(blend(resultScore(shared), shared.games, prior, PAIR_PRIOR_GAMES)), record: shared };
    this.pairCache.set(key, result);
    return result;
  }

  /**
   * Any lineup of two or more distinct players (skater slots + optional goalie).
   * Empty slots are ignored; returns null below two players.
   *
   * By default the unit record is every game with all of these players in it.
   * With `exact`, it is only games where these were ALL of our club skaters
   * (drop-in guests count as AI), so a one-skater line never borrows games
   * he played beside a teammate. Line ideas use exact records.
   */
  evaluate(slots: readonly LineupSlot[], goalieId: string | null, { exact = false }: { exact?: boolean } = {}): ConnectionResult | null {
    const skaters = slots.filter(slot => slot.id);
    const participants: Participant[] = skaters.map(slot => ({ id: slot.id, goalie: false }));
    if (goalieId) participants.push({ id: goalieId, goalie: true });
    const ids = participants.map(p => p.id);
    if (participants.length < 2 || new Set(ids).size !== ids.length) return null;

    const pairs: PairConnection[] = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const a = participants[i], b = participants[j];
        const { percentage, record: shared } = this.pair(a, b);
        pairs.push({ players: [a.id, b.id], withGoalie: a.goalie || b.goalie, percentage: Math.round(percentage), record: shared });
      }
    }
    const pairMean = pairs.reduce((sum, pair) => sum + this.pair(
      participants.find(p => p.id === pair.players[0])!, participants.find(p => p.id === pair.players[1])!).percentage, 0) / pairs.length;

    const unitGames = this.games.filter(game => participants.every(p => plays(game, p)) && (!exact || this.exactLineup(game, skaters.length)));
    const unit = { ...record(unitGames), dropInGames: this.dropIns(unitGames) };
    // An exact one-skater unit is its own record, not just the goalie–skater pair.
    const unitBlend = participants.length > 2 || exact
      ? blend(this.display(resultScore(unit)), unit.games, pairMean, PAIR_PRIOR_GAMES) : pairMean;

    const outOfPosition: PositionNote[] = [];
    let positionPenalty = 0;
    const lineupSize = skaters.length;
    for (const slot of skaters) {
      const goalieFirst = this.isGoalieFirst(slot.id);
      const familiarity = goalieFirst ? 0 : this.familiarity(slot.id, slot.role, lineupSize);
      if (slot.role !== "any" || goalieFirst) positionPenalty += POSITION_PENALTY * (1 - familiarity);
      if (goalieFirst) positionPenalty += GOALIE_AS_SKATER_PENALTY;
      if (familiarity < 0.6) outOfPosition.push({ id: slot.id, role: slot.role, familiarity, usual: goalieFirst ? "G" : this.usualPosition(slot.id, lineupSize) });
    }
    const score = unitBlend - positionPenalty;
    const percentage = Math.round(clamp(score, 0, 100));

    let saves = 0, shots = 0, complete = Boolean(goalieId) && unitGames.length > 0;
    for (const game of unitGames) {
      if (game.goalieSaves === null || game.goalieShots === null) { complete = false; break; }
      saves += game.goalieSaves; shots += game.goalieShots;
    }
    const sharedPairs = pairs.some(pair => pair.record.games > 0);
    return {
      percentage, score, grade: connectionGrade(percentage), participants: ids, pairs,
      unit: { ...unit, matchingGames: unitGames, savePct: complete && shots > 0 ? 100 * saves / shots : null },
      evidence: unit.games >= 5 ? "proven" : unit.games > 0 ? "early" : sharedPairs ? "pairs" : "projection",
      positionPenalty: Math.round(positionPenalty), outOfPosition,
    };
  }

  /** Games where a non-member (drop-in guest) skated for us. */
  private dropIns(games: readonly ConnectionGame[]): number {
    return games.filter(game => game.skaters.some(id => !this.players.get(id)?.member)).length;
  }

  /** True when the game's club skaters (guests excluded) number exactly `count`
   * and its scoresheet is whole. Callers have already checked who played. */
  private exactLineup(game: ConnectionGame, count: number): boolean {
    if (game.complete === false) return false;
    return new Set(game.skaters.filter(id => this.players.get(id)?.member)).size === count;
  }

  /**
   * Fill every empty slot from `pool` (goalie-first players and the goalie are
   * never used as skaters). Filled slots and the goalie stay fixed. Each player
   * set is placed in its best-fitting slot order.
   */
  suggest(
    roles: readonly SlotRole[], fixed: readonly string[], goalieId: string | null,
    pool: readonly string[], options: LineIdeaOptions = {},
  ): Suggestion[] {
    const minGames = Math.max(0, Math.floor(options.minGames ?? 0));
    const taken = new Set([...fixed.filter(Boolean), ...(goalieId ? [goalieId] : [])]);
    const candidates = [...new Set(pool)].filter(id => {
      const player = this.players.get(id);
      return player?.member && !taken.has(id) && !this.isGoalieFirst(id);
    }).sort(lexical);
    const open = roles.map((_, index) => index).filter(index => !fixed[index]);
    // `skaters` = exact number of our skaters in the line; the rest stay open
    // (AI). Omitted = fill every slot. Try every choice of which slots to fill.
    const need = options.skaters === undefined ? open.length : options.skaters - (roles.length - open.length);
    if (need <= 0 || need > open.length || candidates.length < need) return [];
    const subsets: number[][] = [];
    const choose = (start: number, picked: number[]) => {
      if (picked.length === need) { subsets.push([...picked]); return; }
      for (let index = start; index <= open.length - (need - picked.length); index++) choose(index + 1, [...picked, open[index]]);
    };
    choose(0, []);
    const best = new Map<string, Suggestion>();
    const current = roles.map((_, index) => fixed[index] ?? "");
    const used = new Set<string>();
    for (const fill of subsets) {
      const visit = (depth: number) => {
        if (depth === fill.length) {
          const slots = roles.map((role, index) => ({ id: current[index], role }));
          const result = this.evaluate(slots, goalieId, { exact: true });
          if (!result || result.unit.games < minGames) return;
          const key = current.filter(Boolean).sort().join("|");
          const previous = best.get(key);
          if (!previous || result.score > previous.result.score) best.set(key, { slots: [...current], goalie: goalieId, result });
          return;
        }
        for (const id of candidates) {
          if (used.has(id)) continue;
          used.add(id); current[fill[depth]] = id;
          visit(depth + 1);
          used.delete(id); current[fill[depth]] = "";
        }
      };
      visit(0);
    }
    return [...best.values()].sort(compareSuggestions(options.sort ?? "connection")).slice(0, options.limit ?? 24);
  }

  /**
   * Suggestions with a goalie in net. Each goalie candidate (never one already
   * in a skater slot) is tried; every skater group keeps only its best-ranked
   * goalie for the chosen sort, so the list shows each line's best full unit.
   */
  suggestWithGoalies(
    roles: readonly SlotRole[], fixed: readonly string[], goalies: readonly string[],
    pool: readonly string[], options: LineIdeaOptions = {},
  ): Suggestion[] {
    const compare = compareSuggestions(options.sort ?? "connection");
    const best = new Map<string, Suggestion>();
    for (const goalie of [...new Set(goalies)]) {
      if (!goalie || fixed.includes(goalie)) continue;
      for (const line of this.suggest(roles, fixed, goalie, pool, { ...options, limit: Number.MAX_SAFE_INTEGER })) {
        const key = [...line.slots].sort().join("|");
        const previous = best.get(key);
        if (!previous || compare(line, previous) < 0) best.set(key, line);
      }
    }
    return [...best.values()].sort(compare).slice(0, options.limit ?? 24);
  }

  /**
   * Lineups that actually played together this season, grouped by the exact
   * set of OUR club skaters (AI or drop-in guests fill any open spots). With a
   * goalie, one skater plus the goalie is a unit too. The 3s builder uses 3s games,
   * the full unit uses 6v6 games (by recorded mode, else by skater count) and
   * the pair builder uses every pair of skaters. Partial scoresheets are
   * skipped. With `withGoalie` (default) each unit is split by who was in net,
   * games without a recorded goalie are left out, and a selected goalie limits
   * it to his games;
   * without it, a line's games combine regardless of goalie. Groups must include every
   * fixed pick and are placed in the slots they actually played.
   */
  usedLines(
    roles: readonly SlotRole[], fixed: readonly string[], goalieId: string | null,
    options: LineIdeaOptions & { withGoalie?: boolean } = {},
  ): UsedLine[] {
    // Skaters only: one group per skater set regardless of who was in net.
    const withGoalie = options.withGoalie ?? true;
    const size = roles.length;
    const required = fixed.filter(Boolean);
    const minGames = Math.max(0, Math.floor(options.minGames ?? 0));
    // One group per skater set AND goalie: each card is a whole unit.
    const groups = new Map<string, { ids: string[]; goalie: string | null; games: ConnectionGame[] }>();
    const add = (ids: string[], game: ConnectionGame) => {
      if (!required.every(id => ids.includes(id))) return;
      const sorted = [...ids].sort(lexical), key = withGoalie ? `${sorted.join("|")}#${game.goalie ?? ""}` : sorted.join("|");
      const group = groups.get(key) ?? { ids: sorted, goalie: withGoalie ? game.goalie : null, games: [] };
      group.games.push(game);
      groups.set(key, group);
    };
    for (const game of this.games) {
      if (game.complete === false || (withGoalie && goalieId && game.goalie !== goalieId)) continue;
      // Guests are treated like AI: an open spot, not part of our line.
      const skaters = [...new Set(game.skaters)].filter(id => this.players.get(id)?.member);
      if (withGoalie && goalieId && skaters.includes(goalieId)) continue;
      // With a goalie in net, one of our skaters plus the goalie is already a
      // unit (AI/guests filled the rest). Skaters only needs two skaters.
      const soloUnit = withGoalie && Boolean(game.goalie) && skaters.length === 1;
      if (size === 2) {
        if (soloUnit) add(skaters, game);
        for (let i = 0; i < skaters.length; i++) for (let j = i + 1; j < skaters.length; j++) add([skaters[i], skaters[j]], game);
        continue;
      }
      const mode = connectionGameMode(game);
      if (mode !== (size === 3 ? "3s" : "6s") || (skaters.length < 2 && !soloUnit) || skaters.length > size) continue;
      add(skaters, game);
    }
    const lines: UsedLine[] = [];
    for (const group of groups.values()) {
      // "With goalie" lists whole units only: games with an AI or unrecorded
      // goalie are left out (they still count under skaters only).
      if (withGoalie && !group.goalie) continue;
      if (options.skaters !== undefined && group.ids.length !== options.skaters) continue;
      const slots = this.placeAsPlayed(roles, group.ids, group.games);
      const result = this.evaluate(slots.map((id, index) => ({ id, role: roles[index] })), withGoalie ? group.goalie : null, { exact: size !== 2 });
      if (!result) continue;
      const lineup = { ...record(group.games), dropInGames: this.dropIns(group.games) };
      if (lineup.games < minGames) continue;
      lines.push({ slots, goalie: group.goalie, result, lineup });
    }
    return lines.sort(compareSuggestions(options.sort ?? "connection")).slice(0, options.limit ?? 24);
  }

  /** Slot order that best matches the positions these players had in these games. */
  private placeAsPlayed(roles: readonly SlotRole[], ids: readonly string[], games: readonly ConnectionGame[]): string[] {
    if (roles.every(role => role === "any")) return roles.map((_, index) => ids[index] ?? "");
    const played = new Map<string, Record<Position, number>>();
    for (const game of games) for (const [id, position] of Object.entries(game.positions ?? {})) {
      if (!ids.includes(id)) continue;
      const counts = played.get(id) ?? emptyPositions();
      counts[position]++;
      played.set(id, counts);
    }
    const fit = (id: string, role: SlotRole) => {
      if (role === "any") return 1;
      const counts = played.get(id);
      const total = counts ? POSITIONS.reduce((sum, position) => sum + counts[position], 0) : 0;
      return total ? POSITIONS.reduce((sum, position) => sum + counts![position] * AFFINITY[role][position], 0) / total
        : this.familiarity(id, role, ids.length);
    };
    let best: string[] = roles.map((_, index) => ids[index] ?? ""), bestFit = -Infinity;
    const order: string[] = roles.map(() => "");
    const visit = (next: number) => {
      if (next === ids.length) {
        const total = order.reduce((sum, id, index) => sum + (id ? fit(id, roles[index]) : 0), 0);
        if (total > bestFit) { bestFit = total; best = [...order]; }
        return;
      }
      for (let index = 0; index < roles.length; index++) {
        if (order[index]) continue;
        order[index] = ids[next];
        visit(next + 1);
        order[index] = "";
      }
    };
    visit(0);
    return best;
  }
}

export interface LineIdeaOptions {
  minGames?: number;
  limit?: number;
  sort?: SuggestionSort;
  /** Exact number of our skaters per line (the rest AI). Omitted = any / fill every slot. */
  skaters?: number;
}

export type SuggestionSort =
  | "connection" | "wins" | "win-pct" | "games" | "goal-diff" | "goals-for" | "goals-against";

export const SUGGESTION_SORTS: readonly { value: SuggestionSort; label: string }[] = [
  { value: "connection", label: "Best connection" },
  { value: "wins", label: "Most wins together" },
  { value: "win-pct", label: "Best win %" },
  { value: "games", label: "Most games together" },
  { value: "goal-diff", label: "Best goal difference" },
  { value: "goals-for", label: "Most goals / game" },
  { value: "goals-against", label: "Fewest goals against / game" },
];

/** Higher is better. Record-based sorts return null for groups with no games together. */
function sortValue(result: ConnectionResult, sort: SuggestionSort, source: ConnectionRecord = result.unit): number | null {
  const { games, wins, draws, goalsFor, goalsAgainst } = source;
  if (sort === "connection") return result.score;
  if (sort === "games") return games;
  if (!games) return null;
  switch (sort) {
    case "wins": return wins;
    case "win-pct": return (wins + draws / 2) / games;
    case "goal-diff": return (goalsFor - goalsAgainst) / games;
    case "goals-for": return goalsFor / games;
    case "goals-against": return -goalsAgainst / games;
  }
}

export interface Suggestion {
  /** Player ID per slot, in slot order. */
  slots: string[];
  /** Goalie in net for this line; null = skaters only (or AI/unrecorded for used lines). */
  goalie: string | null;
  result: ConnectionResult;
}

/** Sort order shared by every idea list. Used lines rank by their exact-lineup
 * record; groups with no record sink below any that have one; ties fall back to
 * more games together, then connection. */
function compareSuggestions(sort: SuggestionSort) {
  const source = (line: Suggestion) => "lineup" in line ? (line as UsedLine).lineup : line.result.unit;
  return (a: Suggestion, b: Suggestion): number =>
    (sortValue(b.result, sort, source(b)) ?? -Infinity) - (sortValue(a.result, sort, source(a)) ?? -Infinity) ||
    source(b).games - source(a).games || b.result.score - a.result.score ||
    lexical(`${a.slots.join("|")}#${a.goalie ?? ""}`, `${b.slots.join("|")}#${b.goalie ?? ""}`);
}

export interface UsedLine extends Suggestion {
  /** Record in games with exactly this lineup (pair builder: games with both skaters). */
  lineup: ConnectionRecord;
}
