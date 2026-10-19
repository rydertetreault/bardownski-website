#!/usr/bin/env node
// Screenshot a page in headless Chromium and (optionally) ask an OpenRouter vision
// model what it shows. Lets an agent without image input "see" the rendered site.
//
//   node scripts/screenshot-review.mjs <url> [--width 1440] [--height 1000]
//        [--scroll ".css-selector"] [--full] [--out /tmp/shot.png]
//        [--ask "question about the screenshot"] [--model google/gemini-2.5-flash]
//
// Key: OPENROUTER_API_KEY env var, else ~/.synaps-cli/auth.json -> openrouter.key.
// The key is never printed. Chromium: CHROME env var, else the newest Playwright
// cache build in ~/.cache/ms-playwright. No npm dependencies (uses CDP over WebSocket).
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const flag = name => args.includes(`--${name}`);
if (!url) { console.error("usage: node scripts/screenshot-review.mjs <url> [--width N] [--scroll sel] [--full] [--out file] [--ask question]"); process.exit(2); }
const width = Number(opt("width", 1440)), height = Number(opt("height", 1000));
const out = opt("out", "/tmp/screenshot.png");

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = join(homedir(), ".cache/ms-playwright");
  const builds = existsSync(base) ? readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const b of builds) for (const p of ["chrome-linux64/chrome", "chrome-linux/chrome"]) if (existsSync(join(base, b, p))) return join(base, b, p);
  throw new Error("No Chromium found; set CHROME=/path/to/chrome");
}
function openRouterKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try { return JSON.parse(readFileSync(join(homedir(), ".synaps-cli/auth.json"), "utf8")).openrouter?.key ?? null; } catch { return null; }
}

const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const chrome = spawn(findChrome(), ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
try {
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page")?.webSocketDebuggerUrl; }
    catch { await new Promise(r => setTimeout(r, 200)); }
  }
  if (!wsUrl) throw new Error("Chromium did not start");
  const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.enable");
  await send("Page.navigate", { url });
  await new Promise(r => setTimeout(r, Number(opt("wait", 5000))));
  const scroll = opt("scroll");
  if (scroll) { await send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(scroll)})?.scrollIntoView({block:"start"}); scrollBy(0,-80)` }); await new Promise(r => setTimeout(r, 1500)); }
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: flag("full") });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(`screenshot: ${out} (${width}x${height}${flag("full") ? ", full page" : ""})`);
  ws.close();

  const ask = opt("ask");
  if (ask) {
    const key = openRouterKey();
    if (!key) throw new Error("No OpenRouter key (OPENROUTER_API_KEY or ~/.synaps-cli/auth.json openrouter.key)");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: opt("model", "google/gemini-2.5-flash"), messages: [{ role: "user", content: [
        { type: "text", text: ask },
        { type: "image_url", image_url: { url: `data:image/png;base64,${shot.result.data}` } },
      ] }] }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${body.error?.message ?? "request failed"}`);
    console.log(`\n--- ${body.model} ---\n${body.choices?.[0]?.message?.content ?? "(no content)"}`);
  }
} finally { chrome.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} }
