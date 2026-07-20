import type { Metadata } from "next";
import { fetchFcStatsData, buildFcNews } from "@/lib/fcstats";
import {
  FcPageShell,
  FcPageHeader,
  FcDataUnavailable,
} from "@/components/fc/FcUI";
import FcNewsCard from "@/components/fc/FcNewsCard";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "News | Bardownski FC",
  description: "Match reports, features and club news from Bardownski FC. EA FC 26 Pro Clubs.",
};

export default async function FcNewsPage() {
  const data = await fetchFcStatsData();
  const news = data ? buildFcNews(data) : [];
  const [featured, ...rest] = news;

  return (
    <FcPageShell>
      <FcPageHeader
        label="Club Media"
        title="LATEST"
        titleAccent="NEWS"
        right={
          news.length > 0 ? (
            <span className="text-xs text-white/40 uppercase tracking-[0.2em] self-start sm:self-auto">
              {news.length} Stories
            </span>
          ) : undefined
        }
      />

      {!data || news.length === 0 ? (
        <FcDataUnavailable />
      ) : (
        <>
          {/* Featured story */}
          <Link
            href={`/fc/news/${featured.id}`}
            className="group relative block rounded-2xl overflow-hidden mb-10"
            style={{ border: "1px solid var(--fc-border)" }}
          >
            <div className="relative h-72 sm:h-96">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                sizes="100vw"
                className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,21,24,0.1) 0%, rgba(20,21,24,0.55) 55%, rgba(20,21,24,0.97) 100%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{ backgroundColor: "var(--fc-gold)", color: "#141414" }}
                  >
                    {featured.category}
                  </span>
                  <span className="text-xs text-white/50">{featured.date}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight max-w-3xl group-hover:underline decoration-[var(--fc-gold)] underline-offset-4">
                  {featured.title}
                </h2>
              </div>
            </div>
          </Link>

          {/* Rest of the grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((item) => (
              <FcNewsCard key={item.id} item={item} />
            ))}
          </div>

          <p className="text-[11px] text-white/25 mt-10 text-center uppercase tracking-wider">
            Reports generated live from EA Pro Clubs match data
          </p>
        </>
      )}
    </FcPageShell>
  );
}
