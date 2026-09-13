import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import { transform, type Selector } from "lightningcss";
import ts from "typescript";
import HomepageClient from "../src/components/homepage/HomepageClient";
import { homeArchive } from "../src/components/homepage/home-data";
import { initHomeInteractions } from "../src/components/homepage/interactions";
import { renderHome, seasonContent } from "../src/components/homepage/views";
import type { Article } from "../src/lib/news";

// Reuse Next's bundled HTML parser: no network, browser, Redis, or new dependency.
// This is markup/interaction coverage, not a substitute for the browser handoff.
const require = createRequire(import.meta.url);
interface Element {
  tagName: string;
  id: string;
  textContent: string;
  innerHTML: string;
  attributes: Record<string, string>;
  dataset: Record<string, string>;
  open: boolean;
  classList: { contains(value: string): boolean; add(value: string): void; remove(value: string): void };
  querySelector(selector: string): Element | null;
  querySelectorAll(selector: string): Element[];
  closest(selector: string): Element | null;
  getAttribute(name: string): string | undefined;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: (event: { target: Element }) => void): void;
  focus(): void;
  showModal(): void;
  close(): void;
  getAnimations(): never[];
}
const { parse } = require("next/dist/compiled/node-html-parser") as { parse(markup: string): Element };
const one = (root: Element, selector: string) => {
  const element = root.querySelector(selector);
  assert.ok(element, `Missing rendered element: ${selector}`);
  return element;
};
const text = (root: Element, selector: string) => one(root, selector).textContent.trim();
const home = () => parse(renderToStaticMarkup(createElement(HomepageClient, {
  markup: renderHome(), articles: homeArchive.news,
})));
const source = (path: string) => ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes<T extends ts.Node>(root: ts.Node, guard: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  function visit(node: ts.Node) {
    if (guard(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}

/** Small event adapter over parsed production HTML. It runs the real delegated
 * interaction handler; it intentionally does not simulate layout or animation. */
function interactions(articles: Article[] = homeArchive.news) {
  const root = home();
  const listeners = new Map<Element, Map<string, ((event: { target: Element }) => void)[]>>();
  let focused: Element | null = null;
  function prepare(element: Element) {
    if (listeners.has(element)) return;
    listeners.set(element, new Map());
    const query = element.querySelector.bind(element);
    const queryAll = element.querySelectorAll.bind(element);
    element.querySelector = selector => {
      const found = query(selector);
      if (found) prepare(found);
      return found;
    };
    element.querySelectorAll = selector => {
      const found = queryAll(selector);
      found.forEach(prepare);
      return found;
    };
    Object.defineProperty(element, "dataset", { get: () => Object.fromEntries(
      Object.entries(element.attributes).filter(([key]) => key.startsWith("data-")).map(([key, value]) => [
        key.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value,
      ]),
    ) });
    const classes = () => (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
    Object.defineProperty(element, "classList", { value: {
      contains: (value: string) => classes().includes(value),
      add: (value: string) => element.setAttribute("class", [...new Set([...classes(), value])].join(" ")),
      remove: (value: string) => element.setAttribute("class", classes().filter(item => item !== value).join(" ")),
    } });
    element.addEventListener = (type, listener) => {
      const events = listeners.get(element)!;
      events.set(type, [...events.get(type) ?? [], listener]);
    };
    element.focus = () => { focused = element; };
    element.getAnimations = () => [];
  }
  [root, ...root.querySelectorAll("*")].forEach(prepare);
  const modal = one(root, "dialog");
  modal.open = false;
  modal.showModal = () => { modal.open = true; };
  modal.close = () => {
    modal.open = false;
    listeners.get(modal)?.get("close")?.forEach(fn => fn({ target: modal }));
  };
  initHomeInteractions({
    active: true,
    document: {
      body: one(root, ".bd-home"),
      querySelector: root.querySelector.bind(root),
      querySelectorAll: root.querySelectorAll.bind(root),
      addEventListener: root.addEventListener.bind(root),
    },
    MutationObserver: class { observe() {} disconnect() {} },
    onDispose() {},
    listen(target: Element, type: string, listener: (event: { target: Element }) => void) { target.addEventListener(type, listener); },
  }, { refresh() {} }, articles);
  return {
    root, modal,
    body: () => one(modal, ".modal-body"),
    click(target: Element | string) {
      const element = typeof target === "string" ? one(root, target) : target;
      prepare(element);
      // Match a native unmodified primary click, including default prevention
      // shared between target and delegated listeners. Anchor guards rely on it.
      const event = {
        target: element, button: 0, defaultPrevented: false,
        metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
        preventDefault() { this.defaultPrevented = true; },
      };
      listeners.get(element)?.get("click")?.forEach(fn => fn(event));
      listeners.get(root)?.get("click")?.forEach(fn => fn(event));
      return element;
    },
    focused: () => focused,
  };
}

function assertLocalAsset(url: string, prefix: string) {
  assert.ok(url.startsWith(prefix), `Asset must stay under ${prefix}: ${url}`);
  const path = resolve("public", `.${decodeURIComponent(url)}`);
  assert.ok(path.startsWith(resolve("public", `.${prefix}`) + "/"), `Asset escapes its namespace: ${url}`);
  const file = statSync(path);
  assert.ok(file.isFile() && file.size > 0, `Missing/empty generated asset: ${url}`);
}

function assertInert(root: Element) {
  assert.equal(root.querySelectorAll("script, iframe, object, embed, [data-injected]").length, 0, "Article text must not create elements/attributes");
  for (const element of root.querySelectorAll("*")) {
    for (const name of Object.keys(element.attributes)) {
      assert.ok(!name.toLowerCase().startsWith("on"), `Injected event attribute: ${name}`);
    }
  }
}

const payload = `A & B "double" 'single' <img data-injected="yes" src=x onerror="alert(1)"><script>alert(2)</script>`;
const article: Article = {
  id: "regression-story", title: payload, category: payload, date: payload,
  summary: `${payload}\n\nSecond paragraph & <strong>literal markup</strong>`,
};

test("production route mounts the approved port, not SeasonRecap or a demo entry point", () => {
  const page = source("src/app/page.tsx");
  const imports = nodes(page, ts.isImportDeclaration).map(node => (node.moduleSpecifier as ts.StringLiteral).text);
  for (const path of ["@/components/homepage/HomepageClient", "@/components/homepage/views", "@/lib/articles", "@/components/homepage/homepage.css", "@/components/homepage/production.css"]) {
    assert.ok(imports.includes(path), `Production dependency: ${path}`);
  }
  assert.ok(imports.every(path => !path.includes("/demos/") && !path.includes("SeasonRecap")));
  assert.ok(nodes(page, ts.isCallExpression).some(call => ts.isIdentifier(call.expression) && call.expression.text === "getAllArticles"), "Use the real published-article layer");
  const component = nodes(page, ts.isFunctionDeclaration).find(node => node.name?.text === "Home");
  assert.ok(component);
  const returned = nodes(component, ts.isReturnStatement)[0]?.expression;
  assert.ok(returned && ts.isJsxSelfClosingElement(returned));
  assert.equal(returned.tagName.getText(page), "HomepageClient");
});

test("server markup preserves the Variation 4 section order and no-JS content", () => {
  const root = home();
  assert.ok(one(root, ".bd-home.demo-10.hybrid [data-home-content]"));
  assert.deepEqual(root.querySelectorAll("section").map(section => section.id || "hero"), [
    "hero", "results", "weekly", "standings", "highlights", "news", "history", "awards", "scrapbook",
  ]);
  assert.equal(root.querySelectorAll("h1").length, 1);
  assert.equal(root.querySelectorAll("main, header, .lab-toolbar, .chooser, video, source").length, 0, "No duplicate shell, demo controls, or eagerly loaded movie");
  assert.equal(root.querySelectorAll("footer").length, 1);
  assert.equal(one(root, "dialog").getAttribute("aria-labelledby"), "dialog-title");
  assert.ok(one(root, ".motion-toggle").hasAttribute("hidden"), "Hide JS-only control before enhancement");
  assert.equal(root.querySelectorAll("#standings details").length, 3, "Native disclosures remain available without JS");
  assert.equal(one(root, ".skip-link").getAttribute("href"), "#home-content");
});

test("recent results contain exactly the four approved saved games, in order", () => {
  const rows = home().querySelectorAll("#results button[data-match]");
  assert.deepEqual(rows.map(row => ({
    index: row.getAttribute("data-match"), opponent: text(row, ".result-team b"),
    date: text(row, ".result-team small"), score: text(row, "strong"), result: text(row, ".result-letter"),
  })), [
    { index: "0", opponent: "The Buffalo Wings", date: "July 22, 2026", score: "10–4", result: "W" },
    { index: "1", opponent: "Thrasherz", date: "July 22, 2026", score: "6–5", result: "W" },
    { index: "2", opponent: "BILLS 717", date: "July 16, 2026", score: "9–8", result: "W" },
    { index: "3", opponent: "Tkachuk You", date: "June 19, 2026", score: "1–5", result: "L" },
  ]);
  const ui = interactions();
  for (const row of rows) {
    ui.click(row);
    assert.match(text(ui.body(), ".data-stamp"), /2025–2026.*ARCHIVE/i);
    assert.ok(text(ui.body(), "#dialog-title").includes(text(row, ".result-team b")));
    assert.match(text(ui.body(), ".fineprint"), /partial saved skater coverage.*not a complete match box score/i);
  }
  ui.click("[data-games]");
  assert.equal(ui.body().querySelectorAll("[data-match]").length, 8);
  assert.match(ui.body().textContent, /archive is incomplete/i);
});

test("performance, weekly, awards and video copy distinguish archives from pending tracking", () => {
  const root = home();
  assert.ok(text(root, ".season-status").includes("2026–2027"));
  assert.match(text(root, ".season-status"), /current-season tracking is being prepared/i);
  for (const id of ["results", "weekly", "standings", "awards", "highlights"]) {
    const section = one(root, `#${id}`);
    assert.ok(section.textContent.includes("2025–2026"), `${id}: label historical data locally`);
    assert.ok(!section.textContent.includes("2026–2027"), `${id}: do not relabel archived numbers as current`);
  }
  assert.match(text(root, "#weekly .fine"), /archived weekly selection/i);
  assert.match(text(root, "#weekly .eyebrow"), /APR 22, 2026/);
  assert.match(one(root, "#weekly img").getAttribute("alt")!, /not a verified portrait/i);
  assert.match(text(root, "#standings .fine"), /not votes or odds/i);
  assert.match(text(root, "#awards .awards-note"), /until this season’s awards are presented/i);
  const ui = interactions();
  for (const selector of ["[data-weekly]", "[data-standings]", "[data-awards]", "[data-player]"]) {
    ui.click(selector);
    assert.match(text(ui.body(), ".data-stamp"), /2025–2026.*ARCHIVE/i);
  }
});

test("past seasons preserve the historical captain register without inventing a 2026–2027 captain", () => {
  const expected = [
    ["2025", "2025–2026", "Rob"], ["2024", "2024–2025", "JRT IV"],
    ["2023", "2023–2024", "Jimmy"], ["2022", "2022–2023", "Matt"],
    ["2021", "2021–2022", "Matt"], ["2020", "2020–2021", "Xavier Laflamme"],
  ];
  assert.deepEqual(homeArchive.seasons.map(s => [s.year, s.label, s.captain]), expected);
  const ui = interactions();
  const buttons = ui.root.querySelectorAll("#history [data-season]");
  assert.deepEqual(buttons.map(button => [button.getAttribute("data-season"), text(button, "b"), text(button, "small").slice(4)]), expected);
  assert.match(text(ui.root, "#history .fine"), /photos.*may be from a later season/i);
  for (const [year, label, captain] of expected) {
    const button = ui.click(`[data-season="${year}"]`);
    assert.equal(button.getAttribute("aria-pressed"), "true");
    assert.equal(ui.root.querySelectorAll('[data-season][aria-pressed="true"]').length, 1);
    assert.equal(text(ui.root, "#season-panel .season-year"), label);
    assert.equal(text(ui.root, "#season-panel .captain-line strong"), captain);
    assert.ok(!text(ui.root, "#history").includes("2026–2027"));
  }
});

test("homepage and real Navbar section links resolve to unique rendered targets", () => {
  const root = home();
  const ids = root.querySelectorAll("[id]").map(element => element.id);
  assert.equal(new Set(ids).size, ids.length, "No ambiguous duplicate anchors");
  const nav = one(root, 'nav[aria-label="Homepage sections"]');
  assert.deepEqual(nav.querySelectorAll("a").map(a => a.getAttribute("href")), ["#results", "#weekly", "#standings", "#highlights", "#news", "#history"]);
  const navbar = source("src/components/layout/Navbar.tsx");
  const strips = nodes(navbar, ts.isVariableDeclaration).find(node => node.name.getText(navbar) === "pageStrips");
  assert.ok(strips?.initializer && ts.isObjectLiteralExpression(strips.initializer));
  const homeStrip = strips.initializer.properties.find(node => ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && node.name.text === "/");
  assert.ok(homeStrip && ts.isPropertyAssignment(homeStrip));
  const headerAnchors = nodes(homeStrip.initializer, ts.isStringLiteral).map(node => node.text).filter(value => value.startsWith("/#"));
  assert.deepEqual(headerAnchors, ["/#results", "/#standings", "/#history"]);
  for (const href of [...headerAnchors, ...root.querySelectorAll("a[href]").map(a => a.getAttribute("href")!)]) {
    const url = new URL(href, "http://localhost:3000");
    assert.equal(url.origin, "http://localhost:3000", `No demo/external route: ${href}`);
    if (url.hash) assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), `Dead anchor: ${href}`);
    else {
      const route = url.pathname.startsWith("/news/") ? "/news/[id]" : url.pathname === "/" ? "" : url.pathname;
      assert.ok(existsSync(`src/app${route}/page.tsx`), `Missing route: ${href}`);
    }
  }
});

test("supplied published news replaces demo fallback, caps at three, and allows an empty feed", () => {
  const articles = Array.from({ length: 5 }, (_, index) => ({ ...article, id: `published-${index}`, title: `Published story ${index}` }));
  const root = parse(renderHome(articles));
  assert.deepEqual(root.querySelectorAll("#news [data-news]").map(button => button.getAttribute("data-news")), articles.slice(0, 3).map(item => item.id));
  assert.deepEqual(root.querySelectorAll("#news h3").map(heading => heading.textContent), articles.slice(0, 3).map(item => item.title));
  assert.equal(parse(renderHome([])).querySelectorAll("#news [data-news]").length, 0, "Do not fabricate fallback news for an empty published feed");
});

test("dynamic news title/category/date/summary render as literal text and safe attributes", () => {
  const root = parse(renderHome([article]));
  assertInert(root);
  assert.equal(text(root, "#news h3"), article.title);
  assert.equal(text(root, "#news time"), article.date);
  assert.ok(!one(root, "#news time").hasAttribute("datetime"), "Invalid dates stay visible text, not invalid machine-readable dates");
  assert.equal(text(root, "#news .news-meta"), `${article.category} / ${article.date}`);
  assert.equal(one(root, "#news img").getAttribute("alt"), `Club archive imagery accompanying ${article.category}`);
  assert.ok(text(root, "#news .news-item p").startsWith(payload));
});

test("dynamic article IDs round-trip in data-news without attribute injection", () => {
  const item = { ...article, id: `story" data-injected="yes" onfocus="alert(1)'&<>` };
  const root = parse(renderHome([item]));
  assertInert(root);
  const link = one(root, "#news a[data-news]");
  assert.equal(link.tagName, "A", "Exercise the native anchor guard, not a button surrogate");
  assert.equal(link.getAttribute("data-news"), item.id);
  assert.equal(link.getAttribute("href"), `/news/${encodeURIComponent(item.id)}`);
  const ui = interactions([item]);
  ui.click(link);
  assert.equal(ui.modal.open, true, "Escaped IDs must still resolve to the right published story");
  assert.equal(text(ui.body(), "#dialog-title"), item.title);
});

test("article dialog escapes every dynamic field, preserves paragraphs, and returns focus", () => {
  const ui = interactions([article]);
  const opener = parse('<button data-news="regression-story">Read story</button>').querySelector("button")!;
  ui.click(opener);
  assert.equal(ui.modal.open, true);
  assertInert(ui.body());
  assert.equal(text(ui.body(), "#dialog-title"), article.title);
  assert.deepEqual(ui.body().querySelectorAll("p").map(p => p.textContent), [
    `${article.date} · ${article.category}`, ...article.summary.split("\n\n"),
  ]);
  ui.click(".close-modal");
  assert.equal(ui.modal.open, false);
  assert.equal(ui.focused(), opener);
});

test("generated images, history portraits, album, font/license, and lazy videos exist locally", () => {
  const roots = [home(), ...homeArchive.seasons.map(season => parse(seasonContent(season.year)))];
  const ui = interactions();
  for (let index = 0; index < 3; index++) {
    roots.push(parse(one(ui.root, "[data-album-image]").innerHTML));
    ui.click("[data-album-next]");
  }
  for (const root of roots) {
    for (const image of root.querySelectorAll("img")) {
      assertLocalAsset(image.getAttribute("src")!, "/images/homepage/");
      assert.ok(image.hasAttribute("alt"));
    }
  }
  assertLocalAsset("/images/homepage/barlow-condensed.ttf", "/images/homepage/");
  assertLocalAsset("/images/homepage/licenses/barlowcondensed.txt", "/images/homepage/");
  const clips = [...new Set(home().querySelectorAll("[data-video]").map(button => button.getAttribute("data-video")))];
  assert.deepEqual(clips, ["finish", "crease"]);
  assert.equal(ui.root.querySelectorAll("video, source").length, 0, "Poster only before explicit play intent");
  for (const clip of clips) {
    ui.click(`[data-video="${clip}"]`);
    const video = one(ui.body(), "video");
    assert.ok(video.hasAttribute("controls") && video.hasAttribute("playsinline"));
    assert.ok(!video.hasAttribute("autoplay"));
    assert.equal(video.getAttribute("preload"), "metadata");
    assertLocalAsset(video.getAttribute("poster")!, "/images/homepage/");
    assertLocalAsset(one(video, "source").getAttribute("src")!, "/videos/homepage/");
    assert.match(text(ui.body(), ".fineprint"), /archived club gameplay/i);
  }
});

const rootClass = (component: Selector[number]) => component.type === "class" && component.name === "bd-home";
const homeCompound = (components: Selector) => components.some(component => rootClass(component) || (
  component.type === "pseudo-class" && (component.kind === "where" || component.kind === "is") &&
  component.selectors.every(selector => selector.length === 1 && rootClass(selector[0]))
));
for (const file of ["homepage.css", "production.css"]) {
  test(`${file}: valid CSS, root-scoped selectors/motion, and namespaced assets`, () => {
    const path = `src/components/homepage/${file}`;
    const css = readFileSync(path);
    let selectors = 0;
    try {
      transform({ filename: path, code: css, visitor: {
        Rule(rule) {
          if (rule.type !== "style") return;
          for (const selector of rule.value.selectors) {
            selectors++;
            const end = selector.findIndex(component => component.type === "combinator");
            const first = end < 0 ? selector : selector.slice(0, end);
            // View-transition pseudo-elements live on html, but only while home is mounted.
            const guardedHtml = first[0]?.type === "type" && first[0].name === "html" && first.some(component =>
              component.type === "pseudo-class" && component.kind === "has" &&
              component.selectors.every(value => value.some(rootClass) && value.every(part => part.type !== "combinator")),
            );
            assert.ok(homeCompound(first) || guardedHtml, `Unscoped selector in ${file}: ${JSON.stringify(selector)}`);
            if (guardedHtml) assert.equal(end, -1, "html guard must not style other route descendants");
            if (end >= 0) {
              const boundary = selector[end];
              assert.ok(boundary.type === "combinator" && ["descendant", "child"].includes(boundary.value), "Do not target siblings outside the homepage subtree");
            }
            for (const component of selector.slice(end < 0 ? selector.length : end)) {
              if (component.type === "class") {
                assert.ok(!["bd-home", "demo-10", "hybrid", "motion-enabled", "motion-off"].includes(component.name), `.${component.name} belongs on the same homepage root, not a descendant`);
              }

            }
          }
        },
        Url(url) { assertLocalAsset(url.url, "/images/homepage/"); },
      } });
    } catch (error) {
      // Lightning CSS embeds the entire 190KB source in syntax errors; keep TAP readable.
      const failure = error as Error & { loc?: { line: number; column: number } };
      throw new Error(`${file}${failure.loc ? `:${failure.loc.line}:${failure.loc.column}` : ""}: ${failure.message}`);
    }
    assert.ok(selectors > 0, "Do not accidentally test an empty stylesheet");
    const ast = postcss.parse(css.toString());
    ast.walkAtRules(rule => {
      assert.notEqual(rule.name, "import", "No external/demo stylesheet imports");
      if (rule.name.endsWith("keyframes")) assert.ok(rule.params.startsWith("home-"), `Global animation name: ${rule.params}`);
      if (rule.name === "font-face") {
        const font = rule.nodes?.find(node => node.type === "decl" && node.prop === "font-family");
        assert.ok(font?.type === "decl" && font.value.startsWith("Home"), "Do not override a shared font family");
      }
    });
  });
}
