import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getClubCrestUrl } from "../src/lib/club-crest";
import {
  fetchNhl27Snapshot, NHL27_IDENTITY, NHL27_STATS_URL, parseNhl27Snapshot, resolveNhl27Name,
  type Nhl27MatchPlayerStat,
} from "../src/lib/nhl27-api";

const fixtureText = readFileSync(new URL("./fixtures/nhl27-public.json", import.meta.url), "utf8");
const fixture = () => JSON.parse(fixtureText);
const at = "2026-09-13T07:00:00.000Z";

function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
}

test("verified public snapshot: identity, 6-4-0, 10 GP, four members and five matches", () => {
  const payload = fixture();
  const before = JSON.stringify(payload);
  freeze(payload);
  const result = parseNhl27Snapshot(payload, at);
  assert.deepEqual(result.identity, {
    gameTitle: "NHL27", clubId: "29202", platform: "common-gen5", season: "2026–2027",
    storageKey: "hockey:nhl27:2026-2027:common-gen5:29202",
  });
  assert.equal(result.identity, NHL27_IDENTITY);
  assert.ok(Object.isFrozen(NHL27_IDENTITY));
  assert.equal(result.fetchedAt, at);
  assert.deepEqual(result.data.clubStats, {
    record: "6-4-0", wins: 6, losses: 4, otl: 0, goals: 35, goalsAgainst: 24,
    goalsPerGame: 3.5, goalsAgainstPerGame: 2.4, totalGames: 10, seasons: 1,
    titlesWon: 1, currentDivision: 9, bestDivision: 10, starLevel: 2, overallRating: 75,
  });
  assert.equal(result.data.members.length, 4);
  assert.equal(result.data.matches.length, 5);
  assert.deepEqual(result.data.matches.map(m => m.id), payload.recentGames.RegularSeason.map((g: { matchId: string }) => g.matchId));
  assert.equal(JSON.stringify(payload), before, "parser must not mutate deeply frozen inputs");
  assert.deepEqual(parseNhl27Snapshot(payload), parseNhl27Snapshot(payload));
  assert.equal(parseNhl27Snapshot(payload).fetchedAt, payload.clubRanking.entry.updatedAt);
});

test("keeps actual goalie/LW positions and does not conflate skater GP with goalie GP", () => {
  const { members, matches } = parseNhl27Snapshot(fixture(), at).data;
  const ryder = members.find(m => m.username === "Rydayro")!;
  assert.equal(ryder.position, "G");
  assert.equal(ryder.gamesPlayed, 0);
  assert.equal(ryder.goalieGP, 1);
  assert.equal(ryder.goalieSaves, 13);
  assert.equal(ryder.savePct, 92);
  assert.equal(members.find(m => m.username === "Julio 3026")!.position, "LW");
  const goalie = matches[0].players.find(p => p.name === "RYDER")!;
  assert.equal(goalie.position, "goalie");
  assert.equal(goalie.isGoalie, true);
  assert.equal(goalie.savePct, 0.93, "raw fractional save percentage must stay fractional");
  assert.equal(matches[1].players.find(p => p.name === "JIMMY")!.position, "leftWing");
  const names = { Rydayro: "RYDER", S1obbyRobby: "ROB", Mhut8: "MATT", "u4 Pablo": "DYLAN", "oP wet": "COLIN", "u4 Hood": "KADEN", "Julio 3026": "JIMMY", "oP Ding1633": "LOGAN" };
  for (const [tag, name] of Object.entries(names)) assert.equal(resolveNhl27Name(tag), name);
  assert.equal(resolveNhl27Name("  MHUT8  "), "MATT");
  assert.equal(resolveNhl27Name("New Player"), "New Player");
  assert.equal(resolveNhl27Name("constructor"), "constructor");
});

