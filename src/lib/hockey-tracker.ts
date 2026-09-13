import { Redis } from "@upstash/redis";
import { calculateHockeyAwards, type HockeyAwards } from "./hockey-awards";
import { randomUUID } from "node:crypto";
import { fetchNhl27Snapshot, NHL27_IDENTITY, type Nhl27Snapshot } from "./nhl27-api";
import type { ChelstatsData, ClubMatch } from "./chelstats";

export const TRACKER_PREFIX = "hockey:nhl27:2026-2027:common-gen5:29202";
export const TRACKER_KEYS = {
  snapshot: `${TRACKER_PREFIX}:snapshot`, matches: `${TRACKER_PREFIX}:matches`,
  meta: `${TRACKER_PREFIX}:meta`, lock: `${TRACKER_PREFIX}:sync-lock`,
} as const;
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
export const STALE_AFTER_MS = 15 * 60 * 1000;
export type StoredSnapshot = Nhl27Snapshot & { syncedAt: string; awards?: HockeyAwards };
export type TrackerResult = {
  status: "connected" | "stale" | "unavailable";
  snapshot: StoredSnapshot | null;
  matches: ClubMatch[];
  synced: boolean;
  error?: string;
};
export interface TrackerStore {
  get<T>(key: string): Promise<T | null>;
  hgetall<T>(key: string): Promise<T | null>;
  set(key: string, value: string, options: {nx: true; ex: number}): Promise<unknown>;
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
}
export function getTrackerStore(): TrackerStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) as unknown as TrackerStore : null;
}

// One Redis operation commits matches, current totals and freshness together.
// Lease ownership prevents a delayed request from writing after lease expiry.
// Totals going backwards or a stale fetch cannot reset accumulated history.
export const COMMIT_SNAPSHOT = `
if redis.call('GET', KEYS[4]) ~= ARGV[1] then return 'lease-lost' end
local incoming = cjson.decode(ARGV[2])
local previousRaw = redis.call('GET', KEYS[1])
if previousRaw then
  local previous = cjson.decode(previousRaw)
  if previous.fetchedAt >= incoming.fetchedAt then return 'older-fetch' end
  if previous.data.clubStats.totalGames > incoming.data.clubStats.totalGames then return 'record-decreased' end
end
-- Redis Lua is isolated, not rollback-transactional: finish every potentially
-- failing decode/type check/encoding operation before the first mutation.
local matchType = redis.call('TYPE', KEYS[2]).ok
local metaType = redis.call('TYPE', KEYS[3]).ok
if matchType ~= 'none' and matchType ~= 'hash' then return 'invalid-storage' end
if metaType ~= 'none' and metaType ~= 'string' then return 'invalid-storage' end
local encodedGames = cjson.decode(ARGV[4])
local writes = {}
for _, game in ipairs(incoming.data.matches) do
  local oldRaw = redis.call('HGET', KEYS[2], game.id)
  local accept = true
  if oldRaw then
    local old = cjson.decode(oldRaw)
    if #(old.players or {}) > #(game.players or {}) then accept = false end
  end
  if type(encodedGames[game.id]) ~= 'string' then return 'invalid-encoding' end
  if accept then table.insert(writes, {game.id, encodedGames[game.id]}) end
end
-- Preserve original JSON arrays. Redis cjson encodes empty [] as {}, so never
-- re-encode snapshot/member arrays through Lua. Read path replaces matches from hash.
cjson.decode(ARGV[3])
for _, entry in ipairs(writes) do redis.call('HSET', KEYS[2], entry[1], entry[2]) end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[3], ARGV[3])
return 'saved'
`;
export const RELEASE_LEASE = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;

