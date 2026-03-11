"use client";

import Link from "next/link";
import Image from "next/image";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";
import type { NewsItem } from "@/types";

const newsItems: NewsItem[] = [
  {
    id: "2",
    title: "Bardownski Competes in Div 1 Club Finals",
    summary:
      "Bardownski competed in the highest division of Club Finals (Div 1). After a rocky start, the squad managed to fight their way into the second round but ultimately fell short due to time constraints. A strong showing against top-tier competition.",
    date: "2026-03-09",
    image: "/images/logo/BD - stadium.png",
  },
  {
    id: "1",
    title: "Welcome to Bardownski",
    summary:
      "The official Bardownski website is now live. Stay tuned for roster updates, match results, and player stats from our Newfoundland-based club.",
    date: "2026-03-09",
    image: "/images/logo/BD - stadium.png",
  },
];

export default function NewsSection() {
  return (
    <section className="py-20 bg-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold uppercase tracking-wider">
              Latest News
            </h2>
            <Link
              href="/news"
              className="text-sm text-red hover:text-red-light transition-colors font-medium"
            >
              All News →
            </Link>
          </div>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" stagger={0.15}>
          {newsItems.map((item) => (
            <StaggerItem key={item.id}>
              <GlowCard className="bg-surface border border-border rounded-xl overflow-hidden h-full">
                <div className="relative h-52 overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-[center_20%] hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-light" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                </div>

                <div className="p-6">
                  <p className="text-xs text-red font-medium uppercase tracking-wider mb-2">
                    {item.date}
                  </p>
                  <h3 className="text-lg font-bold mb-2 hover:text-red transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted">{item.summary}</p>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
