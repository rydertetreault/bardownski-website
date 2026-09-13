import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchChannelMessages, parseAllSeasons } from "@/lib/discord";
import { chelstatsToSeasonData } from "@/lib/chelstats";
import { FROZEN_CHELSTATS } from "@/lib/chelstats-frozen";
import { getHockeySeason, HOCKEY_SEASON, hockeyTrackingLabel } from "@/lib/hockey-season";
import { calculateWeeklyAwardHistory } from "@/lib/hockey-awards";
import { TrackingNotice } from "@/components/season/SeasonTracking";
import MvpRace from "./components/MvpRace";
import WeeklyHonors from "./components/WeeklyHonors";
import StatsClient from "./StatsClient";
import "./stats.css";

// Keep feed status and the Monday award cutoff current, including stale snapshots.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats, MVP Race & Player of the Week | Bardownski Hockey",
  description: "Follow the Bardownski MVP race, Player of the Week winners and weekly win rankings. Switch seasons to explore skater and goalie statistics in one stat book.",
};

export default async function StatsPage() {
  const [messages, season] = await Promise.all([fetchChannelMessages(), getHockeySeason()]);
  const historical = parseAllSeasons(messages).filter(s => Number.parseInt(s.season, 10) < 2025);
  const archives = [chelstatsToSeasonData(FROZEN_CHELSTATS.members), ...historical];
  const members = season.data?.members ?? [];
  const available = season.status === "connected" || season.status === "stale";
  const currentStats = available ? chelstatsToSeasonData(members, { season: HOCKEY_SEASON, date: season.updatedAt }) : null;
  const weeklyHistory = season.data ? calculateWeeklyAwardHistory(season.data.matches, season.awards?.asOf ?? new Date().toISOString()) : null;

  return <div className="stats-edition">
    <header className="stats-hero">
      <div className="stats-hero-copy">
        <p className="stats-eyebrow">Bardownski Hockey / The stat book</p>
        <h1>EVERY GAME.<br /><em>EVERY NUMBER.</em></h1>
        <p className="stats-intro">The MVP chase. The weekly standouts.<br />The whole season, in black and white.</p>
        <div className="stats-hero-actions"><a className="stats-button" href="#standings">Follow the MVP race ↘</a><a className="stats-text-link" href="#numbers">Explore player stats ↗</a></div>
        <p className="stats-caption">{HOCKEY_SEASON} <span>/</span> {hockeyTrackingLabel(season)}</p>
      </div>
      <figure><Image src="/images/homepage/team-teal.webp" alt="Bardownski players celebrating together on the ice, from the club archive" fill priority sizes="(max-width: 760px) 100vw, 55vw" /><figcaption>ONE CLUB. EVERY CONTRIBUTION. / CLUB ARCHIVE</figcaption></figure>
    </header>

    <nav className="stats-nav" aria-label="Stats page sections"><span>INSIDE THE STAT BOOK</span><div><a href="#standings">01 / MVP race</a><a href="#numbers">02 / Season stats</a><a href="#weekly-honors">03 / Weekly honors</a></div></nav>

    <section className="stats-standings" id="standings" aria-labelledby="standings-title">
      <div className="stats-section-heading"><div><p className="stats-eyebrow">01 / {HOCKEY_SEASON} · The MVP race</p><h2 id="standings-title">WHO’S SETTING<br /><em>THE STANDARD?</em></h2></div><p>A season-long chase. A place earned on the ice.<br />Current-season performance rankings, not a final award.</p></div>
      <TrackingNotice state={season} />
      <MvpRace members={members} available={available} />
    </section>

    <section className="stats-numbers" id="numbers" aria-labelledby="numbers-title">
      <div className="stats-section-heading"><div><p className="stats-eyebrow">02 / The season ledger</p><h2 id="numbers-title">THE NUMBERS.<br /><em>NOTHING HIDDEN.</em></h2></div><p>Skaters. Goaltenders. Every contribution.<br />Switch seasons to explore the current campaign or open the archive.</p></div>
      <div id="archive" className="stats-archive-anchor" />
      <StatsClient seasons={currentStats ? [currentStats, ...archives] : archives} currentSeason={HOCKEY_SEASON} currentAvailable={available} />
    </section>

    <WeeklyHonors history={weeklyHistory} members={members} stale={season.status !== "connected"} />

    <section className="stats-end club-mark-panel"><div><p className="stats-eyebrow">Beyond the numbers</p><h2>THE NAMES BEHIND<br /><em>THE SWEATER.</em></h2></div><Link className="stats-button" href="/roster">Meet the roster ↗</Link></section>
  </div>;
}
