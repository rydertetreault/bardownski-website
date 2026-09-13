import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:tsx?|jsx?|css|json|svg)$/.test(path) ? [path] : [];
  });
}

test("club logo treatments never use a text BD. substitute", () => {
  for (const path of sourceFiles("src")) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /(?:>|["'`])\s*BD\.\s*(?:<|["'`])/, path);
  }
});

test("news masthead and missing-image treatment use the official B artwork", () => {
  const logo = "/images/logo/B-logo.png";
  assert.ok(existsSync(`public${logo}`));
  const page = readFileSync("src/app/news/page.tsx", "utf8");
  const client = readFileSync("src/app/news/NewsClient.tsx", "utf8");
  assert.ok(page.includes(`className="news-masthead-mark" src="${logo}"`));
  assert.ok(client.includes(`className="news-fallback-logo"><Image src="${logo}"`));
});
