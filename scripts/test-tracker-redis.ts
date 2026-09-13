// Explicit opt-in real Redis protocol check. Uses ONLY random diagnostic keys,
// never the live NHL27 or legacy archive keys, and deletes its own keys afterward.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Redis } from "@upstash/redis";
import { readFileSync } from "node:fs";
import { COMMIT_SNAPSHOT, RELEASE_LEASE } from "../src/lib/hockey-tracker";
import { parseNhl27Snapshot } from "../src/lib/nhl27-api";
loadEnvConfig(process.cwd());
async function main() {
  const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token) throw new Error("Redis credentials required");
  const redis=new Redis({url,token});const prefix=`hockey:tracker-protocol-test:${randomUUID()}`;
  const keys=[`${prefix}:snapshot`,`${prefix}:matches`,`${prefix}:meta`,`${prefix}:lock`];
  const owner=randomUUID();const payload=JSON.parse(readFileSync("tests/fixtures/nhl27-public.json","utf8"));
  const snapshot={...parseNhl27Snapshot(payload,"2026-09-13T07:00:00.000Z"),syncedAt:"2026-09-13T07:00:01.000Z"};
  snapshot.data.matches[0].players=[]; // Empty arrays MUST survive Redis cjson.
  const args=()=>[owner,JSON.stringify(snapshot),JSON.stringify({test:true}),JSON.stringify(Object.fromEntries(snapshot.data.matches.map(game=>[game.id,JSON.stringify(game)])))];
  try {
    await redis.set(keys[3],owner,{nx:true,ex:60});
    assert.equal(await redis.eval(COMMIT_SNAPSHOT,keys,args()),"saved");
    const stored=await redis.get<typeof snapshot>(keys[0]);
    assert.ok(Array.isArray(stored?.data.members));
    const match=await redis.hget<{players:unknown[]}>(keys[1],snapshot.data.matches[0].id);
    assert.deepEqual(match?.players,[]);
    assert.equal(await redis.eval(COMMIT_SNAPSHOT,keys,args()),"older-fetch");
    const before=await redis.hlen(keys[1]);
    snapshot.fetchedAt="2026-09-13T07:05:00.000Z";snapshot.data.clubStats.totalGames=1;
    assert.equal(await redis.eval(COMMIT_SNAPSHOT,keys,args()),"record-decreased");
    assert.equal(await redis.hlen(keys[1]),before);
    assert.equal(await redis.eval(RELEASE_LEASE,[keys[3]],["wrong-owner"]),0);
    assert.equal(await redis.eval(COMMIT_SNAPSHOT,keys,["wrong-owner",...args().slice(1)]),"lease-lost");
    // Malformed later stored match must cause ZERO earlier match writes.
    snapshot.data.clubStats.totalGames=10;
    await redis.hset(keys[1],{[snapshot.data.matches[1].id]:"bad-json"});
    snapshot.data.matches[0].opponent="MUST NOT BE WRITTEN";
    await assert.rejects(()=>redis.eval(COMMIT_SNAPSHOT,keys,args()));
    const unchanged=await redis.hget<{opponent:string}>(keys[1],snapshot.data.matches[0].id);
    assert.notEqual(unchanged?.opponent,"MUST NOT BE WRITTEN");
    console.log("Real Redis protocol passed: array preservation, replay, lease ownership, record regression, preflight-before-write. Isolated diagnostic keys only.");
  } finally { await redis.del(...keys); }
}
main().catch(()=>{console.error("Isolated Redis protocol test failed (details suppressed)");process.exitCode=1;});
