import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path: string, modules: Record<string, unknown>) {
  // Transpiled module boundary; individual export behavior is asserted below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exports: Record<string, (...args: any[]) => any> = {};
  const js = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, URL, require: (name: string) => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; } });
  return exports;
}

test("detail lookup respects explicit seasons even with colliding IDs and preserves legacy fallback", async () => {
  let currentCalls = 0;
  let archiveCalls = 0;
  const { getMatchDetail } = load("src/lib/match-detail.ts", {
    "./chelstats-frozen": { FROZEN_CHELSTATS: {} },
    "./hockey-season": { getHockeySeason: async () => { currentCalls++; return { matches: [{ id: "collision", opponent: "Current" }] }; } },
    "./match-history": { getAllMatchesForRecords: async () => { archiveCalls++; return [{ id: "collision", opponent: "Archive" }, { id: "old", opponent: "Old" }]; } },
  });
  assert.equal((await getMatchDetail("collision", "2025-2026")).match.opponent, "Archive");
  assert.equal(currentCalls, 0, "Archive never contacts current-season source");
  assert.equal((await getMatchDetail("collision", "2026-2027")).match.opponent, "Current");
  assert.equal(archiveCalls, 1, "Explicit current never queries archive");
  assert.equal(await getMatchDetail("old", "2026-2027"), null);
  assert.equal(archiveCalls, 1);
  assert.equal((await getMatchDetail("collision")).season, "2026-2027");
  const old = await getMatchDetail("old");
  assert.equal(old.season, "2025-2026");
  assert.equal(old.match.status, "final");
  assert.equal(await getMatchDetail("missing", "2025-2026"), null);
});

test("report API validates seasons, preserves IDs and returns safe failures", async () => {
  let called = false;
  let mode: "ok" | "missing" | "error" = "ok";
  const { GET } = load("src/app/api/matches/[id]/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) => Response.json(body, options) } },
    "@/lib/match-detail": { getMatchDetail: async (id: string, season: string) => {
      called = true;
      if (mode === "error") throw new Error("Private internal diagnostic");
      return mode === "missing" ? null : { match: { id }, season };
    } },
  });
  const params = { params: Promise.resolve({ id: "slash /?" }) };
  for (const query of ["", "?season=wrong", "?season="]) {
    const response = await GET(new Request(`http://localhost/api/matches/id${query}`), params);
    assert.equal(response.status, 400);
    assert.equal(called, false);
  }
  const request = new Request("http://localhost/api/matches/id?season=2026-2027");
  const success = await GET(request, params);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await success.json(), { match: { id: "slash /?" }, season: "2026-2027" });
  mode = "missing";
  assert.equal((await GET(request, params)).status, 404);
  mode = "error";
  const failure = await GET(request, params);
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /Private internal diagnostic/);
});
