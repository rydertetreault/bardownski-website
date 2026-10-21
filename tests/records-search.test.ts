import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import markup from "../src/app/records/redesign/markup.json";
import { getPlayerSearchAliases } from "../src/lib/nicknames";
import { searchRecords, type SearchableRecord, type SearchRankingEntry } from "../src/app/records/redesign/search";

function player(name: string, position?: string, number = 10): SearchRankingEntry {
  return { name, position, number };
}
function board(id: string, ranking: SearchRankingEntry[], extra: Partial<SearchableRecord> = {}) {
  return {
    id, title: "Most blocks", category: "Skater", scope: "Season", tags: "", status: "active",
    winners: ranking.length ? [ranking[0].name] : [], ranking, ...extra,
  };
}
function ids(records: SearchableRecord[], query: string) {
  return searchRecords(records, query).map(result => result.record.id);
}

const rob = player("SLOBBY ROBBY", "LD", 20);
const ryder = player("JENE RENE TETREAU IV", "G", 30);
const matt = player("MATT HUT", "C", 40);

test("holder relevance outranks participant boards and returns original references", () => {
  const participant = board("participant", [matt, rob]);
  const holder = board("holder", [rob]);
  const results = searchRecords([participant, holder], "Robby blocks");
  assert.deepEqual(results.map(result => result.record.id), ["holder", "participant"]);
  assert.ok(results[0].score > results[1].score);
  assert.equal(results[0].record, holder);
  assert.deepEqual(results[0].match, { entry: rob, rank: 1, isHolder: true });
  assert.deepEqual(results[1].match, { entry: rob, rank: 2, isHolder: false });
  assert.equal(results[1].match?.entry, rob);
});

test("real names, nicknames, gamertags and partial names resolve in both directions", () => {
  for (const stored of ["ROB", "SLOBBY ROBBY", "S1obbyRobby"]) {
    const records = [board("rob", [player(stored, "LD")])];
    for (const query of ["Rob", "Robby", "Slobby", "S1obbyRobby", "s1obb", "slobby robby"]) {
      assert.deepEqual(ids(records, query), ["rob"], `${stored}: ${query}`);
    }
  }
  for (const stored of ["RYDER", "Rydayro", "JENE RENE TETREAU IV"]) {
    const records = [board("ryder", [player(stored, "G")])];
    for (const query of ["Ryder", "rydayro", "Jene Rene", "tetre", "JÉNE-RÉNÉ"]) {
      assert.deepEqual(ids(records, query), ["ryder"], `${stored}: ${query}`);
    }
  }
});

test("every known identity resolves all search aliases without shared mutable state", () => {
  const identities = [
    ["RYDER", "Rydayro", "JENE RENE TETREAU IV"],
    ["ROB", "S1obbyRobby", "SLOBBY ROBBY"],
    ["MATT", "Mhut8", "MATT HUT"],
    ["DYLAN", "u4 Pablo", "XAVIER LAFLAMME"],
    ["COLIN", "oP wet", "WOLFGANG MOZART"],
    ["KADEN", "u4 Hood", "GOTTA BE"],
    ["JIMMY", "Julio 3026", "JIMMY LEMONS"],
    ["LOGAN", "oP Ding1633", "TOP G"],
  ];
  for (const identity of identities) {
    for (const input of identity) {
      for (const variant of [input, `  ${input.toLowerCase().replace(/ /g, "  ")}  `]) {
        const aliases = getPlayerSearchAliases(variant);
        for (const expected of identity) assert.ok(aliases.includes(expected), `${variant}: ${expected}`);
        const snapshot = [...aliases];
        const records = [board("known", [player(variant)])];
        for (const query of identity) assert.deepEqual(ids(records, query), ["known"], `${variant}: ${query}`);
        assert.deepEqual(aliases, snapshot);
        aliases.splice(0, aliases.length, "poisoned alias");
        assert.deepEqual(getPlayerSearchAliases(variant), snapshot);
      }
    }
  }
});

test("unknown identity aliases are exact fallbacks, not guessed or prototype lookups", () => {
  for (const name of ["", "  Mystery Player  ", "Robert", "Ryder Smith", "Robby", "constructor", "__proto__", "toString"]) {
    const aliases = getPlayerSearchAliases(name);
    assert.deepEqual(aliases, [name]);
    aliases.push("ROB");
    assert.deepEqual(getPlayerSearchAliases(name), [name]);
  }
  const records = [board("unknown", [player("Mystery Player")])];
  assert.deepEqual(ids(records, "mystery"), ["unknown"]);
  assert.deepEqual(ids(records, "Rob"), []);
});

test("all participant query terms must match the same ranking entry", () => {
  const records = [board("mixed", [ryder, rob])];
  assert.deepEqual(ids(records, "Robby goalie"), []);
  assert.deepEqual(ids(records, "Robby Ryder"), []);
  assert.deepEqual(ids(records, "Robby G blocks"), []);
  assert.deepEqual(ids(records, "Robby LD blocks"), ["mixed"]);
  assert.deepEqual(ids(records, "Ryder goalie blocks"), ["mixed"]);
});

