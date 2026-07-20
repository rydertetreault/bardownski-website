import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchFcStatsData, buildFcNews } from "@/lib/fcstats";
import { FcPageShell } from "@/components/fc/FcUI";
import FcNewsCard from "@/components/fc/FcNewsCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchFcStatsData();
  const article = data ? buildFcNews(data).find((n) => n.id === id) : null;
  return {
    title: article ? `${article.title} | Bardownski FC` : "News | Bardownski FC",
    description: article?.excerpt ?? "Bardownski FC news.",
  };
}

export default async function FcNewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchFcStatsData();
  if (!data) notFound();

  const news = buildFcNews(data);
  const article = news.find((n) => n.id === id);
  if (!article) notFound();

  const related = news.filter((n) => n.id !== id).slice(0, 3);

  return (
    <FcPageShell>
      <div className="max-w-3xl mx-auto">
        <Link
          href="/fc/news"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All News
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.15em]"
            style={{ backgroundColor: "var(--fc-gold)", color: "#141414" }}
          >
            {article.category}
          </span>
          <span className="text-xs text-white/40">{article.date}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-tight mb-8">
          {article.title}
        </h1>

        <div
          className="relative h-64 sm:h-96 rounded-2xl overflow-hidden mb-10"
          style={{ border: "1px solid var(--fc-border)" }}
        >
          <Image
            src={article.image}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover object-top"
            priority
          />
        </div>

        <div className="flex flex-col gap-5 mb-16">
          {article.body.map((para, i) => (
            <p key={i} className="text-white/70 leading-relaxed text-lg">
              {para}
            </p>
          ))}
        </div>

        {related.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-white/60 mb-5 flex items-center gap-3">
              <span
                className="w-8 h-[2px] rounded-full"
                style={{ backgroundColor: "var(--fc-gold)" }}
              />
              More News
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((item) => (
                <FcNewsCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </FcPageShell>
  );
}
