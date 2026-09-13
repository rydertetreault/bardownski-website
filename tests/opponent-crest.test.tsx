import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import OpponentCrest from "../src/app/matches/components/OpponentCrest";
import MatchesClient from "../src/app/matches/MatchesClient";
import MatchReport from "../src/app/matches/components/MatchReport";
import type { Match } from "../src/types";
import { FROZEN_CHELSTATS } from "../src/lib/chelstats-frozen";
import { HOCKEY_SEASON, type HockeySeasonState } from "../src/lib/hockey-season-state";

const match: Match = {
  id: "crest-match", timestamp: 20, date: "September 13, 2026", opponent: "The Christiansss",
  opponentClubId: "18582", opponentCrest: { crestAssetId: "776", useBaseAsset: true },
  homeAway: "home", status: "final", scoreUs: 6, scoreThem: 3,
};

test("crest uses the exact base-asset URL with fixed dimensions and color-logo exemption", () => {
  const html = renderToStaticMarkup(<OpponentCrest opponent={match.opponent} crest={match.opponentCrest} />);
  assert.match(html, /src="https:\/\/chelstats\.app\/api\/crest\/776\?base=1"/);
  assert.match(html, /data-brand-mark="true"/);
  assert.match(html, /width="128" height="128"/);
  assert.match(html, /referrerPolicy="no-referrer"/i);
  assert.match(html, /data-crest-state="loading"/);
  assert.match(html, /opponent-crest__fallback">TH/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /_next\/image|srcset/);
});

test("missing or invalid crest has initials only, never a made-up or arbitrary image", () => {
  for (const crest of [undefined, { crestAssetId: "https://untrusted.test/logo", useBaseAsset: true }, { crestAssetId: "../102", useBaseAsset: false }]) {
    const html = renderToStaticMarkup(<OpponentCrest opponent="Chilliwack Heat" crest={crest} />);
    assert.match(html, /data-crest-state="missing"/);
    assert.match(html, /opponent-crest__fallback">CH/);
    assert.doesNotMatch(html, /<img|https:/);
  }
  assert.match(renderToStaticMarkup(<OpponentCrest opponent=" " />), />VS</);
});

test("both report modes and latest-match hero use opponent crest while keeping our B logo", () => {
  const season: HockeySeasonState = {
    season: HOCKEY_SEASON, status: "connected", syncedAt: null, updatedAt: "2026-09-13T12:00:00Z",
    coverage: { storedMatches: 1, totalGames: 1 }, matches: [match],
    data: { ...FROZEN_CHELSTATS, clubStats: { ...FROZEN_CHELSTATS.clubStats, wins: 1, losses: 0, otl: 0, totalGames: 1 } },
  };
  for (const element of [
    <MatchesClient key="hub" season={season} archivedMatches={[]} archivedRecord={null} />,
    <MatchReport key="embedded" match={match} season="2026-2027" />,
    <MatchReport key="standalone" match={match} season="2026-2027" standalone />,
  ]) {
    const html = renderToStaticMarkup(element);
    assert.match(html, /api\/crest\/776\?base=1/);
    assert.match(html, /B-logo.png/);
    assert.match(html, /The Christiansss/);
    assert.doesNotMatch(html, /api\/crest\/18582|api\/crest\/102/);
  }
});

test("legacy archive reports without saved crest metadata remain readable", () => {
  const html = renderToStaticMarkup(<MatchReport match={{ ...match, opponentCrest: undefined, opponentClubId: undefined }} season="2025-2026" />);
  assert.match(html, /data-crest-state="missing"/);
  assert.match(html, /opponent-crest__fallback">TH/);
  assert.doesNotMatch(html, /chelstats\.app\/api\/crest/);
});
