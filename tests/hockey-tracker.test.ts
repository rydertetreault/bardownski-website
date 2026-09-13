import assert from "node:assert/strict";
import test from "node:test";
import { COMMIT_SNAPSHOT, RELEASE_LEASE, refreshHockeyTracker, type TrackerStore, type StoredSnapshot } from "../src/lib/hockey-tracker";
import { NHL27_IDENTITY, parseNhl27Snapshot } from "../src/lib/nhl27-api";
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
    for(const match of incoming.data.matches)this.matches[match.id]=match;
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