test("competition ranks include shared holders and skip places after ties", () => {
  const tied = board("ties", [player("First", "C", 50), player("Second", "C", 50),
    player("Third", "C", 30), player("Fourth", "C", 30), player("Fifth", "C", 10)]);
  for (const [name, rank, isHolder] of [["First", 1, true], ["Second", 1, true],
    ["Third", 3, false], ["Fourth", 3, false], ["Fifth", 5, false]] as const) {
    const result = searchRecords([tied], name)[0];
    assert.equal(result.match?.rank, rank);
    assert.equal(result.match?.isHolder, isHolder);
  }
});

test("position-only queries prefer specialized metadata over general participant boards", () => {
  const records = [board("general", [rob]), board("defense", [], { title: "Defense records" }),
    board("tagged", [], { tags: "defence" }), board("goalie", [], { category: "Goaltender" })];
  for (const query of ["D", "defense", "defence", "defender", "defenseman", "defensemen"]) {
    assert.deepEqual(ids(records, query), ["defense", "tagged", "general"]);
  }
  assert.deepEqual(ids(records, "goalkeeper"), ["goalie"]);
  assert.deepEqual(ids(records, "LD"), ["general"]);
});

test("goaltending and goalkeeping metadata includes pending single-game boards", () => {
  const records = [board("general", [ryder]),
    board("pending", [], { title: "Most saves", category: "Goaltending", scope: "Single game", status: "pending" }),
    board("goalkeeping", [], { title: "Goalkeeping records", status: "pending" })];
  for (const query of ["G", "GK", "goalie", "goaltender", "goalkeeper", "goaltending", "goalkeeping"]) {
    assert.deepEqual(ids(records, query), ["pending", "goalkeeping", "general"], query);
  }
  assert.deepEqual(ids(records, "goalie saves"), ["pending"]);
  assert.deepEqual(ids(records, "goaltending single game"), ["pending"]);
  assert.equal(searchRecords(records, "goalie saves")[0].match, undefined);
});

test("generic D does not invent left or right defense even on specialized boards", () => {
  const records = [board("generic", [player("ROB", "D")], { category: "Defense" }),
    board("left", [rob]), board("right", [player("Guest", "RD")]),
    board("specialized", [], { title: "Left defense records" })];
  assert.deepEqual(ids(records, "LD"), ["specialized", "left"]);
  assert.deepEqual(ids(records, "RD"), ["right"]);
  assert.deepEqual(ids(records, "Rob RD"), []);
  assert.ok(ids(records, "D").includes("generic"));
});

test("position families and multiword positions match explicit positions only", () => {
  const records = [board("g", [ryder]), board("ld", [rob]), board("rd", [player("Right", "RD")]),
    board("c", [matt]), board("lw", [player("Left", "LW")]), board("rw", [player("Wing", "RW")])];
  for (const query of ["G", "GK", "goalie", "goaltender", "goalkeeper"]) assert.deepEqual(ids(records, query), ["g"]);
  for (const query of ["F", "forward"]) assert.deepEqual(ids(records, query), ["c", "lw", "rw"]);
  for (const query of ["C", "center", "centre"]) assert.deepEqual(ids(records, query), ["c"]);
  for (const query of ["LW", "left wing", "left-wing"]) assert.deepEqual(ids(records, query), ["lw"]);
  for (const query of ["RW", "right wing"]) assert.deepEqual(ids(records, query), ["rw"]);
  assert.deepEqual(ids(records, "left defense"), ["ld"]);
  assert.deepEqual(ids(records, "right defence"), ["rd"]);
});

test("single position letters never leak from names, metadata substrings or unknown positions", () => {
  const records = [board("unknown", [player("Craig David", "unknown")], {
    title: "Scoring records", category: "Skater", tags: "legend", scope: "Career",
  }), board("literal", [player("G", "Mystery")], { title: "Awards" }),
  board("unrecognized", [player("Guest", "legacy goalie")])];
  for (const query of ["C", "D", "G", "F", "GK", "LD", "goalie", "forward"]) assert.deepEqual(ids(records, query), [], query);
});

test("Top G is a literal player identity, never an inferred goalie", () => {
  const records = [board("logan", [player("TOP G", "RW")]), board("goalie", [ryder])];
  for (const query of ["Top G", "TOP-G", "Logan", "oP Ding1633", "Top G blocks"]) {
    assert.deepEqual(ids(records, query), ["logan"]);
  }
  assert.deepEqual(ids(records, "G"), ["goalie"]);
  assert.deepEqual(ids(records, "Top G goalie"), []);
});

