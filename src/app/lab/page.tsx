import type { Metadata } from "next";
import Image from "next/image";
import { fetchChannelMessages, parseAllSeasons } from "@/lib/discord";
import { chelstatsToSeasonData } from "@/lib/chelstats";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getHockeySeason, HOCKEY_SEASON, HOCKEY_ARCHIVE_SEASON } from "@/lib/hockey-season";
import { buildComparisonSeasons } from "@/lib/player-comparison";
import LabTools from "./LabTools";
import { getAllMatchesForRecords } from "@/lib/match-history";
import { buildChemistryDataset } from "@/lib/line-chemistry";
import { buildGoalieDataset } from "@/lib/goalie-lines";
import { NHL27_IDENTITY } from "@/lib/nhl27-api";
import { buildLinePlayers, type LineDataset } from "@/components/lines/line-datasets";
import "./lab.css";
import "./comparison-lab.css";

// Archives stay read-only. Current stats and full matches come exclusively
// from the season pipeline; do not use an archive as its fallback.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Lab | Bardownski Hockey",
  description:
    "Build your Bardownski line, compare goalie support, explore chemistry and player grades, and compare teammates across seasons in the Player Lab.",
};

export default async function LabPage({ searchParams }: { searchParams: Promise<{ tool?: string }> }) {
  const { tool } = await searchParams;
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
    goalies: buildGoalieDataset(members, season.data?.matches ?? []),
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
    goalies: buildGoalieDataset(FROZEN_CHELSTATS.members, archivedMatches),
    sourceTotal: archiveChemistry.total,
    excluded: archiveChemistry.excluded,
  };

  return (
    <div className="player-lab">
      <header className="player-lab-header" aria-labelledby="player-lab-title">
        <div className="player-lab-hero-image">
          <Image src="/images/homepage/bench-wide.webp" alt="Bardownski teammates celebrating together at the bench" fill priority sizes="100vw" />
        </div>
        <div className="player-lab-hero-copy">
          <p className="player-lab-eyebrow">BARDOWNSKI HOCKEY / THE PLAYER LAB</p>
          <h1 id="player-lab-title">GOOD PLAYERS.<br /><em>BETTER TOGETHER.</em></h1>
          <p className="player-lab-intro">Build your line. Find the chemistry.<br />Choose a tool. Make your next move.</p>
          <a className="player-lab-hero-link" href="#lab-tools">Choose your tool <span aria-hidden="true">↘</span></a>
        </div>
        <span className="player-lab-hero-caption">THE RIGHT PLAYERS. THE RIGHT FIT.</span>
      </header>
      <LabTools current={currentLines} archive={archiveLines} seasons={comparisonSeasons}
        pendingSeason={pendingSeason} initialTool={tool === "comparison" ? "comparison" : "lines"} />
    </div>
  );
}