test("every MatchPlayerStat field and source player ID survives conversion", () => {
  const payload = fixture();
  const rawGame = payload.recentGames.RegularSeason[0];
  const sourceId = "890884897";
  const raw = rawGame.players["29202"][sourceId];
  Object.assign(raw, {
    skgoals: "2", skassists: 3, skhits: "4", skshots: 5, skplusmin: "-6", skpim: 7,
    skbs: "8", sktakeaways: 9, skgiveaways: "10", skppg: 11, skshg: "12", skgwg: 13,
    glsaves: "14", glshots: 15, glga: "1", glsavepct: "0.933", glsoperiods: 2,
  });
  const converted = parseNhl27Snapshot(payload, at).data.matches[0].players as Nhl27MatchPlayerStat[];
  assert.deepEqual(converted.find(p => p.playerId === sourceId), {
    playerId: sourceId, name: "MATT", position: "center", goals: 2, assists: 3, hits: 4,
    shots: 5, plusMinus: -6, pim: 7, blockedShots: 8, takeaways: 9, giveaways: 10,
    powerPlayGoals: 11, shortHandedGoals: 12, gameWinningGoal: 13, saves: 14,
    shotsAgainst: 15, goalsAgainst: 1, savePct: 0.933, shutoutPeriods: 2,
    isGoalie: false, isOurPlayer: true,
  });
  assert.ok(converted.some(p => p.playerId === "1006349077235"));
});

test("rejects mismatched/missing identity, frozen-shaped data and upstream Error payloads", () => {
  for (const value of [null, [], "Error", {}, { clubStats: {}, members: [], matches: [] }]) {
    assert.throws(() => parseNhl27Snapshot(value, at), /NHL27 snapshot/);
  }
  for (const [parent, key, bad] of [
    ["teamData", "clubId", "149602"], ["teamData", "name", "Bardownskii"],
    ["teamData", "platform", "common-gen4"], ["teamData", "clubId", null],
    ["team_stats", "clubId", "149602"],
  ] as const) {
    const p = fixture(); p[parent][key] = bad;
    assert.throws(() => parseNhl27Snapshot(p, at), /identity|source ID|nonempty/);
  }
  for (const bad of ["NHL26", "nhl27", null, undefined]) {
    const p = fixture(); p.clubRanking.entry.gameTitle = bad;
    assert.throws(() => parseNhl27Snapshot(p, at), /clubRanking.entry.gameTitle/);
  }
  for (const key of ["clubId", "name", "platform"]) {
    const p = fixture(); p.clubRanking.entry[key] = "wrong";
    assert.throws(() => parseNhl27Snapshot(p, at), /clubRanking.entry/);
  }
  const p = fixture(); p.teamData.clubId = 29202; p.clubRanking.entry.clubId = 29202;
  assert.equal(parseNhl27Snapshot(p, at).identity.clubId, "29202");
});

test("identity metadata fails closed for every absent/null container and field", () => {
  for (const missing of [undefined, null]) {
    for (const key of ["teamData", "clubRanking"]) {
      const p = fixture(); p[key] = missing;
      assert.throws(() => parseNhl27Snapshot(p, at), new RegExp(key));
    }
    const noEntry = fixture(); noEntry.clubRanking.entry = missing;
    assert.throws(() => parseNhl27Snapshot(noEntry, at), /clubRanking.entry/);
    for (const key of ["clubId", "name", "platform"]) {
      const p = fixture(); p.teamData[key] = missing;
      assert.throws(() => parseNhl27Snapshot(p, at), new RegExp(`teamData.${key}`));
    }
    for (const key of ["clubId", "name", "platform", "gameTitle"]) {
      const p = fixture(); p.clubRanking.entry[key] = missing;
      assert.throws(() => parseNhl27Snapshot(p, at), new RegExp(`clubRanking.entry.${key}`));
    }
  }
  const unboundTitle = fixture(); unboundTitle.clubRanking.entry = { gameTitle: "NHL27" };
  assert.throws(() => parseNhl27Snapshot(unboundTitle, at), /clubRanking.entry.clubId/);
});

