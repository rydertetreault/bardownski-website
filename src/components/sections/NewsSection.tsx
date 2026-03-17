"use client";

import Link from "next/link";
import Image from "next/image";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";
import { articles as newsItems } from "@/lib/news";

export default function NewsSection() {
  return (
    <section className="py-20 bg-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 bg-[#cc1533] rounded-full" />
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                Latest News
              </h2>
            </div>
            <Link
              href="/news"
              className="text-sm text-[#cc1533] hover:text-red-light transition-colors font-medium"
            >
              View All →
            </Link>
          </div>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" stagger={0.15}>
          {newsItems.map((item) => (
            <StaggerItem key={item.id}>
              <Link href={`/news/${item.id}`} className="block group">
                <GlowCard className="bg-[#0d1528] border border-border rounded-xl overflow-hidden flex flex-col h-[400px] border-t-[#cc1533] border-t-2">
                  {/* Image or video — 55% of card height */}
                  <div className="relative overflow-hidden flex-shrink-0" style={{ height: "55%" }}>
                    {item.video ? (
                      <video
                        src={item.video}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-light" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-transparent to-transparent" />
                  </div>

                  {/* Content — 45% */}
                  <div className="p-5 flex flex-col justify-start">
                    <p className="text-xs text-[#5b9bd5] font-medium uppercase tracking-wider mb-2">
                      {item.date}
                    </p>
                    <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-[#cc1533] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-3">
                      {item.summary}
                    </p>
                  </div>
                </GlowCard>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
