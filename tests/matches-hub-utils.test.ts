import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Match } from "../src/types";
import {
  PREVIOUS_SEASON_WIN_STREAK,
  currentWinRun,
  filterMatches,
  matchDetailHref,
  sortMatches,
  type MatchFilter,
  type MatchSeason,
} from "../src/app/matches/hub-utils";

function match(id: string, timestamp: number, overrides: Partial<Match> = {}): Match {
  return {
    id,
    timestamp,
    date: "September 13, 2026",
    opponent: "Ice Wolves",
    homeAway: "home",
    scoreUs: 3,
    scoreThem: 1,
    status: "final",
    matchType: "regular",
    ...overrides,
  };
}

function ids(matches: Match[]): string[] {
  return matches.map((entry) => entry.id);
}

const invalidScores: [string, unknown][] = [
  ["null", null],
  ["missing", undefined],
  ["NaN", Number.NaN],
  ["positive infinity", Number.POSITIVE_INFINITY],
  ["negative infinity", Number.NEGATIVE_INFINITY],
  ["negative number", -1],
  ["numeric string", "3"],
  ["empty string", ""],
  ["true", true],
  ["false", false],
  ["object", {}],
  ["array", []],
];

function malformedMatch(field: "scoreUs" | "scoreThem", value: unknown): Match {
  // Model malformed feed data deliberately, without weakening the Match type.
  return { ...match("unknown", 30), [field]: value } as Match;
}

describe("sortMatches", () => {
  it("returns a new array in descending timestamp order", () => {
    const matches = [match("old", 10), match("new", 30), match("middle", 20)];
    const sorted = sortMatches(matches);
    assert.deepEqual(ids(sorted), ["new", "middle", "old"]);
    assert.notStrictEqual(sorted, matches);
    assert.strictEqual(sorted[0], matches[1]);
    assert.deepEqual(ids(matches), ["old", "new", "middle"]);
  });

  it("deduplicates by ID, keeping the newest occurrence regardless of input order", () => {
    const older = match("duplicate", 10, { scoreUs: 0 });
    const newer = match("duplicate", 30);
    const distinct = match("distinct", 20);
    for (const matches of [[older, newer, distinct], [newer, distinct, older]]) {
      assert.deepEqual(sortMatches(matches), [newer, distinct]);
    }
  });

  it("keeps distinct IDs at the same timestamp and resolves duplicate ties stably", () => {
    const first = match("same", 20);
    const second = match("same", 20, { scoreUs: 0 });
    const other = match("other", 20);
    assert.deepEqual(sortMatches([first, other, second]), [first, other]);
  });

  it("treats IDs as literal strings, including object-key-like names", () => {
    const matches = [match("__proto__", 10), match("constructor", 20), match("__proto__", 30)];
    assert.deepEqual(ids(sortMatches(matches)), ["__proto__", "constructor"]);
  });

  it("copies empty and singleton arrays", () => {
    for (const matches of [[], [match("only", 1)]]) {
      assert.deepEqual(sortMatches(matches), matches);
      assert.notStrictEqual(sortMatches(matches), matches);
    }
  });
});

describe("matchDetailHref", () => {
  it("encodes the entire ID and keeps collisions across seasons separate", () => {
    const collision = match("shared/id ?#%+é", 1);
    const seasons: MatchSeason[] = ["2026-2027", "2025-2026"];
    const links = seasons.map((season) => matchDetailHref(collision, season));
    assert.deepEqual(links, [
      "/matches/shared%2Fid%20%3F%23%25%2B%C3%A9?season=2026-2027",
      "/matches/shared%2Fid%20%3F%23%25%2B%C3%A9?season=2025-2026",
    ]);
    assert.notEqual(links[0], links[1]);
  });

  it("does not link live, upcoming, or forfeited games in either season", () => {
    const seasons: MatchSeason[] = ["2026-2027", "2025-2026"];
    for (const season of seasons) {
      for (const status of ["live", "upcoming"] as const) {
        assert.equal(matchDetailHref(match(status, 1, { status }), season), null);
      }
      assert.equal(matchDetailHref(match("forfeit", 1, { forfeit: true }), season), null);
    }
  });

  it("links any non-forfeit final without adding score or match-type restrictions", () => {
    const finals = [
      match("loss", 1, { scoreUs: 0 }),
      match("unknown", 1, { scoreUs: null, scoreThem: null }),
      match("private", 1, { matchType: "private", forfeit: false }),
      match("club-finals", 1, { matchType: "finals" }),
    ];
    for (const entry of finals) {
      assert.equal(matchDetailHref(entry, "2026-2027"), `/matches/${entry.id}?season=2026-2027`);
    }
  });
});