test("modest stat aliases, symbols, punctuation and combined positions", () => {
  const records = [board("saves", [ryder], { title: "Most saves" }),
    board("pm", [rob], { title: "Best +/−" }), board("points", [matt], { title: "Most points" }),
    board("goals", [matt], { title: "Most goals" }), board("assists", [matt], { title: "Most assists" })];
  for (const query of ["goalie saves", "GK SAVE", "(goaltender), saves!"]) assert.deepEqual(ids(records, query), ["saves"]);
  for (const query of ["+/-", "+/−", "plus minus", "plus-minus", "±", "LD plus minus", "Róbby +/−"]) {
    assert.deepEqual(ids(records, query), ["pm"], query);
  }
  assert.deepEqual(ids(records, "pts"), ["points"]);
  assert.deepEqual(ids(records, "goal"), ["goals"]);
  assert.deepEqual(ids(records, "assist"), ["assists"]);
  assert.deepEqual(ids([board("pm", [rob], { title: "Best plus-minus" })], "+/-"), ["pm"]);
});

test("metadata combines across fields; names/tags remain participant-local", () => {
  const records = [board("metadata", [], { title: "Most", category: "Blocks", tags: "Playoffs", scope: "Career" }),
    board("tag", [{ ...player("Unknown", "C"), tag: "Unique.Tag" }])];
  assert.deepEqual(ids(records, "career playoffs blocks"), ["metadata"]);
  assert.equal(searchRecords(records, "career playoffs blocks")[0].match, undefined);
  assert.deepEqual(ids(records, "unique tag blocks"), ["tag"]);
  assert.deepEqual(ids(records, "active"), []);
});

test("blocked shots and save keywords work without indexing eligibility prose", () => {
  const records = [
    { ...board("blocks", [rob], { title: "Most blocked shots" }),
      rule: "Goalie Ryder is eligible", description: "Goaltender records for Ryder" },
    board("saves", [ryder], { title: "Most saves" }),
  ];
  for (const query of ["blocks", "blocked", "Most blocked shots"]) {
    assert.deepEqual(ids(records, query), ["blocks"]);
  }
  for (const query of ["save", "sav", "goalie saves"]) {
    assert.deepEqual(ids(records, query), ["saves"]);
  }
  assert.deepEqual(ids(records, "Ryder"), ["saves"]);
  assert.deepEqual(ids(records, "Ryder blocks"), []);
  assert.deepEqual(ids(records, "eligible"), []);
});

test("only incoming season rankings supply participants and positions", () => {
  const old = board("old", [{ ...rob, season: "2025" }]);
  const current = board("current", [{ ...ryder, season: "2026" }], { winners: ["ROB"] });
  assert.deepEqual(ids([old], "Robby LD"), ["old"]);
  assert.deepEqual(ids([current], "Robby"), []);
  assert.deepEqual(ids([current], "LD"), []);
  assert.deepEqual(ids([current], "Ryder goalie"), ["current"]);
});

test("empty queries and score ties preserve order; unknown queries are safe", () => {
  const records = [board("z", [rob]), board("a", [rob])];
  for (const query of ["", " \t\n", "Robby", "blocks"]) assert.deepEqual(ids(records, query), ["z", "a"]);
  assert.deepEqual(searchRecords(records, "").map(result => result.score), [0, 0]);
  for (const query of ["not-a-player", "constructor", "__proto__", "[.*]", "(a+)+$"]) assert.deepEqual(ids(records, query), []);
  assert.deepEqual(searchRecords([], "Robby"), []);
});

test("does not mutate inputs and preserves generic record/entry fields", () => {
  const entry = Object.freeze({ ...rob, customEntry: 123 });
  const record = Object.freeze({ ...board("frozen", []), custom: { retained: true },
    ranking: Object.freeze([entry]), winners: Object.freeze(["ROB"]) });
  const records = Object.freeze([record]);
  const before = JSON.stringify(records);
  const result = searchRecords(records, "Rob")[0];
  assert.equal(result.record, record);
  assert.equal(result.record.custom.retained, true);
  assert.equal(result.match?.entry.customEntry, 123);
  assert.equal(result.match?.entry, entry);
  assert.equal(JSON.stringify(records), before);
});


test("search UI uses full nicknames rather than real-name or shortened examples", () => {
  assert.match(markup, /placeholder="Search by nickname, position, or stat…"/);
  assert.match(markup, /“Matt Hut goals”/);
  assert.match(markup, /data-search-term="Slobby Robby">Slobby Robby<\/button>/);
  assert.match(markup, /data-search-term="Jene Rene Tetreau IV">Jene Rene Tetreau IV<\/button>/);
  assert.doesNotMatch(markup, /Try Robby|Matt goals|Robby blocks|data-search-term="(?:Robby|Ryder)"/);
  const runtime = readFileSync(new URL("../src/app/records/redesign/initialize.js", import.meta.url), "utf8");
  assert.match(runtime, /Try a nickname, position, or stat — like “Slobby Robby”/);
});
