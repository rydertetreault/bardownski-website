import assert from "node:assert/strict";
import test from "node:test";
import {NextRequest} from "next/server";
import {GET as sync} from "../src/app/api/cron/sync-matches/route";
import {POST as reset} from "../src/app/api/admin/reset-match-history/route";
import {POST as repair} from "../src/app/api/admin/clear-recent-forfeits/route";

test("tracker authentication fails closed and legacy destructive operations stay retired",async()=>{
  const previous=process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    for(const handler of [sync,reset,repair]){
      assert.equal((await handler(new NextRequest("http://localhost/test",{headers:{authorization:"Bearer undefined"}}))).status,401);
      assert.equal((await handler(new NextRequest("http://localhost/test"))).status,401);
    }
    process.env.CRON_SECRET="test-only-not-real";
    for(const handler of [reset,repair]){
      const result=await handler(new NextRequest("http://localhost/test",{method:"POST",headers:{authorization:"Bearer test-only-not-real"}}));
      assert.equal(result.status,410);
      assert.match((await result.json()).error,/archive is protected/);
    }
  } finally {
    if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;
  }
});
