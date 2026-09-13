import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hockeyStateFromTracker, HOCKEY_SEASON, HOCKEY_ANNOUNCEMENT, hockeyTrackingLabel } from "../src/lib/hockey-season";
import { FROZEN_CHELSTATS, FROZEN_SEASON_LABEL } from "../src/lib/chelstats-frozen";
import { chelstatsToSeasonData, computeMvpOddsFromMembers } from "../src/lib/chelstats";

async function test() {
  const season = hockeyStateFromTracker({status:"unavailable",snapshot:null,matches:[],synced:false,error:"Test source unavailable"});
  const members = season.data?.members ?? [];
  assert.equal(season.season, "2026–2027");
  assert.equal(season.status, "unavailable");
  assert.equal(season.data, null, "Never use frozen totals as a current-season fallback");
  assert.deepEqual(season.matches, []);
  assert.equal(season.updatedAt, null);
  assert.equal(hockeyTrackingLabel(season), "Tracking temporarily unavailable");
  assert.deepEqual(computeMvpOddsFromMembers(members), []);
  assert.equal(HOCKEY_ANNOUNCEMENT.videoSrc, null, "Do not publish last year's video as the new announcement");
  assert.ok(readFileSync(`public${HOCKEY_ANNOUNCEMENT.poster}`).length > 0);

  const archive = chelstatsToSeasonData(FROZEN_CHELSTATS.members);
  assert.equal(archive.season, "2025");
  assert.equal(archive.stats.date, FROZEN_SEASON_LABEL);
  assert.equal(archive.stats.points[0].value, 1410);
  const current = chelstatsToSeasonData([], { season: HOCKEY_SEASON, date: "Test snapshot" });
  assert.equal(current.season, HOCKEY_SEASON);
  assert.equal(current.stats.date, "Test snapshot");
  assert.deepEqual(current.stats.points, []);
  assert.deepEqual(current.stats.roster, []);
  assert.equal(FROZEN_CHELSTATS.clubStats.record, "207-144-15");

  // Shared base tokens must remain FC's original palette. Hockey is scoped.
  const base = readFileSync("src/app/globals.css", "utf8");
  assert.match(base, /--gold: #d4b77b;/);
  assert.match(base, /--background: #0b0f1a;/);
  const theme = readFileSync("src/app/hockey-theme.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(theme, /:root\s*\{/);
  assert.match(theme, /\.hockey-site\s*\{/);
  const home = readFileSync("src/app/page.tsx", "utf8");
  assert.match(home, /return <HomepageClient\b/);
  assert.doesNotMatch(home, /HomeRankings|HeroSection|fetchChelstatsData|club-hub|HOCKEY_ARTWORK/);
  console.log("Hockey rollover: empty current-season state, archive integrity, explicit snapshot labels, announcement readiness and FC token isolation passed.");
}

test().catch(error => { console.error(error); process.exitCode = 1; });
