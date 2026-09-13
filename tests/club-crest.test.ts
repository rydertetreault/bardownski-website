import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getClubCrestUrl, parseClubCrest, type ClubCrest } from "../src/lib/club-crest";
import { fetchLiveChelstatsData, type ClubMatch } from "../src/lib/chelstats";
import type { Match } from "../src/types";

// Runtime data can bypass TypeScript (e.g. records written before validation).
const urlFor = (value: unknown) => getClubCrestUrl(value as ClubCrest | undefined);

const invalidIds: unknown[] = [
  undefined, null, "", " ", "111 ", " 111", "111\n", "111\r", "111\t", "111\0",
  -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1,
  "9007199254740992", "999999999999999999999999", "-1", "+1", "1.5", "1.0", "1e2", "0x10",
  "NaN", "Infinity", "１１１", "١١١", true, false, [], [111], {}, { toString: () => "111" },
  "../111", "111/../../other", "/111", "111?base=1", "111#fragment", "111&base=1",
  "https://evil.example/111", "//evil.example/111", "111%2f..", "111\\..", '<img src="111">',
];

test("raw crest IDs accept only safe nonnegative integers and canonicalize digit strings", () => {
  for (const [value, expected] of [
    [111, "111"], ["111", "111"], [0, "0"], [-0, "0"], ["0", "0"], ["000", "0"], ["00111", "111"],
    [Number.MAX_SAFE_INTEGER, "9007199254740991"], ["9007199254740991", "9007199254740991"],
  ] as const) {
    assert.deepEqual(parseClubCrest({ crestAssetId: value }), { crestAssetId: expected, useBaseAsset: false });
  }
  for (const crestAssetId of invalidIds) {
    assert.equal(parseClubCrest({ crestAssetId, useBaseAsset: "1" }), undefined);
  }
});

test("raw base flags follow the resolver rather than JavaScript string truthiness", () => {
  for (const flag of [true, 1, "1"]) {
    const crest = parseClubCrest({ crestAssetId: "111", useBaseAsset: flag });
    assert.deepEqual(crest, { crestAssetId: "111", useBaseAsset: true });
    assert.equal(getClubCrestUrl(crest), "https://chelstats.app/api/crest/111?base=1");
  }
  for (const flag of [false, 0, "0", undefined]) {
    const crest = parseClubCrest({ crestAssetId: "111", useBaseAsset: flag });
    assert.deepEqual(crest, { crestAssetId: "111", useBaseAsset: false });
    assert.equal(getClubCrestUrl(crest), "https://chelstats.app/api/crest/111");
  }
  assert.equal(getClubCrestUrl(parseClubCrest({ crestAssetId: 0 })), "https://chelstats.app/api/crest/0");
  for (const flag of [null, "", "true", "false", "01", "00", "1 ", "0\n", 2, -1, NaN, Infinity, [], {}]) {
    assert.equal(parseClubCrest({ crestAssetId: "111", useBaseAsset: flag }), undefined);
  }
});

test("missing/malformed kits have no crest and raw metadata is never changed or retained by reference", () => {
  for (const value of [undefined, null, false, 111, "111", [], [{ crestAssetId: 111 }], {}, { useBaseAsset: true }]) {
    assert.equal(parseClubCrest(value), undefined);
  }
  const source = Object.freeze({ crestAssetId: "00111", useBaseAsset: "0", isCustomTeam: "1", url: "https://evil.example/crest" });
  const before = JSON.stringify(source);
  const first = parseClubCrest(source)!;
  assert.deepEqual(first, { crestAssetId: "111", useBaseAsset: false });
  assert.equal(getClubCrestUrl(Object.freeze(first)), "https://chelstats.app/api/crest/111");
  assert.notEqual(parseClubCrest(source), first, "each parse returns independent normalized metadata");
  assert.equal(JSON.stringify(source), before);
});

test("URL helper rejects malformed normalized metadata and cannot use injected paths or URLs", () => {
  for (const value of [undefined, null, true, 111, "111", [], {}, { crestAssetId: "111" }]) {
    assert.equal(urlFor(value), null);
  }
  for (const crestAssetId of [...invalidIds, 111, 0, "00111", "00"]) {
    assert.equal(urlFor({ crestAssetId, useBaseAsset: true }), null);
  }
  for (const useBaseAsset of [undefined, null, 0, 1, "0", "1", "true", "false", [], {}]) {
    assert.equal(urlFor({ crestAssetId: "111", useBaseAsset }), null);
  }
  const persisted = JSON.parse('{"crestAssetId":"111","useBaseAsset":false,"url":"https://evil.example/logo","path":"../logo"}');
  assert.equal(urlFor(persisted), "https://chelstats.app/api/crest/111");
  assert.equal(getClubCrestUrl({ crestAssetId: "9007199254740991", useBaseAsset: true }), "https://chelstats.app/api/crest/9007199254740991?base=1");
});

test("archive matches remain compatible without invented crest metadata or backfill", () => {
  const text = readFileSync(new URL("../src/lib/archives/nhl26-match-history.json", import.meta.url), "utf8");
  const archive = JSON.parse(text) as { matches: ClubMatch[] };
  assert.ok(archive.matches.length > 0);
  const before = JSON.stringify(archive);
  for (const saved of archive.matches) {
    const match: Match = { ...saved, status: "final" };
    assert.equal(match.opponentCrest, undefined);
    assert.equal(match.opponentClubId, undefined);
    assert.equal(getClubCrestUrl(match.opponentCrest), null);
  }
  assert.equal(JSON.stringify(archive), before);
});

test("legacy transform preserves only available opponent metadata with no crest fetch/backfill", async t => {
  const payload = JSON.parse(readFileSync(new URL("./fixtures/nhl27-public.json", import.meta.url), "utf8"));
  // Adapt a private copy to the retired club identity, never the public fixture.
  const game = payload.recentGames.RegularSeason[0];
  const ours = game.clubs["29202"], opponent = game.clubs[ours.opponentClubId];
  game.clubs = { "149602": ours, "16793": opponent };
  game.players = {};
  payload.recentGames = { RegularSeason: [game] };
  const fetchMock = t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => payload }));
  for (const [customKit, expected] of [
    [{ crestAssetId: "00111", useBaseAsset: "0" }, { crestAssetId: "111", useBaseAsset: false }],
    [{ crestAssetId: 111, useBaseAsset: true }, { crestAssetId: "111", useBaseAsset: true }],
    [undefined, undefined],
    [{ crestAssetId: "../111" }, undefined],
    [{ crestAssetId: "111", useBaseAsset: "false" }, undefined],
  ] as const) {
    opponent.details.customKit = customKit;
    const before = JSON.stringify(payload);
    const data = await fetchLiveChelstatsData();
    assert.equal(data?.matches.length, 1);
    assert.equal(data?.matches[0].opponentClubId, "16793");
    assert.deepEqual(data?.matches[0].opponentCrest, expected);
    assert.equal(JSON.stringify(payload), before);
  }
  assert.equal(fetchMock.mock.callCount(), 5, "only the existing stats request, all calls mocked locally");
});
