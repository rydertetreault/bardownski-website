"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FadeIn, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";

type NewsItemWithCategory = {
  id: string;
  title: string;
  summary: string;
  date: string;
  image?: string;
  video?: string;
  category: string;
};

const CATEGORIES = ["All", "Highlights", "Results", "Club News", "Stats", "Announcements"];

export default function NewsClient({ items }: { items: NewsItemWithCategory[] }) {
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? items : items.filter((i) => i.category === active);
  const [featured, ...rest] = filtered;

  return (
    <div>
      {/* Category filter pills */}
      <div className="flex gap-2 mb-10 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all duration-200 ${
              active === cat
                ? "bg-[#cc1533] border-[#cc1533] text-white"
                : "border-border text-muted hover:border-[#cc1533]/40 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured hero card */}
      {featured && (
        <FadeIn direction="up" className="mb-8">
          <Link href={`/news/${featured.id}`} className="block group">
            <GlowCard className="bg-[#0d1528] border border-border border-t-2 border-t-[#cc1533] rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-5">
                {/* Image — 3/5 on desktop */}
                <div className="relative md:col-span-3 h-64 md:h-80 overflow-hidden">
                  {featured.video ? (
                    <video
                      src={featured.video}
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : featured.image ? (
                    <Image
                      src={featured.image}
                      alt={featured.title}
                      fill
                      className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-light" />
                  )}
                  {/* Right fade into content panel on desktop */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0d1528] opacity-0 md:opacity-75 hidden md:block" />
                  {/* Bottom fade on mobile */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] to-transparent md:hidden" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#cc1533] text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded">
                      Latest
                    </span>
                  </div>
                </div>

                {/* Content — 2/5 on desktop */}
                <div className="md:col-span-2 p-6 md:p-8 flex flex-col justify-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#cc1533] mb-3">
                    {featured.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white mb-4 leading-tight group-hover:text-[#cc1533] transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-gray-400 mb-6 line-clamp-4">{featured.summary}</p>
                  <p className="text-xs text-[#5b9bd5] font-medium uppercase tracking-wider">
                    {featured.date}
                  </p>
                </div>
              </div>
            </GlowCard>
          </Link>
        </FadeIn>
      )}

      {/* Grid */}
      {rest.length > 0 && (
        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          stagger={0.12}
        >
          {rest.map((item) => (
            <StaggerItem key={item.id}>
              <Link href={`/news/${item.id}`} className="block group">
                <GlowCard className="bg-[#0d1528] border border-border border-t-2 border-t-[#cc1533] rounded-xl overflow-hidden h-[380px] flex flex-col">
                  <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "55%" }}>
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
                        className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-light" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-transparent to-transparent" />
                  </div>
                  <div className="p-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#cc1533]">
                        {item.category}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border inline-block" />
                      <span className="text-xs text-[#5b9bd5] font-medium uppercase tracking-wider">
                        {item.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-[#cc1533] transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-400 line-clamp-3">{item.summary}</p>
                  </div>
                </GlowCard>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-24 text-muted">No articles in this category yet.</div>
      )}
    </div>
  );
}
