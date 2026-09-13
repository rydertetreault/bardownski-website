import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  getDisplayName,
  getDisplayNameFromGamertag,
  getNickname,
  getNicknameText,
} from "../src/lib/nicknames";
import { articles } from "../src/lib/news";

const players = [
  ["RYDER", "Rydayro", "JENE RENE TETREAU IV"],
  ["ROB", "S1obbyRobby", "SLOBBY ROBBY"],
  ["MATT", "Mhut8", "MATT HUT"],
  ["DYLAN", "u4 Pablo", "XAVIER LAFLAMME"],
  ["COLIN", "oP wet", "WOLFGANG MOZART"],
  ["KADEN", "u4 Hood", "GOTTA BE"],
  ["JIMMY", "Julio 3026", "JIMMY LEMONS"],
  ["LOGAN", "oP Ding1633", "TOP G"],
] as const;
const resolvers = [getDisplayName, getDisplayNameFromGamertag, getNickname];

for (const resolve of resolvers) {
  test(`${resolve.name}: every known name/gamertag resolves exactly to a nickname`, () => {
    for (const [name, tag, nickname] of players) {
      for (const input of [name, tag]) {
        for (const variant of [input, input.toLowerCase(), input.toUpperCase(), ` \t${input.toLowerCase().replace(/ /g, "  ")}\n`]) {
          assert.equal(resolve(variant), nickname, variant);
          assert.equal(resolve(resolve(variant)), nickname, "Resolution is idempotent");
          assert.ok(!resolve(variant).includes(" - "), "Never prefix a nickname with a raw name");
        }
      }
    }
  });

  test(`${resolve.name}: preserve full nicknames, unknown identities and non-name values`, () => {
    const values = [
      ...players.map(([, , nickname]) => nickname),
      "Matt Hut", "Jimmy Lemons", "Jene Rene Tetreau IV", "JRT IV", "Xavier Laflamme",
      "  Matt Hut  ", "Matt  Hut", "Jimmy\tLemons", "JRT IV's saves",
      "Matthew", "Ryderman", "Robert", "Robbie", "Loganathan", "Ryder Smith",
      "Matt scored", "oP wet extra", "new gamertag", "  Unmapped Name  ",
      "", " \t", "constructor", "__proto__", "toString", "hasOwnProperty",
      "/videos/dylan - 2026.mp4", "/videos/Ryder1.mp4", "highlights-matt",
      "https://example.com/matt", "@matt.example",
    ];
    for (const value of values) assert.equal(resolve(value), value);
  });
}

test("prose normalizer covers every mapped first name, possessives and uppercase copy", () => {
  assert.equal(
    getNicknameText("Ryder, Rob, Matt, Dylan, Colin, Kaden, Jimmy and Logan."),
    "Jene Rene Tetreau IV, Slobby Robby, Matt Hut, Xavier Laflamme, Wolfgang Mozart, Gotta Be, Jimmy Lemons and Top G.",
  );
  assert.equal(getNicknameText("Ryder’s saves and Matt's goals; Jimmy’s assists."), "Jene Rene Tetreau IV’s saves and Matt Hut's goals; Jimmy Lemons’s assists.");
  for (const [name, , nickname] of players) {
    assert.equal(getNicknameText(`${name} SCORED`), `${nickname} SCORED`);
    assert.equal(getNicknameText(name.toLowerCase()), getNicknameText(name[0] + name.slice(1).toLowerCase()));
  }
});

test("prose normalizer never doubles full nicknames and is idempotent", () => {
  const existing = "Matt Hut, MATT HUT, Matt\tHut, Jimmy Lemons, JIMMY LEMONS, Jimmy  Lemons, Jene Rene Tetreau IV, JRT IV, Xavier Laflamme, Slobby Robby, Wolfgang Mozart, Gotta Be and Top G.";
  assert.equal(getNicknameText(existing), existing);
  const mixed = "Matt passed to Jimmy Lemons, then Jimmy found Matt Hut. Ryder stood tall.";
  const expected = "Matt Hut passed to Jimmy Lemons, then Jimmy Lemons found Matt Hut. Jene Rene Tetreau IV stood tall.";
  assert.equal(getNicknameText(mixed), expected);
  assert.equal(getNicknameText(expected), expected);
  assert.equal(getNicknameText("Matt Hut’s goal and Jimmy Lemons's assist"), "Matt Hut’s goal and Jimmy Lemons's assist");
});

