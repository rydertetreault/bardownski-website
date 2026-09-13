// The same verified pipeline used by the website, callable by hosted scheduling.
// No Next server, Discord, legacy sync, credentials in arguments, or site visit needed.
import { loadEnvConfig } from "@next/env";
import { refreshHockeyTracker } from "../src/lib/hockey-tracker";
import { NHL27_IDENTITY } from "../src/lib/nhl27-api";

loadEnvConfig(process.cwd());
async function main() {
  const result = await refreshHockeyTracker({force:true});
  console.log(JSON.stringify({
    status:result.status, synced:result.synced, identity:NHL27_IDENTITY,
    storedMatches:result.matches.length, totalGames:result.snapshot?.data.clubStats.totalGames ?? null,
    fetchedAt:result.snapshot?.fetchedAt ?? null, syncedAt:result.snapshot?.syncedAt ?? null,
    ...(result.error ? {error:result.error} : {}),
  },null,2));
  if (result.status !== "connected") process.exitCode = 1;
}
main().catch(() => { console.error("NHL27 collector failed; no credentials or upstream payload logged."); process.exitCode=1; });
