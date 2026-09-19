import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SplashScreen from "../src/components/layout/SplashScreen";
import { SPLASH_SRC, SPLASH_SESSION_KEY } from "../src/components/layout/splash-config";

test("splash server-renders the loading-flash ident as a muted, inline, autoplaying overlay", () => {
  const markup = renderToStaticMarkup(createElement(SplashScreen));
  assert.match(markup, /class="site-splash[^"]*fixed inset-0/, "full-screen overlay is in the initial HTML");
  assert.match(markup, /aria-hidden="true"/);
  const video = markup.match(/<video[^>]*>/)?.[0] ?? "";
  assert.ok(video, "renders a <video>");
  assert.ok(video.includes(`src="${SPLASH_SRC}"`), "uses the web copy of loading-flash");
  for (const attr of ['muted=""', 'autoplay=""', 'playsinline=""', 'preload="auto"']) {
    assert.ok(video.toLowerCase().includes(attr), attr);
  }
  assert.match(video, /object-contain landscape:object-cover/, "letterboxes on portrait, fills on landscape");
});

test("the web copy exists, is small, and is the trimmed tail of the ident", () => {
  const file = `public${SPLASH_SRC}`;
  const bytes = statSync(file).size;
  assert.ok(bytes > 100_000 && bytes < 2_500_000, `${file} should be a lightweight web copy (${bytes} bytes)`);
  const buf = readFileSync(file);
  assert.equal(buf.toString("latin1", 4, 8), "ftyp");
  // moov before mdat = faststart, so playback starts before the download finishes.
  assert.ok(buf.indexOf("moov") < buf.indexOf("mdat"), "faststart");
  const mvhd = buf.indexOf("mvhd");
  const timescale = buf.readUInt32BE(mvhd + 16);
  const duration = buf.readUInt32BE(mvhd + 20) / timescale;
  assert.ok(duration > 2 && duration < 3, `≈2.4s tail cut (16.6s → end), got ${duration.toFixed(2)}s`);
});

test("layout wires the splash, its stylesheet and the pre-paint session gate", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /<SplashScreen \/>/);
  assert.match(layout, /splash-screen\.css/);
  assert.ok(layout.includes("<script dangerouslySetInnerHTML={{ __html: splashGate }} />"));
  assert.ok(layout.includes("SPLASH_SESSION_KEY"), "gate reads the same session key as the component");
  assert.match(layout, /prefers-reduced-motion/);
  const css = readFileSync("src/components/layout/splash-screen.css", "utf8");
  assert.match(css, /html\[data-splash="seen"\] \.site-splash\s*\{\s*display:\s*none/);
  assert.equal(SPLASH_SESSION_KEY, "bardownski:splash-seen");
  const component = readFileSync("src/components/layout/SplashScreen.tsx", "utf8");
  assert.doesNotMatch(component, /usePathname|\/fc/, "opener is site-wide, not FC-only");
});