test("prose normalizer leaves unrelated words and technical URL/media tokens intact", () => {
  for (const text of [
    "Matthew, Robert, Robbie, Loganathan, Ryderman, préMatt and Matté",
    "matt_key highlights-matt matt-extra @matt.example",
    "https://example.com/Matt?player=Ryder www.example.com/Jimmy matt@example.com",
    "/videos/dylan - 2026.mp4 /videos/Ryder1.mp4 /videos/matt1.mp4",
    "/highlights#highlights-matt Ryder.mp4 Matt.webp #matt",
    "", "  ", "constructor __proto__ toString",
  ]) assert.equal(getNicknameText(text), text);
  assert.equal(getNicknameText("Matt. Jimmy! (Ryder)"), "Matt Hut. Jimmy Lemons! (Jene Rene Tetreau IV)");
  assert.equal(getNicknameText("Matt/Jimmy and Ryder.Dylan"), "Matt Hut/Jimmy Lemons and Jene Rene Tetreau IV.Xavier Laflamme");
});

// Only inspect editorial/display fields; raw media paths, keys and identity
// lookups intentionally retain the originals and must not be renamed.
function displayLiterals(path: string): string[] {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result: string[] = [];
  const collect = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) result.push(node.text);
    else ts.forEachChild(node, collect);
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) result.push(node.text);
    if (ts.isPropertyAssignment(node) && /^(name|title|captain|summary)$/.test(node.name.getText(source))) collect(node.initializer);
    if (ts.isJsxAttribute(node) && /^(alt|title|aria-label)$/.test(node.name.getText(source)) && node.initializer) collect(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function assertNicknameOnly(text: string, label: string) {
  const bareNames = /\b(?:RYDER|ROB|MATT(?!\s+HUT\b)|DYLAN|COLIN|KADEN|JIMMY(?!\s+LEMONS\b)|LOGAN)\b/i;
  assert.doesNotMatch(text, bareNames, label);
}

test("assigned editorial components contain nickname-only text and accessible labels", () => {
  for (const path of [
    "src/app/highlights/page.tsx",
    "src/app/highlights/highlights-data.ts",
    "src/components/sections/SeasonsOverview.tsx",
    "src/components/sections/WhoWeAreSection.tsx",
    "src/components/season/SeasonRecap.tsx",
  ]) {
    const texts = displayLiterals(path);
    assert.ok(texts.length, path);
    for (const text of texts) assertNicknameOnly(text, `${path}: ${text}`);
  }
});

test("public news copy uses full nicknames without changing the highlight source", () => {
  for (const article of articles) {
    assertNicknameOnly(article.title, `${article.id}: title`);
    assertNicknameOnly(article.summary, `${article.id}: summary`);
  }
  assert.equal(articles.find(article => article.id === "5")?.video, "/videos/dylan - 2026.mp4");
  assert.match(articles.find(article => article.id === "6")!.summary, /Matt Hut built/);
  assert.match(articles.find(article => article.id === "6")!.summary, /Matt Hut held/);
});

test("highlight identities, links and source filenames remain unchanged", () => {
  const page = readFileSync("src/app/highlights/page.tsx", "utf8");
  assert.match(page, /import\s*\{\s*players\s*\}\s*from\s*"\.\/highlights-data"/);
  const source = readFileSync("src/app/highlights/highlights-data.ts", "utf8");
  const media = [...source.matchAll(/\bsrc: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(media, [
    "https://youtu.be/aGrVfM6HsO0", "/videos/Ryder1.mp4", "/videos/Ryder2.mp4", "/videos/ryder3.mp4",
    "/videos/Dylan1.mp4", "/videos/Dylan2.mp4", "/videos/dylan - 2026.mp4",
    "/videos/GottaBe - Trap Edition.mp4", "/videos/Kaden1.mp4", "/videos/Slobby Robby 2026.mp4",
    ...Array.from({ length: 7 }, (_, i) => `/videos/matt${i + 1}.mp4`),
  ]);
  const ids = [...source.matchAll(/\bid: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, ["ryder", "r1", "r2", "r3", "r4", "dylan", "d1", "d2", "d3", "kaden", "k1", "k2", "slobby-robby", "sr1", "matt", "m1", "m2", "m3", "m4", "m5", "m6", "m7"]);
});

test("FC squad resolves presentation fields but keeps identity and kit lookup keys raw", () => {
  const source = readFileSync("src/app/fc/squad/page.tsx", "utf8");
  assert.match(source, /name: getDisplayName\(m\.name\)/);
  assert.match(source, /proName: getDisplayName\(m\.proName\)/);
  assert.match(source, /gamertag: m\.gamertag/);
  assert.match(source, /aggs\.get\(m\.gamertag\)/);
  assert.match(source, /number: KIT_NUMBERS\[m\.name\]/);
  for (const [name] of players) assert.match(source, new RegExp(`\\b${name}: \\d+`));
});
