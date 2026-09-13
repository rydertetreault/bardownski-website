import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/match-detail";
import MatchReport from "../components/MatchReport";
import "../match-report.css";
import "../opponent-crest.css";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ season?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({ season: undefined }),
  ]);
  const requestedSeason = query.season;
  // Invalid or repeated tags are not an untagged request. The helper preserves
  // current-first legacy lookup and prevents explicit cross-season fallback.
  if (requestedSeason !== undefined && requestedSeason !== "2026-2027" && requestedSeason !== "2025-2026") {
    notFound();
  }
  const detail = await getMatchDetail(id, requestedSeason);
  if (!detail) notFound();
  const archive = detail.season === "2025-2026";

  return <div className="match-report-page">
    <nav className="match-report-page__nav" aria-label="Match navigation">
      <Link href={archive ? "/matches#archive" : "/matches#results"}>
        <span aria-hidden="true">←</span> Back to {archive ? "the archive" : "results"}
      </Link>
      <span>Bardownski Hockey / {archive ? "Season archive" : "Match centre"}</span>
    </nav>
    <MatchReport match={detail.match} season={detail.season} standalone titleId="match-report-title" />
  </div>;
}
