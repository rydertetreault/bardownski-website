import Link from "next/link";
import type { Metadata } from "next";
import {
  fetchFcStatsData,
  computeFcForm,
  buildFcNews,
  positionLabel,
} from "@/lib/fcstats";
import {
  FC,
  FcSectionHeading,
  FcResultBadge,
  FcFormGuide,
  FcStatCard,
  FcViewAllLink,
  FcDataUnavailable,
} from "@/components/fc/FcUI";
import FcHero from "@/components/fc/FcHero";
import FcNewsCard from "@/components/fc/FcNewsCard";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Bardownski FC | EA FC 26 Pro Clubs",
  description:
    "Official website of Bardownski FC — EA FC 26 Pro Clubs. Live club stats, fixtures, squad, news and highlights.",
};

export default async function FcHomePage() {
  const data = await fetchFcStatsData();
  const news = data ? buildFcNews(data) : [];
  const form = data ? computeFcForm(data.matches, 5) : [];
  const latest = data?.matches[0] ?? null;
  const leaders = data
    ? [...data.members].sort((a, b) => b.points - a.points || b.ratingAve - a.ratingAve).slice(0, 3)
    : [];

  return (
    <div style={{ backgroundColor: FC.bg }}>
      {/* ── Full-height hero with video background ── */}
      <FcHero
        record={data?.clubStats.record ?? null}
        skillRating={data?.clubStats.skillRating ?? null}
      />

      {/* ── Latest result + form strip (PL matchday bar) ── */}
      <div
        className="relative border-y"
        style={{ backgroundColor: FC.bgDark, borderColor: "var(--fc-border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {latest ? (
            <Link href="/fc/fixtures" className="flex items-center gap-4 group">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 hidden md:block">
                Latest Result
              </span>
              <FcResultBadge result={latest.result} forfeit={latest.forfeit} />
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white group-hover:underline">
                  Bardownski FC
                </span>
                <span className="text-xl font-black tabular-nums" style={{ color: FC.goldLight }}>
                  {latest.scoreUs}
                </span>
                <span className="text-white/30">–</span>
                <span className="text-xl font-black tabular-nums text-white/70">
                  {latest.scoreThem}
                </span>
                <span className="text-sm font-bold text-white/70">{latest.opponent}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/30 hidden lg:block">
                {latest.date} · {latest.matchType}
              </span>
            </Link>
          ) : (
            <span className="text-sm text-white/40">No recent matches</span>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Form</span>
            <FcFormGuide form={form} />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!data ? (
          <FcDataUnavailable />
        ) : (
          <>
            {/* ── Club stat cards ── */}
            <section className="mb-16">
              <FcSectionHeading right={<FcViewAllLink href="/fc/stats">Stats Centre</FcViewAllLink>}>
                Season at a Glance
              </FcSectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <FcStatCard label="Record" value={data.clubStats.record} sub="W-L-D" />
                <FcStatCard
                  label="Goals For"
                  value={data.clubStats.goals}
                  sub={`${data.clubStats.goalsPerGame}/game`}
                />
                <FcStatCard
                  label="Goals Against"
                  value={data.clubStats.goalsAgainst}
                  sub={`${data.clubStats.goalsAgainstPerGame}/game`}
                />
                <FcStatCard label="Games Played" value={data.clubStats.totalGames} />
                <FcStatCard
                  label="Promotions"
                  value={data.clubStats.promotions}
                  sub={`${data.clubStats.relegations} relegations`}
                />
                <FcStatCard label="Skill Rating" value={data.clubStats.skillRating} />
              </div>
            </section>

            {/* ── Latest news ── */}
            <section className="mb-16">
              <FcSectionHeading right={<FcViewAllLink href="/fc/news">All News</FcViewAllLink>}>
                Latest News
              </FcSectionHeading>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {news.slice(0, 3).map((item) => (
                  <FcNewsCard key={item.id} item={item} />
                ))}
              </div>
            </section>

            {/* ── Two-column: leaders + recent results ── */}
            <div className="grid lg:grid-cols-2 gap-10 mb-16">
              <section>
                <FcSectionHeading right={<FcViewAllLink href="/fc/squad">Full Squad</FcViewAllLink>}>
                  Top Performers
                </FcSectionHeading>
                <div className="flex flex-col gap-3">
                  {leaders.map((m, i) => (
                    <Link
                      key={m.gamertag}
                      href={`/fc/stats?player=${encodeURIComponent(m.gamertag)}`}
                      className="flex items-center gap-4 rounded-xl px-5 py-4 transition-transform hover:scale-[1.01]"
                      style={{
                        backgroundColor: FC.card,
                        border: `1px solid var(--fc-border)`,
                      }}
                    >
                      <span
                        className="text-2xl font-black w-8 shrink-0 tabular-nums"
                        style={{ color: i === 0 ? FC.gold : "rgba(255,255,255,0.2)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white">{m.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/35">
                          {positionLabel(m.position)}
                          {m.proName ? ` · "${m.proName}"` : ""} · {m.gamesPlayed} apps
                        </div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0 tabular-nums">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{m.goals}</div>
                          <div className="text-[9px] uppercase tracking-wider text-white/35">Goals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{m.assists}</div>
                          <div className="text-[9px] uppercase tracking-wider text-white/35">Assists</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold" style={{ color: FC.goldLight }}>
                            {m.points}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-white/35">Pts</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section>
                <FcSectionHeading
                  right={<FcViewAllLink href="/fc/fixtures">All Fixtures</FcViewAllLink>}
                >
                  Recent Results
                </FcSectionHeading>
                <div className="flex flex-col gap-2">
                  {data.matches.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-4 rounded-lg px-4 py-3"
                      style={{ backgroundColor: FC.card, border: `1px solid var(--fc-border)` }}
                    >
                      <FcResultBadge result={m.result} forfeit={m.forfeit} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          vs {m.opponent}
                        </div>
                        <div className="text-[11px] text-white/40 uppercase tracking-wider">
                          {m.date} · {m.matchType}
                          {m.forfeit ? " · forfeit" : ""}
                        </div>
                      </div>
                      <div className="text-lg font-bold tabular-nums shrink-0">
                        <span style={{ color: m.result === "W" ? FC.goldLight : "#ffffff" }}>
                          {m.scoreUs}
                        </span>
                        <span className="text-white/30 mx-1">–</span>
                        <span className="text-white/70">{m.scoreThem}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── Highlights promo ── */}
            <section className="mb-16">
              <Link
                href="/fc/highlights"
                className="group relative block rounded-2xl overflow-hidden"
                style={{ border: `1px solid var(--fc-border)` }}
              >
                <div className="relative h-64 sm:h-80">
                  <Image
                    src="/fc/images/fc-highlight-1-poster.webp"
                    alt="Bardownski FC highlights"
                    fill
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(20,21,24,0.95) 0%, rgba(20,21,24,0.6) 50%, rgba(20,21,24,0.3) 100%)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-8 sm:px-14">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-[2px] rounded-full" style={{ backgroundColor: FC.gold }} />
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.3em]"
                          style={{ color: FC.gold }}
                        >
                          Club Media
                        </span>
                      </div>
                      <h3 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">
                        WATCH THE <span style={{ color: FC.gold }}>HIGHLIGHTS</span>
                      </h3>
                      <span
                        className="inline-flex items-center gap-2 px-6 py-3 rounded text-xs font-bold uppercase tracking-widest transition-all group-hover:brightness-110"
                        style={{ backgroundColor: FC.gold, color: "#141414" }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play Reel
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </section>

            {/* ── Gallery strip ── */}
            <section>
              <FcSectionHeading right={<FcViewAllLink href="/fc/gallery">Full Gallery</FcViewAllLink>}>
                From the Pitch
              </FcSectionHeading>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[3, 7, 11, 17, 22, 26].map((n) => (
                  <Link
                    key={n}
                    href="/fc/gallery"
                    className="group relative aspect-[9/16] rounded-lg overflow-hidden"
                    style={{ border: `1px solid var(--fc-border)` }}
                  >
                    <Image
                      src={`/fc/images/gallery/fc-still-${String(n).padStart(2, "0")}.webp`}
                      alt="Bardownski FC gameplay"
                      fill
                      sizes="(max-width: 640px) 33vw, 16vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
