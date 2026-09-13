import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React, { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import StatsClient, { type StatsClientProps } from "../src/app/stats/StatsClient";
import { StatsDisplay } from "../src/app/stats/components/StatsDisplay";
import type { ParsedStats } from "../src/lib/discord";
import * as seasonState from "../src/lib/hockey-season-state";
import { formatSeasonLabel } from "../src/lib/player-comparison";

const empty: ParsedStats = {
  date: "Test snapshot",
  roster: [],
  points: [],
  goals: [],
  assists: [],
  plusMinus: [],
  hits: [],
  saves: [],
  shutouts: [],
  milestones: [],
};
const current: ParsedStats = {
  ...empty,
  date: "Current test snapshot",
  roster: [{ name: "MIXED PLAYER", position: "G" }],
  points: [{ rank: 1, name: "MIXED PLAYER", value: 10, secondary: 6 }],
  goals: [{ rank: 1, name: "MIXED PLAYER", value: 0 }],
  saves: [{ rank: 1, name: "MIXED PLAYER", value: 20, secondary: 80, ggp: 2 }],
  shutouts: [{ rank: 1, name: "MIXED PLAYER", value: 0 }],
};
const archive = { season: "2025", stats: { ...empty, date: "Final archive snapshot" } };

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

function assertTabRelationships(markup: string, count: number) {
  const tabs = markup.match(/<button\b[^>]*role="tab"[^>]*>/g) ?? [];
  const panels = markup.match(/<div\b[^>]*role="tabpanel"[^>]*>/g) ?? [];
  assert.equal(tabs.length, count);
  assert.equal(panels.length, count);
  assert.equal(tabs.filter((tab) => attribute(tab, "aria-selected") === "true").length, 1);
  assert.equal(tabs.filter((tab) => attribute(tab, "tabindex") === "0").length, 1);
  for (const tab of tabs) {
    const panel = panels.find((candidate) => attribute(candidate, "id") === attribute(tab, "aria-controls"));
    assert.ok(panel, "Every tab controls a real panel, including inactive tabs");
    assert.equal(attribute(panel, "aria-labelledby"), attribute(tab, "id"));
    assert.equal(panel.includes('hidden=""'), attribute(tab, "aria-selected") !== "true");
  }
}

test("one accessible tablist always defaults to current, even with no current data", () => {
  for (const seasons of [[], [archive]]) {
    const markup = renderToStaticMarkup(<StatsClient seasons={seasons} />);
    assert.equal((markup.match(/role="tablist"/g) ?? []).length, 1);
    assertTabRelationships(markup, seasons.length + 1);
    assert.match(markup, /2026-2027 · Current/);
    assert.match(markup, /Current-season statistics are unavailable/);
    assert.match(markup, /Data snapshot · Unavailable/);
    assert.doesNotMatch(markup, /Final archive snapshot|stats-player-table/);
    assert.doesNotMatch(markup, /aria-pressed|role="group"/);
  }
});

test("explicit current unavailability suppresses supplied current stats without archive fallback", () => {
  const markup = renderToStaticMarkup(<StatsClient seasons={[archive, { season: seasonState.HOCKEY_SEASON, stats: current }]} currentAvailable={false} />);
  assertTabRelationships(markup, 2);
  assert.match(markup, /2025-2026 · Archive/);
  assert.match(markup, /Current-season statistics are unavailable/);
  assert.doesNotMatch(markup, /Current test snapshot|Final archive snapshot|MIXED PLAYER/);
});

test("season helper labels deduplicate equivalent spellings and retain the current snapshot", () => {
  const markup = renderToStaticMarkup(<StatsClient seasons={[
    archive,
    { season: "2026", stats: current },
    { season: "2026–2027", stats: empty },
    { season: "2025-2026", stats: empty },
  ]} />);
  assertTabRelationships(markup, 2);
  assert.match(markup, /Current test snapshot/);
  assert.doesNotMatch(markup, /Final archive snapshot/);
  assert.equal((markup.match(/class="stats-player-table"/g) ?? []).length, 2);
});

test("custom current season is supported and component instances never share IDs", () => {
  const props = { seasons: [archive], currentSeason: "2030" };
  const markup = renderToStaticMarkup(<><StatsClient {...props} /><StatsClient {...props} /></>);
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal((markup.match(/2030-2031 · Current/g) ?? []).length, 2);
});

test("skater and goalie tables stay visible and preserve mixed roles, zeroes and missing data", () => {
  const before = JSON.stringify(current);
  const markup = renderToStaticMarkup(<StatsDisplay stats={current} />);
  const tables = markup.match(/<table\b[^]*?<\/table>/g) ?? [];
  assert.equal(tables.length, 2);
  for (const table of tables) {
    assert.match(table, /<caption>/);
    assert.match(table, /<thead>/);
    assert.match(table, /<tbody>/);
    assert.match(table, /<th scope="row">MIXED PLAYER<\/th>/);
    assert.match(table, /<td>0<\/td>/);
    assert.match(table, /<td>—<\/td>/);
  }
  assert.match(tables[0], /Skater totals/);
  assert.match(tables[1], /Goalie totals/);
  assert.match(tables[1], /<td>80%<\/td>/);
  assert.equal((markup.match(/class="stats-table-scroll" role="region" tabindex="0"/g) ?? []).length, 2);
  const detailsIndex = markup.indexOf("<details");
  assert.ok(detailsIndex > markup.lastIndexOf("</table>"), "Tables are not hidden inside disclosures");
  assert.equal(JSON.stringify(current), before, "Display must not mutate incoming stats");
});

test("entry-only archives are visible without inventing positions or missing goalie stats", () => {
  const stats: ParsedStats = {
    ...empty,
    points: [{ name: "SKATER WITHOUT ROSTER", rank: 1, value: 7 }],
    shutouts: [{ name: "GOALIE WITHOUT ROSTER", rank: 1, value: 2 }],
  };
  const markup = renderToStaticMarkup(<StatsDisplay stats={stats} />);
  const tables = markup.match(/<table\b[^]*?<\/table>/g)!;
  assert.match(tables[0], /<th scope="row">SKATER WITHOUT ROSTER<\/th><td>—<\/td><td>—<\/td><td>7<\/td>/);
  assert.match(tables[1], /<th scope="row">GOALIE WITHOUT ROSTER<\/th><td>—<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>2<\/td>/);
  assert.doesNotMatch(tables[0], /GOALIE WITHOUT ROSTER/);
  assert.doesNotMatch(tables[1], /SKATER WITHOUT ROSTER/);
});

test("leader headlines include all tied leaders, sort reported values and retain cutoff ties", () => {
  const stats: ParsedStats = {
    ...empty,
    points: [
      { rank: 1, name: "LOWER", value: 1 },
      ...["ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON", "ZETA"].map((name, index) => ({ rank: index + 2, name, value: 10 })),
    ],
  };
  const before = JSON.stringify(stats);
  const markup = renderToStaticMarkup(<StatsDisplay stats={stats} />);
  const headline = markup.match(/<h4 class="stats-leader-name">([^]*?)<\/h4>/)![1];
  for (const name of ["ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON", "ZETA"]) assert.ok(headline.includes(name));
  assert.match(headline, /Tied for the lead/);
  assert.doesNotMatch(headline, /LOWER/);
  assert.match(markup, /stats-leader-total">10</);
  const list = markup.match(/<ol aria-label="Points leaders">([^]*?)<\/ol>/)![1];
  assert.equal((list.match(/<li value="1">/g) ?? []).length, 6);
  assert.match(list, /Tied at rank 1/);
  assert.equal(JSON.stringify(stats), before);
});

test("full profiles stay native and closed while preserving extended fields and milestones", () => {
  const stats: ParsedStats = {
    ...current,
    interceptions: [{ name: "MIXED PLAYER", rank: 1, value: 5 }],
    faceoffPct: [{ name: "MIXED PLAYER", rank: 1, value: 55.5 }],
    milestones: [{ name: "MIXED PLAYER", achievements: ["A supplied milestone"] }],
  };
  const markup = renderToStaticMarkup(<StatsDisplay stats={stats} />);
  assert.match(markup, /<details class="stats-profile"><summary>/);
  assert.doesNotMatch(markup, /<details[^>]*\bopen/);
  assert.match(markup, /Interceptions<\/small><strong>5/);
  assert.match(markup, /Faceoff %<\/small><strong>55.5%/);
  assert.match(markup, /Game-winning goals<\/small><strong>—/);
  assert.match(markup, /Goalie games played<\/small><strong>2/);
  assert.match(markup, /<li>A supplied milestone<\/li>/);
});

test("empty and non-finite snapshots have honest empty tables, not fake leaders or NaN", () => {
  const markup = renderToStaticMarkup(<StatsDisplay stats={{ ...empty, points: [{ name: "INVALID", rank: 1, value: NaN }] }} />);
  assert.match(markup, /No skater statistics were reported/);
  assert.match(markup, /No goalie statistics were reported/);
  assert.doesNotMatch(markup, /class="stats-leader"|>NaN<|>Infinity</);
});

// Exercise the actual event callbacks with tiny hook/ref doubles. No DOM test
// dependency is installed, so SSR above verifies semantics; this verifies the
// selection/focus contract without pretending to test browser layout or AT.
type TreeProps = {
  children?: ReactNode;
  role?: string;
  id?: string;
  hidden?: boolean;
  tabIndex?: number;
  "aria-selected"?: boolean;
  ref?: (node: { focus: () => void }) => void;
  onClick?: () => void;
  onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
};
function elements(node: ReactNode): ReactElement<TreeProps>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<TreeProps>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function clientHarness(props: StatsClientProps) {
  let selection: string | undefined;
  let focused = "";
  const refs = { current: [] as { focus: () => void }[] };
  const exports: { default?: (props: StatsClientProps) => ReactNode } = {};
  const require = createRequire(import.meta.url);
  const source = readFileSync("src/app/stats/StatsClient.tsx", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(id: string) {
      if (id === "react") return {
        useId: () => "test-instance",
        useRef: () => refs,
        useState: (initial: string) => {
          selection ??= initial;
          return [selection, (value: string) => { selection = value; }];
        },
      };
      if (id === "@/lib/hockey-season-state") return seasonState;
      if (id === "@/lib/player-comparison") return { formatSeasonLabel };
      if (id === "./components/StatsDisplay") return { StatsDisplay };
      return require(id);
    },
  });
  return {
    get focused() { return focused; },
    render() {
      const tree = elements(exports.default!(props));
      const tabs = tree.filter((element) => element.props.role === "tab");
      for (const tab of tabs) tab.props.ref?.({ focus: () => { focused = tab.props.id!; } });
      return {
        tree,
        tabs,
        selected: tabs.findIndex((tab) => tab.props["aria-selected"]),
        panels: tree.filter((element) => element.props.role === "tabpanel"),
      };
    },
  };
}

test("ArrowLeft/Right wrap, Home/End jump, unrelated keys pass through and clicks select", () => {
  const harness = clientHarness({ seasons: [{ season: seasonState.HOCKEY_SEASON, stats: current }, archive, { season: "2024", stats: empty }] });
  let view = harness.render();
  assert.equal(view.selected, 0);
  function press(key: string, expected: number, prevented = true) {
    let didPrevent = false;
    view.tabs[view.selected].props.onKeyDown!({ key, preventDefault: () => { didPrevent = true; } });
    view = harness.render();
    assert.equal(view.selected, expected);
    assert.equal(didPrevent, prevented);
    assert.equal(view.tabs.filter((tab) => tab.props.tabIndex === 0).length, 1);
    assert.equal(view.panels.filter((panel) => !panel.props.hidden).length, 1);
    if (prevented) assert.equal(harness.focused, view.tabs[expected].props.id);
  }
  press("ArrowLeft", 2);
  press("ArrowRight", 0);
  press("End", 2);
  press("Home", 0);
  press("ArrowRight", 1);
  press("ArrowDown", 1, false);
  press("Tab", 1, false);
  view.tabs[2].props.onClick!();
  assert.equal(harness.render().selected, 2);
});

test("season selection mounts only one keyed StatsDisplay and archive meta is explicit", () => {
  const harness = clientHarness({ seasons: [{ season: seasonState.HOCKEY_SEASON, stats: current }, archive] });
  let view = harness.render();
  const original = view.tree.filter((element) => element.type === StatsDisplay);
  assert.equal(original.length, 1);
  view.tabs[1].props.onClick!();
  view = harness.render();
  const selected = view.tree.filter((element) => element.type === StatsDisplay);
  assert.equal(selected.length, 1, "Inactive panels do not retain expanded profiles");
  assert.notEqual(selected[0].key, original[0].key);
  const markup = renderToStaticMarkup(<>{view.tree[0]}</>);
  assert.match(markup, /Archived season · 2025-2026/);
  assert.match(markup, /Data snapshot · Final archive snapshot/);
  assert.match(markup, /href="\/awards"/);
  view.tabs[0].props.onClick!();
  assert.equal(harness.render().selected, 0);
});

test("a single unavailable current tab still handles every navigation key", () => {
  const harness = clientHarness({ seasons: [], currentAvailable: false });
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    const view = harness.render();
    view.tabs[0].props.onKeyDown!({ key, preventDefault() {} });
    assert.equal(harness.render().selected, 0);
    assert.equal(harness.focused, view.tabs[0].props.id);
  }
});