test("core club/member values fail closed: missing/null is never zero; valid numeric zeros work", () => {
  for (const key of ["wins", "losses", "otl", "goals", "goalsAgainst", "totalGames"]) {
    for (const bad of [undefined, null, "", " ", "6cats", "0x10", "1e2", true, [], {}, -1, Infinity, NaN, 1.5]) {
      const p = fixture(); p.team_stats[key] = bad;
      assert.throws(() => parseNhl27Snapshot(p, at), /team_stats/);
    }
  }
  for (const bad of [undefined, null, {}, [], "Error", [null]]) {
    const p = fixture(); p.memberData = bad;
    assert.throws(() => parseNhl27Snapshot(p, at), /memberData/);
  }
  for (const key of ["Games Played", "Goals", "Assists", "Points", "+/-", "Hits", "Shots", "Shot %", "PIM", "GWGs", "Win %", "Takeaways", "Giveaways", "Goalie games played", "Goalie wins", "Goalie losses", "Goalie OTLs", "Goalie saves", "Goalie shots", "Save %", "GAA", "Shutouts"]) {
    for (const bad of [null, undefined, "", "0 goals", false]) {
      const p = fixture(); p.memberData[0][key] = bad;
      assert.throws(() => parseNhl27Snapshot(p, at), /memberData/);
    }
  }
  const zeros = fixture();
  for (const key of ["wins", "losses", "otl", "goals", "goalsAgainst", "totalGames"]) zeros.team_stats[key] = 0;
  zeros.team_stats.record = "0-0-0";
  zeros.team_stats.goals_per_game = "0.00";
  zeros.team_stats.goalsAgainst_per_game = 0;
  zeros.memberData = []; zeros.recentGames = {};
  assert.equal(parseNhl27Snapshot(zeros, at).data.clubStats.totalGames, 0);
  const numbers = fixture();
  for (const r of [numbers.team_stats, ...numbers.memberData]) {
    for (const key of Object.keys(r)) if (typeof r[key] === "string" && /^-?\d+(\.\d+)?$/.test(r[key])) r[key] = Number(r[key]);
  }
  assert.equal(parseNhl27Snapshot(numbers, at).data.members[3].gamesPlayed, 0);
});

test("rejects inconsistent records, impossible totals, duplicate members and malformed timestamps", () => {
  const changes = [
    (p: ReturnType<typeof fixture>) => { p.team_stats.record = "7-3-0"; },
    (p: ReturnType<typeof fixture>) => { p.team_stats.totalGames = 11; },
    (p: ReturnType<typeof fixture>) => { p.memberData[0].Points = 999; },
    (p: ReturnType<typeof fixture>) => { p.memberData[3]["Goalie saves"] = 999; },
    (p: ReturnType<typeof fixture>) => { p.memberData.push(p.memberData[0]); },
  ];
  for (const change of changes) {
    const p = fixture(); change(p);
    assert.throws(() => parseNhl27Snapshot(p, at), /NHL27 snapshot/);
  }
  for (const bad of ["", "not a date", "2026-99-99T00:00:00Z", "2026-02-30T00:00:00Z"]) {
    assert.throws(() => parseNhl27Snapshot(fixture(), bad), /fetchedAt/);
  }
});

test("non-core omissions get documented neutral defaults, or rates recovered from valid totals", () => {
  const p = fixture();
  for (const key of ["clubRating", "recentGames"]) delete p[key];
  for (const key of ["goals_per_game", "goalsAgainst_per_game", "seasons", "titlesWon", "currentDivision", "starLevel"]) delete p.team_stats[key];
  for (const m of p.memberData) {
    for (const key of ["overallRating", "PPG", "Interceptions", "Blocked shots", "FO %", "Pass %", "Shutout periods", "Goalie record"]) delete m[key];
  }
  const { clubStats, members, matches } = parseNhl27Snapshot(p, at).data;
  assert.equal(clubStats.goalsPerGame, 3.5);
  assert.equal(clubStats.goalsAgainstPerGame, 2.4);
  assert.equal(clubStats.overallRating, 0);
  assert.equal(members[1].ppg, 2.7);
  assert.equal(members[3].ppg, 0);
  assert.equal(members[3].goalieRecord, "1-0-0");
  assert.equal(members[0].playstyle, "");
  assert.equal(members[0].blockedShots, 0);
  assert.deepEqual(matches, []);
});

