import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchChannelMessages, parseAllSeasons } from "@/lib/discord";
import { chelstatsToSeasonData } from "@/lib/chelstats";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getHockeySeason, HOCKEY_SEASON } from "@/lib/hockey-season";
import { TopPerformers, MvpTracker, TrackingNotice } from "@/components/season/SeasonTracking";
import StatsClient from "./StatsClient";
import "./stats.css";

// Do not freeze a build-time unavailable/stale tracker state into this page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "2026–2027 Stats & MVP Tracker | Bardownski Hockey",
  description: "The new-season stat book: top performers, player statistics and MVP tracking. Explore 2025–2026 and older statistics in the separate archive.",
};

export default async function StatsPage() {
  const [messages, season] = await Promise.all([fetchChannelMessages(), getHockeySeason()]);
  const historical = parseAllSeasons(messages).filter(s => s.season !== "2025");
  const archives = [chelstatsToSeasonData(FROZEN_CHELSTATS.members), ...historical];
  const members = season.data?.members ?? [];
  const currentStats = (season.status === "connected" || season.status === "stale") ? chelstatsToSeasonData(members, { season: HOCKEY_SEASON, date: season.updatedAt }) : null;
  return <div className="stats-edition">
    <header className="stats-hero">
      <div><p className="stats-eyebrow">THE LEGACY EDITION · STATISTICS</p><h1>THE GAME.<br /><em>BY NUMBERS.</em></h1><p className="stats-intro">Every point earned. Every save made.<br />The players behind the numbers, and the numbers behind the team.</p><a className="stats-button" href="#numbers">Explore player stats ↘</a><p className="stats-caption">BARDOWNSKI <span>/</span> THE STAT BOOK</p></div>
      <figure><Image src="/images/gallery/screenshots/Screenshot 2026-03-16 183710.webp" alt="An overhead view of the Bardownski goaltender defending the crease" fill priority sizes="(max-width: 850px) 100vw, 50vw" /><figcaption>THE SWEATER. THE WORK. THE NUMBERS.</figcaption></figure>
    </header>
    <section className="stats-numbers" id="numbers" aria-labelledby="numbers-title"><div className="stats-section-heading"><div><p className="stats-eyebrow">01 / THE NEW-SEASON LEDGER</p><h2 id="numbers-title">Top performers.</h2></div><p>{HOCKEY_SEASON} · Current season only.<br />Historical totals are kept below in the archive.</p></div><TrackingNotice state={season} />{currentStats && members.length ? <StatsClient seasons={[currentStats]} /> : <TopPerformers members={members} />}</section>
    <section className="stats-standings" id="standings" aria-labelledby="standings-title"><div className="stats-section-heading"><div><p className="stats-eyebrow">02 / THE MVP RACE</p><h2 id="standings-title">MVP tracker.</h2></div><p>A season-long performance ranking.<br />Not a final award or a betting market.</p></div><MvpTracker members={members} /></section>
    <section className="stats-numbers" id="archive" aria-labelledby="archive-title">
      <div className="stats-archive-heading">
        <div className="stats-section-heading"><div><p className="stats-eyebrow">03 / THE ARCHIVE</p><h2 id="archive-title">Previous seasons.</h2></div><p>The final 2025–2026 snapshot and earlier seasons.<br />These numbers do not count toward the new race.</p></div>
        <p className="stats-archive-link"><Link href="/awards">View the 2025–2026 award winners ↗</Link></p>
      </div>
      <StatsClient seasons={archives} />
    </section>
    <section className="stats-end"><p className="stats-eyebrow">BEYOND THE NUMBERS</p><h2>The names behind<br /><em>the sweater.</em></h2><Link className="stats-button" href="/roster">Meet the roster ↗</Link></section>
  </div>;
}
