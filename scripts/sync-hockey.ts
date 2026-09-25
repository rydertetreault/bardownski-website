// The same verified pipeline used by the website, callable by hosted scheduling.
// No Next server, Discord, legacy sync, credentials in arguments, or site visit needed.
import { loadEnvConfig } from "@next/env";
import { refreshHockeyTracker } from "../src/lib/hockey-tracker";
import { fetchNhl27Snapshot, NHL27_IDENTITY } from "../src/lib/nhl27-api";

loadEnvConfig(process.cwd());
// The upstream feed is intermittently flaky; retry transient transport failures once.
// Schema/parse failures are not retried. Worst case (20s + 3s + 20s) fits the 60s lease.
const TRANSIENT = /timed out|network request unsuccessful|HTTP (408|425|429|5\d\d)|not valid JSON/;
async function fetchWithRetry() {
  try { return await fetchNhl27Snapshot(); }
  catch (error) {
    if (!(error instanceof Error && TRANSIENT.test(error.message))) throw error;
    console.warn(`NHL27 fetch attempt 1 failed (${error.message}); retrying in 3s.`);
    await new Promise(resolve => setTimeout(resolve, 3_000));
    return fetchNhl27Snapshot();
  }
}
async function main() {
  const result = await refreshHockeyTracker({force:true, fetchSnapshot:fetchWithRetry});
  console.log(JSON.stringify({
    status:result.status, synced:result.synced, identity:NHL27_IDENTITY,
    storedMatches:result.matches.length, totalGames:result.snapshot?.data.clubStats.totalGames ?? null,
    mvpRankings:result.snapshot?.awards?.seasonMvp.length ?? 0,
    weeklyRankings:result.snapshot?.awards?.currentWeek.standings.length ?? 0,
    weeklyObservedGames:result.snapshot?.awards?.currentWeek.games ?? 0,
    weeklyLeaders:result.snapshot?.awards?.currentWeek.leaders.map(player=>({name:player.name,eligible:player.eligible,games:player.games})) ?? [],
    fetchedAt:result.snapshot?.fetchedAt ?? null, syncedAt:result.snapshot?.syncedAt ?? null,
    ...(result.error ? {error:result.error} : {}),
    ...(result.reason ? {reason:result.reason} : {}),
  },null,2));
  if (result.status !== "connected") process.exitCode = 1;
}
main().catch(() => { console.error("NHL27 collector failed; no credentials or upstream payload logged."); process.exitCode=1; });
