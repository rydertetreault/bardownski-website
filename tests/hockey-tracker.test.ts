import assert from "node:assert/strict";
import test from "node:test";
import { COMMIT_SNAPSHOT, RELEASE_LEASE, refreshHockeyTracker, type TrackerStore, type StoredSnapshot } from "../src/lib/hockey-tracker";
import { NHL27_IDENTITY, parseNhl27Snapshot } from "../src/lib/nhl27-api";
import { getClubCrestUrl } from "../src/lib/club-crest";
import { readFileSync } from "node:fs";

// The fake models only this tiny storage boundary; a real Redis repeat-run and
// isolated-namespace Lua test are additionally run during activation.
class MemoryStore implements TrackerStore {
  snapshot: StoredSnapshot | null = null;
  matches: Record<string, unknown> = {};
  owner: string | null = null;
  commits = 0;
  calls: string[] = [];
  failCommit = false;
  async get<T>(key: string): Promise<T | null> { this.calls.push(key); return this.snapshot as T; }
  async hgetall<T>(key: string): Promise<T | null> { this.calls.push(key); return this.matches as T; }
  async set(key: string, owner: string): Promise<unknown> { this.calls.push(key); if(this.owner) return null; this.owner=owner;return "OK"; }
  async eval(script: string, keys: string[], args: (string|number)[]): Promise<unknown> {
    this.calls.push(...keys);
    if (script===RELEASE_LEASE) { if(this.owner===args[0])this.owner=null;return 1; }
    assert.equal(script,COMMIT_SNAPSHOT);
    if(this.failCommit) throw new Error("simulated persistence failure");
    if(this.owner!==args[0])return "lease-lost";
    const incoming=JSON.parse(String(args[1])) as StoredSnapshot;
    if(this.snapshot && incoming.fetchedAt<=this.snapshot.fetchedAt)return "older-fetch";
    if(this.snapshot && incoming.data.clubStats.totalGames<this.snapshot.data.clubStats.totalGames)return "record-decreased";
    const encodedGames=JSON.parse(String(args[3])) as Record<string, string>;
    for(const match of incoming.data.matches) {
      assert.deepEqual(JSON.parse(encodedGames[match.id]),match);
      this.matches[match.id]=encodedGames[match.id];
    }
    incoming.data.matches=[];this.snapshot=incoming;this.commits++;return "saved";
  }
}
// Adapter fixture is deliberately public source data, never environment-backed.
function snapshot(time = "2026-09-13T07:00:00.000Z") {
  const fixture = JSON.parse(readFileSync("tests/fixtures/nhl27-public.json", "utf8"));
  return parseNhl27Snapshot(fixture,time);
}

test("new namespace commits once, retains full history beyond recent window, and never touches legacy keys",async()=>{
  const store=new MemoryStore();const first=snapshot();
  let now=Date.parse(first.fetchedAt);const fetchSnapshot=async()=>first;
  const result=await refreshHockeyTracker({store,fetchSnapshot,now:()=>now});
  assert.equal(result.status,"connected");assert.equal(result.synced,true);
  assert.equal(result.matches.length,first.data.matches.length);
  now+=1000;
  const cached=await refreshHockeyTracker({store,fetchSnapshot:async()=>{throw Error("must not fetch")},now:()=>now});
  assert.equal(cached.status,"connected");assert.equal(store.commits,1);
  const next=snapshot(new Date(now+300000).toISOString()); next.data.matches=[];
  await refreshHockeyTracker({store,force:true,fetchSnapshot:async()=>next,now:()=>now+300000});
  assert.equal(Object.keys(store.matches).length,first.data.matches.length);
  assert.ok(store.calls.every(key=>key.startsWith(NHL27_IDENTITY.storageKey+":")));
  assert.equal(store.owner,null);
});

test("no archive fallback on missing storage, source failure or persistence failure",async()=>{
  assert.equal((await refreshHockeyTracker({store:null})).status,"unavailable");
  const store=new MemoryStore();
  assert.equal((await refreshHockeyTracker({store,fetchSnapshot:async()=>{throw Error("unavailable")}})).snapshot,null);
  store.failCommit=true;
  const result=await refreshHockeyTracker({store,fetchSnapshot:async()=>snapshot()});
  assert.equal(result.status,"unavailable");assert.equal(store.commits,0);assert.equal(store.owner,null);
});

