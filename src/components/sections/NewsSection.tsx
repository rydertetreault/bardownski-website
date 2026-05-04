"use client";

import Link from "next/link";
import Image from "next/image";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard, GoldGlowCard } from "@/components/ui/Animate";
import type { Article } from "@/lib/news";

export default function NewsSection({ newsItems }: { newsItems: Article[] }) {
  const featured = newsItems[0];
  const side = newsItems.slice(1, 3);

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

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-5 gap-6" stagger={0.15}>
          {/* Featured large card — spans 3 of 5 columns */}
          <StaggerItem className="lg:col-span-3">
            {(() => {
              const isChamp = featured.id === "10";
              const Card = isChamp ? GoldGlowCard : GlowCard;
              return (
                <Link href={`/news/${featured.id}`} className="block group h-full">
                  <Card
                    className={`bg-[#0d1528] border border-border rounded-xl overflow-hidden flex flex-col h-full min-h-[480px] ${
                      isChamp ? "border-amber-400/40" : ""
                    }`}
                  >
                    <div
                      className="h-[2px] w-full shrink-0"
                      style={{
                        background: isChamp
                          ? "linear-gradient(90deg, transparent 0%, #f4d35e 50%, transparent 100%)"
                          : "#cc1533",
                      }}
                    />
                    <div className="relative overflow-hidden flex-shrink-0" style={{ height: "60%" }}>
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
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-light" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-transparent to-transparent" />
                      {isChamp ? (
                        <span
                          className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded"
                          style={{
                            background:
                              "linear-gradient(90deg, #d4a017 0%, #f4d35e 50%, #d4a017 100%)",
                            color: "#1a1303",
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                            <path d="M7 2h10v2h3v3a4 4 0 0 1-4 4h-.35A5.001 5.001 0 0 1 13 14.9V17h2v2H9v-2h2v-2.1A5.001 5.001 0 0 1 7.35 11H7a4 4 0 0 1-4-4V4h3V2zm0 4H5v1a2 2 0 0 0 2 2V6zm10 3a2 2 0 0 0 2-2V6h-2v3zM6 21h12v2H6v-2z" />
                          </svg>
                          Champions
                        </span>
                      ) : (
                        <span className="absolute top-3 left-3 bg-[#cc1533] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="p-6 flex flex-col justify-start flex-1">
                      <p className="text-xs text-[#5b9bd5] font-medium uppercase tracking-wider mb-2">
                        {featured.date}
                      </p>
                      <h3
                        className={`text-xl font-bold text-white mb-3 leading-snug transition-colors ${
                          isChamp ? "group-hover:text-amber-300" : "group-hover:text-[#cc1533]"
                        }`}
                      >
                        {featured.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-3">
                        {featured.summary}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })()}
          </StaggerItem>

          {/* Two stacked side cards — span 2 of 5 columns */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {side.map((item) => (
              <StaggerItem key={item.id} className="flex-1">
                <Link href={`/news/${item.id}`} className="block group h-full">
                  <GlowCard className="bg-[#0d1528] border border-border rounded-xl overflow-hidden flex flex-col h-full min-h-[227px] border-t-[#cc1533] border-t-2">
                    {/* Image or video — 50% of card */}
                    <div className="relative overflow-hidden flex-shrink-0" style={{ height: "50%" }}>
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

                    {/* Content */}
                    <div className="p-4 flex flex-col justify-start flex-1">
                      <p className="text-xs text-[#5b9bd5] font-medium uppercase tracking-wider mb-1.5">
                        {item.date}
                      </p>
                      <h3 className="text-sm font-bold text-white leading-snug group-hover:text-[#cc1533] transition-colors">
                        {item.title}
                      </h3>
                    </div>
                  </GlowCard>
                </Link>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
