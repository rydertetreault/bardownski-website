"use client";

import Link from "next/link";
import Image from "next/image";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface SeasonSummary {
  year: string;
  rosterSize: number;
  captain: string;
  summary: string;
}

const seasons: SeasonSummary[] = [
  {
    year: "2025",
    rosterSize: 10,
    captain: "Rob",
    summary:
      "The current season. Bardownski entered Div 1 Club Finals for the first time and made a deep run against top-tier competition.",
  },
  {
    year: "2024",
    rosterSize: 10,
    captain: "Ryder",
    summary:
      "A breakout year for the club. Ryder became the first goaltender named captain in club history. The roster solidified and the team started climbing the ranks in competitive play.",
  },
  {
    year: "2023",
    rosterSize: 8,
    captain: "Jimmy",
    summary:
      "The roster expanded with key additions like Logan on the wing, elevating the team's competitiveness. The pieces were finally coming together. Bardownski also debuted the iconic Miami Vice jerseys for the first time.",
  },
  {
    year: "2022",
    rosterSize: 6,
    captain: "Matt",
    summary:
      "Matt continued leading the club into year three. The roster grew to six and the team continued to build chemistry, finding its identity as a competitive unit.",
  },
  {
    year: "2021",
    rosterSize: 5,
    captain: "Matt",
    summary:
      "Bardownski kept grinding through another season, developing a core group of players.",
  },
  {
    year: "2020",
    rosterSize: 3,
    captain: "Dylan",
    summary:
      "Where it all began. Bardownski was founded and hit the ice for the first time, laying the foundation for everything to come.",
  },
];

export default function SeasonsOverview() {
  return (
    <section className="py-20 bg-navy-dark relative overflow-hidden">
      {/* Stadium background */}
      <div className="absolute inset-0">
        <Image
          src="/images/logo/BD - stadium.webp"
          alt=""
          fill
          className="object-cover object-[center_30%] opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/80 via-navy-dark/60 to-navy-dark" />
      </div>

      {/* Subtle bg glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <FadeUp>
          <div className="flex items-center justify-between mb-14">
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-wider mb-3">
                Seasons
              </h2>
              <p className="text-muted">
                Six seasons of Bardownski hockey at a glance.
              </p>
            </div>
            <Link
              href="/stats"
              className="text-sm text-red hover:text-red-light transition-colors font-medium hidden sm:block"
            >
              Full Stats →
            </Link>
          </div>
        </FadeUp>

        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          stagger={0.12}
        >
          {seasons.map((season) => (
            <StaggerItem key={season.year}>
              <GlowCard className="bg-gradient-to-b from-navy to-surface border border-border rounded-xl overflow-hidden h-full flex flex-col">
                {/* Year header */}
                <div className="px-6 pt-6 pb-4 border-b border-border/50">
                  <span className="text-4xl font-black text-red font-mono">
                    {season.year}
                  </span>
                  <span className="text-xs text-muted uppercase tracking-widest ml-3">
                    Season
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 divide-x divide-border/30 px-6 py-5">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">
                      Roster
                    </p>
                    <p className="text-2xl font-bold font-mono">
                      <AnimatedNumber from={0} to={season.rosterSize} />
                    </p>
                  </div>
                  <div className="pl-5">
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">
                      Captain
                    </p>
                    <p className="text-sm font-bold text-red">
                      {season.captain}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="px-6 pb-6 pt-2 flex-1">
                  <p className="text-sm text-muted leading-relaxed">
                    {season.summary}
                  </p>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Mobile link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/stats"
            className="text-sm text-red hover:text-red-light transition-colors font-medium"
          >
            Full Stats →
          </Link>
        </div>
      </div>
    </section>
  );
}
