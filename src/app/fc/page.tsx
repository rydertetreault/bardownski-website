import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchFcStatsData } from "@/lib/fcstats";
import type { FcClubMatch, FcClubMember } from "@/lib/fcstats";

export const metadata: Metadata = {
  title: "Bardownski FC | EA FC 26 Pro Clubs",
  description:
    "Live club stats, player leaderboards and match history for Bardownski FC — EA FC 26 Pro Clubs.",
};

/* ── Theme: grey / white / gold ─────────────────────────────────────── */
const GOLD = "#c9a227";
const GOLD_LIGHT = "#e6c964";
const GREY_BG = "#1b1d21";
const GREY_CARD = "#24272c";
const GREY_BORDER = "rgba(255,255,255,0.08)";

function ResultBadge({ result, forfeit }: { result: string; forfeit: boolean }) {
  const color =
    result === "W" ? GOLD : result === "L" ? "rgba(255,255,255,0.35)" : "#9aa0a8";
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
      style={{
        color: result === "W" ? "#141414" : "#ffffff",
        backgroundColor: result === "W" ? color : "rgba(255,255,255,0.08)",
        border: `1px solid ${result === "W" ? color : GREY_BORDER}`,
      }}
      title={forfeit ? "Forfeit" : undefined}
    >
      {result}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{ backgroundColor: GREY_CARD, border: `1px solid ${GREY_BORDER}` }}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span className="text-3xl font-bold" style={{ color: GOLD_LIGHT }}>
        {value}
      </span>
      {sub && <span className="text-xs text-white/40">{sub}</span>}
    </div>
  );
}

function MatchRow({ match }: { match: FcClubMatch }) {
  return (
    <div
      className="flex items-center gap-4 rounded-lg px-4 py-3"
      style={{ backgroundColor: GREY_CARD, border: `1px solid ${GREY_BORDER}` }}
    >
      <ResultBadge result={match.result} forfeit={match.forfeit} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">
          vs {match.opponent}
        </div>
        <div className="text-[11px] text-white/40 uppercase tracking-wider">
          {match.date} · {match.matchType}
          {match.forfeit ? " · forfeit" : ""}
        </div>
      </div>
      <div className="text-lg font-bold tabular-nums shrink-0">
        <span style={{ color: match.result === "W" ? GOLD_LIGHT : "#ffffff" }}>
          {match.scoreUs}
        </span>
        <span className="text-white/30 mx-1">–</span>
        <span className="text-white/70">{match.scoreThem}</span>
      </div>
    </div>
  );
}

function LeaderboardTable({ members }: { members: FcClubMember[] }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: GREY_CARD, border: `1px solid ${GREY_BORDER}` }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-[10px] uppercase tracking-[0.15em] text-white/40"
              style={{ borderBottom: `1px solid ${GREY_BORDER}` }}
            >
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium text-right">GP</th>
              <th className="px-3 py-3 font-medium text-right">G</th>
              <th className="px-3 py-3 font-medium text-right">A</th>
              <th className="px-3 py-3 font-medium text-right">Pts</th>
              <th className="px-3 py-3 font-medium text-right">Rating</th>
              <th className="px-3 py-3 font-medium text-right">MOTM</th>
              <th className="px-3 py-3 font-medium text-right hidden sm:table-cell">
                Pass%
              </th>
              <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                OVR
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr
                key={m.gamertag}
                style={{
                  borderBottom:
                    i < members.length - 1 ? `1px solid ${GREY_BORDER}` : "none",
                }}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{m.name}</div>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider">
                    {m.position}
                    {m.proName ? ` · "${m.proName}"` : ""}
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-white/70">
                  {m.gamesPlayed}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-white/70">
                  {m.goals}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-white/70">
                  {m.assists}
                </td>
                <td
                  className="px-3 py-3 text-right tabular-nums font-bold"
                  style={{ color: GOLD_LIGHT }}
                >
                  {m.points}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-white/70">
                  {m.ratingAve.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-white/70">
                  {m.manOfTheMatch}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-white/70 hidden sm:table-cell">
                  {m.passSuccessRate}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white/70 hidden sm:table-cell">
                  {m.proOverall}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function FcPage() {
  const data = await fetchFcStatsData();

  return (
    <div className="min-h-screen pt-24 pb-20" style={{ backgroundColor: GREY_BG }}>
      {/* Subtle gold radial accents */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.06]"
          style={{
            background: `radial-gradient(circle at top right, ${GOLD} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.04]"
          style={{
            background: `radial-gradient(circle at bottom left, ${GOLD} 0%, transparent 70%)`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        {/* ── Hero header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 relative overflow-hidden rounded">
                <Image
                  src="/images/logo/BD - logo.png"
                  alt="Bardownski FC"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  BARDOWNSKI{" "}
                  <span style={{ color: GOLD }}>FC</span>
                </h1>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mt-1">
                  EA FC 26 · Pro Clubs · Live Stats
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Hockey
          </Link>
        </div>

        {!data ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ backgroundColor: GREY_CARD, border: `1px solid ${GREY_BORDER}` }}
          >
            <p className="text-white/60">
              Live stats are temporarily unavailable. Check back shortly.
            </p>
          </div>
        ) : (
          <>
            {/* ── Club stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
              <StatCard label="Record" value={data.clubStats.record} sub="W-L-D" />
              <StatCard label="Goals For" value={data.clubStats.goals} sub={`${data.clubStats.goalsPerGame}/game`} />
              <StatCard label="Goals Against" value={data.clubStats.goalsAgainst} sub={`${data.clubStats.goalsAgainstPerGame}/game`} />
              <StatCard label="Games Played" value={data.clubStats.totalGames} />
              <StatCard label="Promotions" value={data.clubStats.promotions} sub={`${data.clubStats.relegations} relegations`} />
              <StatCard label="Skill Rating" value={data.clubStats.skillRating} />
            </div>

            {/* ── Two-column: leaderboard + matches ── */}
            <div className="grid lg:grid-cols-5 gap-10">
              <section className="lg:col-span-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-white/60 mb-4 flex items-center gap-3">
                  <span
                    className="w-8 h-[2px] rounded-full"
                    style={{ backgroundColor: GOLD }}
                  />
                  Player Leaderboard
                </h2>
                <LeaderboardTable members={data.members} />
              </section>

              <section className="lg:col-span-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-white/60 mb-4 flex items-center gap-3">
                  <span
                    className="w-8 h-[2px] rounded-full"
                    style={{ backgroundColor: GOLD }}
                  />
                  Recent Matches
                </h2>
                <div className="flex flex-col gap-2">
                  {data.matches.length === 0 ? (
                    <div
                      className="rounded-lg p-6 text-center text-sm text-white/40"
                      style={{ backgroundColor: GREY_CARD, border: `1px solid ${GREY_BORDER}` }}
                    >
                      No recent matches.
                    </div>
                  ) : (
                    data.matches
                      .slice(0, 12)
                      .map((m) => <MatchRow key={m.id} match={m} />)
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
