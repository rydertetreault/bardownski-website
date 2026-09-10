import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/cron/weekly-update/route";

async function test() {
  const previousSecret = process.env.CRON_SECRET;
  const previousLive = process.env.SEASON_LIVE;
  try {
    process.env.CRON_SECRET = "local-test-only";
    process.env.SEASON_LIVE = "true";
    for (const query of ["", "?reset=true", "?seed=true", "?type=milestone-recap"]) {
      const response = await GET(new NextRequest(`http://localhost/api/cron/weekly-update${query}`, {
        headers: { authorization: "Bearer local-test-only" },
      }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { skipped: true, reason: "weekly updates paused for offseason" });
    }
    assert.equal((await GET(new NextRequest("http://localhost/api/cron/weekly-update"))).status, 401);
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new NextRequest("http://localhost/api/cron/weekly-update", {headers:{authorization:"Bearer undefined"}}))).status, 401);
    console.log("Weekly job remains paused even with live season and manual overrides; auth enforced.");
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;
    if (previousLive === undefined) delete process.env.SEASON_LIVE; else process.env.SEASON_LIVE = previousLive;
  }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