test("all recent groups sorted newest first; malformed supplied games/groups are rejected", () => {
  const p = fixture();
  const games = p.recentGames.RegularSeason;
  p.recentGames = { RegularSeason: [games[4]], ClubFinals: [games[0]], PrivateGames: [games[2]] };
  assert.deepEqual(parseNhl27Snapshot(p, at).data.matches.map(m => m.matchType), ["finals", "private", "regular"]);
  for (const bad of [{}, "Error", [null]]) {
    const q = fixture(); q.recentGames.ClubFinals = bad;
    assert.throws(() => parseNhl27Snapshot(q, at), /recentGames/);
  }
  for (const key of ["matchId", "timestamp", "clubs"]) {
    const q = fixture(); q.recentGames.RegularSeason[0][key] = null;
    assert.throws(() => parseNhl27Snapshot(q, at), /recentGames/);
  }
  for (const key of ["score", "opponentScore"]) {
    const q = fixture(); q.recentGames.RegularSeason[0].clubs["29202"][key] = null;
    assert.throws(() => parseNhl27Snapshot(q, at), /recentGames/);
  }
  const unrelated = fixture(); delete unrelated.recentGames.RegularSeason[0].clubs["29202"];
  assert.throws(() => parseNhl27Snapshot(unrelated, at), /clubs.29202/);
  const duplicate = fixture(); duplicate.recentGames.ClubFinals.push(duplicate.recentGames.RegularSeason[0]);
  assert.throws(() => parseNhl27Snapshot(duplicate, at), /duplicate match IDs/);
});

test("scores always come from own club; DNF uses a verified bit or explicit flag, not >=", () => {
  const p = fixture();
  const g = p.recentGames.RegularSeason[0], ours = g.clubs["29202"], opp = g.clubs[ours.opponentClubId];
  ours.score = "7"; ours.opponentScore = "1"; opp.score = "99";
  let m = parseNhl27Snapshot(p, at).data.matches[0];
  assert.equal(m.scoreUs, 7); assert.equal(m.scoreThem, 1); assert.equal(m.forfeit, true);
  ours.result = 32769; ours.winnerByDnf = 0; opp.result = 2;
  m = parseNhl27Snapshot(p, at).data.matches[0];
  assert.equal(m.forfeit, false, "a different higher flag is not the DNF flag");
  assert.equal(m.result, "32769");
  ours.result = 49153;
  assert.equal(parseNhl27Snapshot(p, at).data.matches[0].forfeit, true);
  ours.result = 2; opp.result = 16385;
  assert.equal(parseNhl27Snapshot(p, at).data.matches[0].forfeit, true, "opponent DNF win means our DNF loss");
  ours.result = 1; opp.result = 2; ours.winnerByDnf = 1;
  assert.equal(parseNhl27Snapshot(p, at).data.matches[0].forfeit, true);
});

test("match fractional save percentage accepts 0 and 1, rejects percent-unit or malformed input", () => {
  for (const value of [0, "0", 1, "1", 0.93]) {
    const p = fixture(); p.recentGames.RegularSeason[0].players["29202"]["1006349077235"].glsavepct = value;
    assert.equal(parseNhl27Snapshot(p, at).data.matches[0].players[0].savePct, Number(value));
  }
  for (const value of [93, "93", null, "NaN", -0.1]) {
    const p = fixture(); p.recentGames.RegularSeason[0].players["29202"]["1006349077235"].glsavepct = value;
    assert.throws(() => parseNhl27Snapshot(p, at), /glsavepct/);
  }
});