test("failed refresh returns stale current data; decreases and older fetches never reset history",async()=>{
  const store=new MemoryStore();const first=snapshot();const now=Date.parse(first.fetchedAt);
  await refreshHockeyTracker({store,fetchSnapshot:async()=>first,now:()=>now});
  const stale=await refreshHockeyTracker({store,force:true,fetchSnapshot:async()=>{throw Error()},now:()=>now+3600000});
  assert.equal(stale.status,"stale");assert.equal(stale.snapshot?.identity.gameTitle,"NHL27");
  const decreased=snapshot(new Date(now+3600000).toISOString()); decreased.data.clubStats.totalGames=0;
  const declined=await refreshHockeyTracker({store,force:true,fetchSnapshot:async()=>decreased,now:()=>now+3600000});
  assert.equal(declined.status,"stale");assert.match(declined.error!,/decreased/);
  assert.equal(store.snapshot?.data.clubStats.totalGames,first.data.clubStats.totalGames);
  await refreshHockeyTracker({store,force:true,fetchSnapshot:async()=>snapshot(new Date(now-1000).toISOString()),now:()=>now});
  assert.equal(store.commits,1);
});

test("lease contention and identity mismatch cannot commit",async()=>{
  const store=new MemoryStore();store.owner="another-worker";
  const result=await refreshHockeyTracker({store,fetchSnapshot:async()=>{throw Error("must not call")}});
  assert.equal(result.synced,false);assert.equal(store.owner,"another-worker");store.owner=null;
  const invalid=snapshot();invalid.identity={...invalid.identity,clubId:"149602"} as unknown as typeof NHL27_IDENTITY;
  assert.equal((await refreshHockeyTracker({store,fetchSnapshot:async()=>invalid})).status,"unavailable");
  assert.equal(store.commits,0);
  assert.deepEqual(Object.keys(store.matches),[]);
});

test("whole-match JSON persistence retains optional crest metadata through save, cached read and window rotation",async()=>{
  const store=new MemoryStore(), first=snapshot();
  first.data.matches[1].opponentCrest={crestAssetId:"3",useBaseAsset:false};
  delete first.data.matches[2].opponentCrest;
  const before=JSON.stringify(first), now=Date.parse(first.fetchedAt);
  const saved=await refreshHockeyTracker({store,fetchSnapshot:async()=>first,now:()=>now});
  assert.equal(saved.status,"connected");assert.equal(saved.synced,true);
  assert.deepEqual(saved.matches,first.data.matches);
  assert.deepEqual(saved.snapshot?.data.matches,first.data.matches);
  for(const match of first.data.matches) {
    assert.equal(typeof store.matches[match.id],"string","exercise the exact encoded match sent to storage");
    const persisted=JSON.parse(store.matches[match.id] as string);
    assert.equal(persisted.opponentClubId,match.opponentClubId);
    assert.deepEqual(persisted.opponentCrest,match.opponentCrest);
  }
  const noFetch=async()=>{throw Error("cached/history reads must not fetch or backfill crests")};
  const cached=await refreshHockeyTracker({store,fetchSnapshot:noFetch,now:()=>now+1000});
  assert.equal(cached.synced,false);assert.equal(store.commits,1);
  assert.deepEqual(cached.matches,first.data.matches);
  assert.equal(getClubCrestUrl(cached.matches[0].opponentCrest),"https://chelstats.app/api/crest/111?base=1");
  assert.equal(getClubCrestUrl(cached.matches[1].opponentCrest),"https://chelstats.app/api/crest/3");
  assert.equal(getClubCrestUrl(cached.matches[2].opponentCrest),null);
  const next=snapshot(new Date(now+300000).toISOString());next.data.matches=[];
  const rotated=await refreshHockeyTracker({store,force:true,fetchSnapshot:async()=>next,now:()=>now+300000});
  assert.deepEqual(rotated.matches,first.data.matches);
  assert.equal(JSON.stringify(first),before,"persistence must not mutate source metadata");
});

test("pre-crest stored matches remain readable in JSON and decoded forms without invented metadata",async()=>{
  const store=new MemoryStore(), old=snapshot(), now=Date.parse(old.fetchedAt);
  for(const match of old.data.matches) {
    delete match.opponentCrest;
    delete match.opponentClubId;
  }
  await refreshHockeyTracker({store,fetchSnapshot:async()=>old,now:()=>now});
  const decodedId=old.data.matches[0].id;
  store.matches[decodedId]=JSON.parse(store.matches[decodedId] as string);
  const before=JSON.stringify(store.matches);
  const result=await refreshHockeyTracker({store,fetchSnapshot:async()=>{throw Error("no backfill")},now:()=>now+1000});
  assert.equal(result.status,"connected");assert.equal(result.synced,false);
  assert.deepEqual(result.matches,old.data.matches);
  assert.deepEqual(result.snapshot?.data.matches,old.data.matches);
  for(const match of result.matches) {
    assert.equal(Object.hasOwn(match,"opponentCrest"),false);
    assert.equal(Object.hasOwn(match,"opponentClubId"),false);
    assert.equal(getClubCrestUrl(match.opponentCrest),null);
  }
  assert.equal(store.commits,1);
  assert.equal(JSON.stringify(store.matches),before);
});