function isIdentity(value: StoredSnapshot): boolean {
  return value?.identity?.clubId === NHL27_IDENTITY.clubId && value.identity.gameTitle === NHL27_IDENTITY.gameTitle && value.identity.platform === NHL27_IDENTITY.platform && value.identity.season === NHL27_IDENTITY.season;
}
async function readStored(store: TrackerStore): Promise<{snapshot: StoredSnapshot | null; matches: ClubMatch[]}> {
  const [snapshot, raw] = await Promise.all([
    store.get<StoredSnapshot>(TRACKER_KEYS.snapshot),
    store.hgetall<Record<string, ClubMatch>>(TRACKER_KEYS.matches),
  ]);
  if (snapshot && (!isIdentity(snapshot) || !Array.isArray(snapshot.data?.members) ||
    !Number.isFinite(Date.parse(snapshot.fetchedAt)) || !Number.isFinite(Date.parse(snapshot.syncedAt)) ||
    !Number.isFinite(snapshot.data?.clubStats?.totalGames))) throw new Error("Stored tracker shape/identity is invalid");
  const matches = Object.values(raw ?? {}).map(value => typeof value === "string" ? JSON.parse(value) as ClubMatch : value)
    .filter(match => match && typeof match.id === "string" && Number.isFinite(match.timestamp) && Array.isArray(match.players))
    .sort((a,b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  return { snapshot: snapshot ? {...snapshot, data: {...snapshot.data, matches}} : null, matches };
}
function state(snapshot: StoredSnapshot | null, matches: ClubMatch[], now: number, synced: boolean, error?: string): TrackerResult {
  const stale = !snapshot || now - Date.parse(snapshot.fetchedAt) > STALE_AFTER_MS;
  return {status: snapshot ? (error || stale ? "stale" : "connected") : "unavailable", snapshot, matches, synced, ...(error ? {error} : {})};
}

/** A single season-specific pipeline for pages, cron and an independent worker.
 * No import of match-history, no archive keys, no synthetic missing matches. */
export async function refreshHockeyTracker(options: {
  force?: boolean; store?: TrackerStore | null; fetchSnapshot?: () => Promise<Nhl27Snapshot>; now?: () => number;
} = {}): Promise<TrackerResult> {
  const store = options.store === undefined ? getTrackerStore() : options.store;
  const now = options.now ?? Date.now;
  if (!store) return state(null, [], now(), false, "Persistent tracking storage is not configured.");
  let previous: {snapshot: StoredSnapshot | null; matches: ClubMatch[]};
  try { previous = await readStored(store); }
  catch { return state(null, [], now(), false, "Tracking storage is temporarily unavailable."); }
  if (!options.force && previous.snapshot?.awards && now() - Date.parse(previous.snapshot.fetchedAt) < SYNC_INTERVAL_MS) return state(previous.snapshot, previous.matches, now(), false);
  const owner = randomUUID();
  let leased = false;
  try {
    leased = Boolean(await store.set(TRACKER_KEYS.lock, owner, {nx: true, ex: 60}));
    if (!leased) return state(previous.snapshot, previous.matches, now(), false, previous.snapshot ? undefined : "The first sync is in progress. Please refresh shortly.");
    previous = await readStored(store);
    const incoming = await (options.fetchSnapshot ?? fetchNhl27Snapshot)();
    if (!isIdentity(incoming as StoredSnapshot)) throw new Error("Source identity mismatch");
    // Calculate against the same whole-match merge the commit accepts. The
    // lease keeps writers serialized; this snapshot persists the award audit.
    const merged = new Map(previous.matches.map(game => [game.id, game]));
    for (const game of incoming.data.matches) {
      const old = merged.get(game.id);
      if (!old || old.players.length <= game.players.length) merged.set(game.id, game);
    }
    const awardData = {...incoming.data, matches:[...merged.values()]};
    const snapshot: StoredSnapshot = {...incoming, syncedAt: new Date(now()).toISOString(), awards:calculateHockeyAwards(awardData, new Date(now()).toISOString())};
    const meta = {schemaVersion:1, identity:NHL27_IDENTITY, lastSuccessfulSync:snapshot.syncedAt, feedCheckedAt:snapshot.fetchedAt, apiMatches:incoming.data.matches.length, totalGames:incoming.data.clubStats.totalGames};
    const result = await store.eval(COMMIT_SNAPSHOT, Object.values(TRACKER_KEYS), [owner, JSON.stringify(snapshot), JSON.stringify(meta), JSON.stringify(Object.fromEntries(incoming.data.matches.map(game => [game.id, JSON.stringify(game)])))]);
    const saved = await readStored(store);
    if (result === "saved" || result === "older-fetch") return state(saved.snapshot, saved.matches, now(), result === "saved");
    return state(saved.snapshot, saved.matches, now(), false, result === "record-decreased" ? "Upstream totals decreased; the last verified snapshot and saved games were preserved." : "Sync lease expired; the last saved data was preserved.");
  } catch {
    // Never replace current data with frozen NHL26 totals or zero-filled errors.
    return state(previous.snapshot, previous.matches, now(), false, "The latest sync could not be verified or saved. Showing the last successfully saved current-season data, if available.");
  } finally {
    if (leased) { try { await store.eval(RELEASE_LEASE, [TRACKER_KEYS.lock], [owner]); } catch { /* Lease expires automatically. */ } }
  }
}

export function trackerData(result: TrackerResult): ChelstatsData | null { return result.snapshot?.data ?? null; }
