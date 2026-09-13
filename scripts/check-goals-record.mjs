import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env
    .match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");

const redis = new Redis({
  url: get("UPSTASH_REDIS_REST_URL"),
  token: get("UPSTASH_REDIS_REST_TOKEN"),
});

const matchesHash = await redis.hgetall("match-history:matches");
const allMatches = Object.values(matchesHash || {}).filter((m) => !m.forfeit);

let mostTeam = { value: 0, match: null };
let mostPlayer = { value: 0, name: "", match: null };
for (const m of allMatches) {
  if (m.scoreUs > mostTeam.value) mostTeam = { value: m.scoreUs, match: m };
  for (const p of m.players || []) {
    if (!p.isOurPlayer) continue;
    if (p.goals > mostPlayer.value) {
      mostPlayer = { value: p.goals, name: p.name, match: m };
    }
  }
}

console.log(`Matches scanned: ${allMatches.length}`);
console.log(
  `\nMost team goals in one game: ${mostTeam.value}` +
    (mostTeam.match
      ? `  (${mostTeam.match.scoreUs}-${mostTeam.match.scoreThem} vs ${mostTeam.match.opponent}, ${mostTeam.match.date})`
      : "")
);
console.log(
  `Most player goals in one game: ${mostPlayer.value} by ${mostPlayer.name}` +
    (mostPlayer.match
      ? `  (vs ${mostPlayer.match.opponent}, ${mostPlayer.match.date})`
      : "")
);