test("fetch uses exact public endpoint, GET/no-store, safe transport and current retrieval time", async t => {
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, NHL27_STATS_URL);
    assert.equal(url, "https://chelstats.app/api/clubs/stats?teamname=Bardownski&console=common-gen5&teamId=29202&strict=true");
    assert.equal(options.method, "GET"); assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit"); assert.equal(options.redirect, "error");
    signal = options.signal as AbortSignal;
    assert.equal(signal.aborted, false);
    return new Response(fixtureText, { status: 200 });
  });
  const before = Date.now();
  const result = await fetchNhl27Snapshot();
  assert.ok(Date.parse(result.fetchedAt) >= before && Date.parse(result.fetchedAt) <= Date.now());
  assert.equal(result.data.clubStats.totalGames, 10);
  assert.equal(signal?.aborted, false);
});

test("fetch safely rejects HTTP, invalid JSON, network and identity failures without fallback", async t => {
  for (const [response, expected] of [
    [new Response("sensitive upstream body", { status: 503 }), /HTTP 503/],
    [new Response("sensitive invalid JSON", { status: 200 }), /not valid JSON/],
    [new Response(JSON.stringify({ clubStats: {}, members: [] })), /teamData/],
  ] as const) {
    const mock = t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(fetchNhl27Snapshot(), expected);
    mock.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new Error("credential=secret"); });
  await assert.rejects(fetchNhl27Snapshot(), error => {
    assert.match(String(error), /network request unsuccessful/);
    assert.doesNotMatch(String(error), /credential|secret/);
    return true;
  });
});

test("20-second timeout aborts even a stalled body and clears timers on success/failure", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    signal = options.signal as AbortSignal;
    return { ok: true, json: () => new Promise(() => {}) };
  });
  const promise = fetchNhl27Snapshot();
  const rejected = assert.rejects(promise, /timed out after 20 seconds/);
  await Promise.resolve();
  t.mock.timers.tick(19_999);
  assert.equal(signal?.aborted, false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(signal?.aborted, true);
});


test("rejects contradictory nested club identities", () => {
  for (const mutate of [
    (p: ReturnType<typeof fixture>) => {p.teamData.clubInfo.clubId=149602;},
    (p: ReturnType<typeof fixture>) => {p.recentGames.RegularSeason[0].clubs["29202"].details.clubId=149602;},
    (p: ReturnType<typeof fixture>) => {p.recentGames.RegularSeason[0].clubs["16793"].opponentClubId="149602";},
  ]) {const value=fixture();mutate(value);assert.throws(()=>parseNhl27Snapshot(value,at));}
});

test("observed fixture crests belong to opponents, not our club's crest 102", () => {
  const payload = fixture();
  const before = JSON.stringify(payload);
  freeze(payload);
  const matches = parseNhl27Snapshot(payload, at).data.matches;
  assert.deepEqual(matches.map(m => [m.opponentClubId, m.opponentCrest]), [
    ["16793", { crestAssetId: "111", useBaseAsset: true }],
    ["196", { crestAssetId: "3", useBaseAsset: true }],
    ["11158", { crestAssetId: "1081", useBaseAsset: true }],
    ["26958", { crestAssetId: "206", useBaseAsset: true }],
    ["10131", { crestAssetId: "58", useBaseAsset: true }],
  ]);
  assert.deepEqual(matches.map(m => m.homeAway), ["away", "away", "home", "home", "home"]);
  assert.equal(getClubCrestUrl(matches[0].opponentCrest), "https://chelstats.app/api/crest/111?base=1");
  assert.equal(JSON.stringify(payload), before);
});

