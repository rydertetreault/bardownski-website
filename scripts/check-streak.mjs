/**
 * Compute what the matches page will show — visible matches + forfeits
 * (real + MANUAL_FORFEITS), sorted newest first, with the resulting
 * streak. Replicates the logic in MatchesClient.tsx so we can verify
 * before deploying.
 */
import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");

const redis = new Redis({
  url: get("UPSTASH_REDIS_REST_URL"),
  token: get("UPSTASH_REDIS_REST_TOKEN"),
});

const MANUAL_FORFEITS = [
  { id: "forfeit-1776024000-0", timestamp: 1776024000, date: "April 12, 2026" },
  { id: "forfeit-1776027600-1", timestamp: 1776027600, date: "April 12, 2026" },
  { id: "forfeit-1776031200-2", timestamp: 1776031200, date: "April 12, 2026" },
  { id: "forfeit-1776034800-3", timestamp: 1776034800, date: "April 12, 2026" },
  { id: "forfeit-1775937600-4", timestamp: 1775937600, date: "April 11, 2026" },
  { id: "forfeit-1776020400-5", timestamp: 1776020400, date: "April 12, 2026" },
  { id: "forfeit-win-850", timestamp: 1777246360, date: "April 26, 2026" },
  { id: "forfeit-win-851", timestamp: 1777246420, date: "April 26, 2026" },
  { id: "forfeit-win-852", timestamp: 1777246480, date: "April 26, 2026" },
  { id: "forfeit-win-853", timestamp: 1777246540, date: "April 26, 2026" },
  { id: "forfeit-win-854", timestamp: 1777246600, date: "April 26, 2026" },
];

const RETENTION_SECONDS = 21 * 24 * 60 * 60;
const cutoff = Math.floor(Date.now() / 1000) - RETENTION_SECONDS;

const matchesHash = await redis.hgetall("match-history:matches");
const forfeitsHash = await redis.hgetall("match-history:forfeits");
const allMatches = Object.values(matchesHash || {});
const storedForfeits = Object.values(forfeitsHash || {});

const visibleMatches = allMatches.filter((m) => m.timestamp >= cutoff);

const forfeitsById = new Map();
for (const f of storedForfeits) forfeitsById.set(f.id, f);
for (const f of MANUAL_FORFEITS) forfeitsById.set(f.id, f);
const visibleForfeits = [...forfeitsById.values()].filter((f) => f.timestamp >= cutoff);

const forfeitMatches = visibleForfeits.map((f) => ({
  id: f.id,
  timestamp: f.timestamp,
  date: f.date,
  opponent: "Forfeit",
  scoreUs: 1,
  scoreThem: 0,
  matchType: "regular",
  forfeit: true,
}));

const combined = [...visibleMatches, ...forfeitMatches];
combined.sort((a, b) => b.timestamp - a.timestamp);

console.log(`Visible matches: ${visibleMatches.length}, forfeits: ${visibleForfeits.length}`);
console.log(`Total visible: ${combined.length}\n`);

console.log("Newest -> oldest:");
for (const m of combined) {
  const r = m.scoreUs > m.scoreThem ? "W" : m.scoreUs < m.scoreThem ? "L" : "T";
  const ff = m.forfeit ? " (forfeit)" : "";
  const tag = m.matchType === "finals" ? " [FINALS]" : "";
  console.log(`  ${r}  ${m.date}  ${m.scoreUs}-${m.scoreThem} vs ${m.opponent}${tag}${ff}`);
}

let sType = null;
let sCount = 0;
for (let i = 0; i < combined.length; i++) {
  const m = combined[i];
  const r = m.scoreUs > m.scoreThem ? "W" : m.scoreUs < m.scoreThem ? "L" : null;
  if (!r) continue;
  if (sType === null) {
    sType = r;
    sCount = 1;
  } else if (r === sType) {
    sCount++;
  } else {
    break;
  }
}
console.log(`\nCURRENT STREAK: ${sCount}${sType}`);
