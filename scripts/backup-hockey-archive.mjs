// Explicit, one-time read-only export of the legacy archive before NHL27 sync.
// Never resets/repairs source keys; resulting JSON contains hockey data, no secrets.
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { Redis } from "@upstash/redis";
import { mkdir, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
loadEnvConfig(process.cwd());
const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) throw new Error("Archive export requires configured Redis credentials");
const file = "src/lib/archives/nhl26-match-history.json";
try { await access(file); throw new Error("Archive export already exists; refusing overwrite"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const redis = new Redis({ url, token });
const [matches, forfeits, meta] = await Promise.all([
  redis.hgetall("match-history:matches"), redis.hgetall("match-history:forfeits"), redis.get("match-history:meta"),
]);
const values = Object.values(matches ?? {}).map(value => typeof value === "string" ? JSON.parse(value) : value).sort((a,b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
if (!values.length || values.some(match => !match.id || match.timestamp < Date.UTC(2025, 7, 1)/1000 || match.timestamp >= Date.UTC(2026, 8, 1)/1000)) throw new Error("Archive date/identity boundary requires inspection before export");
const hash = createHash("sha256").update(JSON.stringify(values)).digest("hex");
const backup = { season: "2025–2026", gameTitle: "NHL26", clubId: "149602", exportedAt: new Date().toISOString(), source: "Preserved match-history:matches; frozen archive, not current season", sha256: hash, matches: values, forfeits: forfeits ?? {}, originalMeta: meta };
await mkdir("src/lib/archives", { recursive: true });
await writeFile(file, JSON.stringify(backup, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ file, matches: values.length, sha256: hash, sourceWrites: 0 }));
