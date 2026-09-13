import type { Metadata } from "next";
import { fetchChannelMessages, parseAllSeasons } from "@/lib/discord";
import { chelstatsToSeasonData } from "@/lib/chelstats";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getHockeySeason, HOCKEY_SEASON, HOCKEY_ARCHIVE_SEASON } from "@/lib/hockey-season";
import { buildComparisonSeasons } from "@/lib/player-comparison";
import { HeadToHeadCard } from "./components/HeadToHeadCard";
import { getAllMatchesForRecords } from "@/lib/match-history";
import { buildChemistryDataset } from "@/lib/line-chemistry";
import { NHL27_IDENTITY } from "@/lib/nhl27-api";
import { buildLinePlayers, type LineDataset } from "@/components/lines/line-datasets";
import LineSeasonSelector from "@/components/lines/LineSeasonSelector";
import { TrackingNotice } from "@/components/season/SeasonTracking";
import "./lab.css";
import "./comparison-lab.css";

// Archives stay read-only. Current stats and full matches come exclusively
// from the season pipeline; do not use an archive as its fallback.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Lab | Bardownski Hockey",
  description:
    "Compare hockey players across seasons with radar, bars, scatter and trend charts. A dedicated workspace for player analysis and line planning.",
};

export default async function LabPage() {
  const [messages, season, archivedMatches] = await Promise.all([
    fetchChannelMessages(),
    getHockeySeason(),
    getAllMatchesForRecords(FROZEN_CHELSTATS),
  ]);
  const historical = parseAllSeasons(messages).filter((s) => s.season !== "2025");
  const archives = [
    chelstatsToSeasonData(FROZEN_CHELSTATS.members),
    ...historical,
  ];
  const members = season.data?.members ?? [];
  const currentStats =
    (season.status === "connected" || season.status === "stale")
      ? chelstatsToSeasonData(members, {
          season: HOCKEY_SEASON,
          date: season.updatedAt,
        })
      : null;
  const comparisonSeasons = buildComparisonSeasons([
    ...(currentStats ? [currentStats] : []),
    ...archives,
  ]);
  const pendingSeason =
    season.status === "awaiting-setup" ? HOCKEY_SEASON : undefined;

  const currentChemistry = buildChemistryDataset(season.data?.matches ?? [], []);
  const archiveChemistry = buildChemistryDataset(archivedMatches);
  const currentLines: LineDataset = {
    id: NHL27_IDENTITY.storageKey,
    season: HOCKEY_SEASON,
    kind: "current",
    totalGames: season.coverage.totalGames,
    games: currentChemistry.games,
    players: buildLinePlayers(members, currentChemistry.games, "current"),
    sourceTotal: currentChemistry.total,
    excluded: currentChemistry.excluded,
  };
  const archiveLines: LineDataset = {
    id: "hockey:nhl26:2025-2026:common-gen5:149602",
    season: HOCKEY_ARCHIVE_SEASON,
    kind: "archive",
    totalGames: FROZEN_CHELSTATS.clubStats.totalGames,
    games: archiveChemistry.games,
    players: buildLinePlayers(FROZEN_CHELSTATS.members, archiveChemistry.games, "archive"),
    sourceTotal: archiveChemistry.total,
    excluded: archiveChemistry.excluded,
  };

  return (
    <div className="player-lab">
      <header className="player-lab-header">
        <div>
          <p className="player-lab-eyebrow">BARDOWNSKI HOCKEY / ANALYSIS</p>
          <h1>Player lab</h1>
          <p className="player-lab-intro">
            Study the player. Compare the seasons. Find the fit.
          </p>
        </div>
        <p className="player-lab-context">
          The final 2025–2026 snapshot and older Discord seasons stay in the
          archive. Current-season numbers use the verified feed or its last saved
          snapshot, with freshness shown below.
        </p>
      </header>
      <nav className="player-lab-nav" aria-label="Player lab sections">
        <a href="#comparison">01 / Player comparison</a>
        <a href="#lines">02 / Lines &amp; chemistry</a>
      </nav>
      <TrackingNotice state={season} />
      <HeadToHeadCard
        seasons={comparisonSeasons}
        pendingSeason={pendingSeason}
      />
      <LineSeasonSelector current={currentLines} archive={archiveLines} />
    </div>
  );
}