describe("filterMatches", () => {
  const matches = [
    match("win", 10, { opponent: "Ice Wolves" }),
    match("loss", 20, { opponent: "WOLVES United", scoreUs: 0 }),
    match("upcoming", 30, { opponent: "Ice Wolves", status: "upcoming" }),
    match("live", 40, { opponent: "Ice Wolves", status: "live" }),
    match("unknown", 50, { opponent: "Ice Wolves", scoreUs: null }),
    match("private", 60, { opponent: "Ice Wolves", matchType: "private" }),
    match("forfeit", 70, { opponent: "Ice Wolves", forfeit: true }),
    match("other", 80, { opponent: "Bears" }),
  ];

  it("matches opponents case-insensitively and combines the query with each filter", () => {
    const expected: Record<MatchFilter, string[]> = {
      all: ["win", "loss", "upcoming", "live", "unknown", "private", "forfeit"],
      W: ["win", "private", "forfeit"],
      L: ["loss"],
      upcoming: ["upcoming"],
    };
    for (const filter of Object.keys(expected) as MatchFilter[]) {
      assert.deepEqual(ids(filterMatches(matches, filter, "wOlVeS")), expected[filter]);
    }
  });

  it("treats regex punctuation literally, rather than as search syntax", () => {
    const opponents = [
      match("literal", 1, { opponent: "The [A.*] Club" }),
      match("plain", 2, { opponent: "The AAA Club" }),
    ];
    assert.deepEqual(ids(filterMatches(opponents, "all", "[a.*]")), ["literal"]);
    assert.deepEqual(ids(filterMatches(opponents, "all", ".*")), ["literal"]);
    assert.deepEqual(filterMatches(opponents, "all", "^The"), []);
  });

  it("uses only the opponent field and returns no matches for an absent substring", () => {
    assert.deepEqual(filterMatches(matches, "all", "September"), []);
    assert.deepEqual(filterMatches(matches, "all", "forfeit"), []);
    assert.deepEqual(filterMatches(matches, "W", "not present"), []);
  });

  it("empty queries preserve all matching entries and their input order", () => {
    const filtered = filterMatches(matches, "all", "");
    assert.deepEqual(filtered, matches);
    assert.notStrictEqual(filtered, matches);
    assert.deepEqual(ids(filterMatches(matches, "W", "")), ["win", "private", "forfeit", "other"]);
    assert.deepEqual(filterMatches([], "all", ""), []);
  });

  it("does not classify live or upcoming scores as wins or losses", () => {
    for (const status of ["live", "upcoming"] as const) {
      const entries = [match("ahead", 1, { status }), match("behind", 2, { status, scoreUs: 0 })];
      assert.deepEqual(filterMatches(entries, "W", ""), []);
      assert.deepEqual(filterMatches(entries, "L", ""), []);
    }
  });

  it("accepts zero scores and uses the existing non-win L convention for ties", () => {
    const entries = [
      match("shutout-win", 1, { scoreThem: 0 }),
      match("shutout-loss", 2, { scoreUs: 0 }),
      match("tie", 3, { scoreUs: 0, scoreThem: 0 }),
    ];
    assert.deepEqual(ids(filterMatches(entries, "W", "")), ["shutout-win"]);
    assert.deepEqual(ids(filterMatches(entries, "L", "")), ["shutout-loss", "tie"]);
  });
});

describe("malformed scores", () => {
  for (const field of ["scoreUs", "scoreThem"] as const) {
    for (const [label, value] of invalidScores) {
      it(`treats ${field} = ${label} as unknown in runs and result filters`, () => {
        const unknown = malformedMatch(field, value);
        assert.equal(currentWinRun([match("old-win", 10), unknown]), null);
        assert.equal(currentWinRun([match("new-win", 40), unknown, match("old-win", 10)]), 1);
        assert.deepEqual(filterMatches([unknown], "W", ""), []);
        assert.deepEqual(filterMatches([unknown], "L", ""), []);
        assert.deepEqual(filterMatches([unknown], "all", ""), [unknown]);
      });
    }
  }
});