test("opponent selection follows the validated ID regardless of side, club ordering or own kit", () => {
  for (const teamSide of ["0", "1"]) {
    for (const useBaseAsset of ["0", "1"]) {
      const p = fixture(), g = p.recentGames.RegularSeason[0];
      const ours = g.clubs["29202"], opponent = g.clubs[ours.opponentClubId];
      const opponentPlayers = g.players[ours.opponentClubId];
      delete g.players[ours.opponentClubId];
      ours.opponentClubId = 98765;
      ours.teamSide = teamSide;
      ours.details.customKit = { crestAssetId: "999", useBaseAsset: "1" };
      opponent.details.clubId = 98765;
      opponent.details.customKit = { crestAssetId: "00111", useBaseAsset };
      g.clubs = { "29202": ours, "98765": opponent, "1": { details: { customKit: { crestAssetId: "222" } } } };
      g.players["98765"] = opponentPlayers;
      const match = parseNhl27Snapshot(p, at).data.matches[0];
      assert.equal(match.opponentClubId, "98765");
      assert.deepEqual(match.opponentCrest, { crestAssetId: "111", useBaseAsset: useBaseAsset === "1" });
      assert.equal(getClubCrestUrl(match.opponentCrest), `https://chelstats.app/api/crest/111${useBaseAsset === "1" ? "?base=1" : ""}`);
    }
  }
});

test("missing or malformed cosmetics drop only the crest, never valid matches or season stats", () => {
  const expected = parseNhl27Snapshot(fixture(), at);
  delete expected.data.matches[0].opponentCrest;
  for (const customKit of [
    undefined, null, false, "111", [], {}, { useBaseAsset: "1" },
    ...[undefined, null, "", "../111", "111?base=1", "111\n", -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, "9007199254740992", true, {}, []]
      .map(crestAssetId => ({ crestAssetId, useBaseAsset: "1" })),
    ...[null, "true", "false", "", "00", "01", 2, {}, []]
      .map(useBaseAsset => ({ crestAssetId: "111", useBaseAsset })),
  ]) {
    const p = fixture(), g = p.recentGames.RegularSeason[0];
    g.clubs[g.clubs["29202"].opponentClubId].details.customKit = customKit;
    const before = JSON.stringify(p);
    freeze(p);
    const result = parseNhl27Snapshot(p, at);
    assert.deepEqual(result, expected);
    assert.equal(Object.hasOwn(result.data.matches[0], "opponentCrest"), false);
    assert.equal(JSON.stringify(p), before);
  }
  const p = fixture();
  p.recentGames.RegularSeason[0].clubs["29202"].details.customKit = { crestAssetId: "invalid" };
  assert.equal(parseNhl27Snapshot(p, at).data.matches[0].opponentCrest?.crestAssetId, "111");
  delete p.recentGames.RegularSeason[0].clubs["16793"].details;
  const match = parseNhl27Snapshot(p, at).data.matches[0];
  assert.equal(match.opponent, "Club #16793");
  assert.equal(match.opponentClubId, "16793");
  assert.equal(match.opponentCrest, undefined);
});

test("crest tolerance does not relax strict opponent identity or core score validation", () => {
  for (const opponentClubId of [undefined, null, "", "0", "29202", "../16793", -1, true]) {
    const p = fixture();
    p.recentGames.RegularSeason[0].clubs["29202"].opponentClubId = opponentClubId;
    assert.throws(() => parseNhl27Snapshot(p, at), /opponentClubId/);
  }
  const p = fixture();
  p.recentGames.RegularSeason[0].clubs["16793"].details.customKit = { crestAssetId: "bad" };
  p.recentGames.RegularSeason[0].clubs["29202"].score = null;
  assert.throws(() => parseNhl27Snapshot(p, at), /score/);
  p.recentGames.RegularSeason[0].clubs["29202"].score = "7";
  p.recentGames.RegularSeason[0].clubs["16793"].details.clubId = "999";
  assert.throws(() => parseNhl27Snapshot(p, at), /details.clubId/);
});
