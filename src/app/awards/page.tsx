import type { Metadata } from "next";
import Link from "next/link";
import { SEASON_AWARDS, RECAP_HONORS, UNSUNG_HERO } from "@/lib/season-awards";
import "@/components/season/new-season.css";
import "./awards.css";

export const metadata: Metadata = {
  title: "2025–2026 Award Winners | Bardownski Hockey",
  description: "The 2025–2026 Bardownski award winners, statistical honors and the stories behind the performances. A preserved chapter, separate from the new season’s MVP race.",
};

export default function AwardsPage() {
  const awards = [...SEASON_AWARDS, ...RECAP_HONORS.filter(award => !SEASON_AWARDS.some(existing => existing.id === award.id))];
  return <div className="hockey-home awards-page">
    <header className="new-section awards-hero"><p className="new-eyebrow">THE HONORS / ARCHIVED SEASON</p><h1>2025–2026<br /><em>AWARD WINNERS.</em></h1><p>The performances that set the standard. The teammates who made it happen. Last season’s achievements, kept in their own chapter as we move into 2026–2027.</p><Link className="new-text-link" href="/stats#standings">Follow the new-season MVP tracker ↗</Link></header>
    <section className="new-section" aria-labelledby="honors-title"><div className="new-section-heading"><div><p className="new-eyebrow">THE SEASON IN GOOD COMPANY</p><h2 id="honors-title">Earned on the ice.</h2></div><p>Frozen 2025–2026 totals.<br />Not current-season rankings.</p></div><div className="awards-archive-grid">{awards.map(award => <article key={award.id}><span className="new-eyebrow">{award.selection === "editorial" ? "EDITORIAL SELECTION" : "STATISTICAL HONOR"}</span><h3>{award.title}</h3><strong>{award.winners.join(" / ")}</strong><p>{award.result}</p>{award.description && <p>{award.description}</p>}<details><summary>Selection criteria</summary><p>{award.criteria}</p></details></article>)}<article><span className="new-eyebrow">TEAM-SELECTED HONOR</span><h3>{UNSUNG_HERO.title}</h3><strong>{UNSUNG_HERO.winner}</strong><p>{UNSUNG_HERO.detail}</p><p>{UNSUNG_HERO.description}</p><details><summary>Selection criteria</summary><p>Team-approved editorial selection recognizing supporting work outside the scoring spotlight, rather than a model ranking or vote total.</p></details></article></div><p className="awards-note">Statistical honors use the frozen final-season snapshot. Exact ties share an award. Performance scores are not betting odds or votes. The best individual performance uses an incomplete 75-game archive, not all 366 club games.</p></section>
    <section className="new-section new-section-panel"><div className="new-section-heading"><div><p className="new-eyebrow">THE HISTORY STAYS</p><h2>One season.<br />Part of the story.</h2></div><p>A first championship. A 24-game winning streak.<br />The next season has a standard to chase.</p></div><div className="awards-links"><Link className="new-text-link" href="/stats#archive">Explore the archived stats ↗</Link><Link className="new-text-link" href="/records">Open the club record book ↗</Link><Link className="new-text-link" href="/matches#archive">Saved match history ↗</Link></div></section>
  </div>;
}