describe("currentWinRun", () => {
  it("returns null for empty input or no competitive finals, never the archive benchmark", () => {
    assert.equal(PREVIOUS_SEASON_WIN_STREAK, 24);
    assert.equal(currentWinRun([]), null);
    assert.equal(currentWinRun([
      match("private", 30, { matchType: "private" }),
      match("live", 20, { status: "live" }),
      match("upcoming", 10, { status: "upcoming" }),
    ]), null);
  });

  it("counts only the latest consecutive wins after sorting, stopping at the first loss", () => {
    const matches = [
      match("old-win", 10),
      match("latest-win", 50),
      match("loss", 30, { scoreUs: 0 }),
      match("previous-win", 40),
      match("older-win", 20),
    ];
    assert.equal(currentWinRun(matches), 2);
  });

  it("returns zero for a latest valid loss or tie, rather than an earlier run", () => {
    for (const scores of [{ scoreUs: 0, scoreThem: 1 }, { scoreUs: 0, scoreThem: 0 }]) {
      assert.equal(currentWinRun([match("win", 10), match("non-win", 20, scores)]), 0);
    }
  });

  it("ignores live, upcoming and private entries both before and within the run", () => {
    assert.equal(currentWinRun([
      match("upcoming", 80, { status: "upcoming", scoreUs: null, scoreThem: null }),
      match("live", 70, { status: "live", scoreUs: 0 }),
      match("private-newest", 60, { matchType: "private", scoreUs: null }),
      match("regular", 50),
      match("private-loss", 40, { matchType: "private", scoreUs: 0 }),
      match("club-finals", 30, { matchType: "finals" }),
      match("legacy-type", 20, { matchType: undefined }),
    ]), 3);
  });

  it("returns only wins newer than an unknown final, not null or joined older wins", () => {
    assert.equal(currentWinRun([
      match("newest-win", 50),
      match("next-win", 40),
      match("unknown", 30, { scoreUs: null, scoreThem: null }),
      match("older-win", 20),
      match("oldest-win", 10),
    ]), 2);
  });

  it("counts forfeit wins but stops at a scored forfeit loss", () => {
    assert.equal(currentWinRun([
      match("forfeit-win", 40, { forfeit: true, scoreUs: 1, scoreThem: 0 }),
      match("regular-win", 30),
      match("forfeit-loss", 20, { forfeit: true, scoreUs: 0 }),
      match("older-win", 10),
    ]), 2);
    assert.equal(currentWinRun([match("forfeit-loss", 20, { forfeit: true, scoreUs: 0 })]), 0);
  });

  it("does not infer a forfeit win from missing or invalid scores", () => {
    for (const scoreUs of [null, Number.NaN, -1]) {
      const unknownForfeit = match("forfeit", 20, { forfeit: true, scoreUs });
      assert.equal(currentWinRun([unknownForfeit, match("older-win", 10)]), null);
      assert.equal(currentWinRun([match("new-win", 30), unknownForfeit, match("old-win", 10)]), 1);
    }
  });

  it("deduplicates IDs rather than double-counting wins or reading stale results", () => {
    assert.equal(currentWinRun([
      match("duplicate", 10, { scoreUs: 0 }),
      match("other-win", 20),
      match("duplicate", 30),
      match("duplicate", 30),
    ]), 2);
    assert.equal(currentWinRun([
      match("duplicate", 10),
      match("duplicate", 20, { scoreUs: null }),
    ]), null);
  });

  it("counts available wins without seeding from or capping at the previous season", () => {
    assert.equal(currentWinRun([match("only-current-win", 1)]), 1);
    assert.equal(currentWinRun(Array.from({ length: 25 }, (_, index) => match(String(index), index))), 25);
  });

  it("accepts any finite nonnegative score without coercion or an integer restriction", () => {
    assert.equal(currentWinRun([match("zero-against", 2, { scoreThem: 0 })]), 1);
    assert.equal(currentWinRun([match("finite", 1, { scoreUs: 1.5, scoreThem: 0.5 })]), 1);
  });
});

it("all helpers leave frozen input arrays and match objects unchanged", () => {
  const matches = [
    match("older", 10),
    match("newer", 30),
    match("unknown", 20, { scoreUs: null }),
    match("older", 10),
  ];
  const before = structuredClone(matches);
  matches.forEach((entry) => Object.freeze(entry));
  Object.freeze(matches);

  sortMatches(matches);
  currentWinRun(matches);
  for (const filter of ["all", "W", "L", "upcoming"] as const) {
    filterMatches(matches, filter, "ice");
  }
  for (const entry of matches) {
    matchDetailHref(entry, "2026-2027");
    matchDetailHref(entry, "2025-2026");
  }
  assert.deepEqual(matches, before);
});
