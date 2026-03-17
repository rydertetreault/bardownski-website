import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/lib/news";
import NewsBackground from "../NewsBackground";

export function generateStaticParams() {
  return articles.map((a) => ({ id: a.id }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = articles.find((a) => a.id === id);
  if (!article) notFound();

  const paragraphs = article.summary.split(/\n\n+/);
  const idx = articles.findIndex((a) => a.id === id);
  const prev = articles[idx - 1] ?? null;
  const next = articles[idx + 1] ?? null;

  return (
    <div className="min-h-screen">
      <NewsBackground />

      <div className="relative pt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Back */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-white transition-colors mb-10"
        >
          ← Back to News
        </Link>

        {/* Category + date */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-[#cc1533]">
            {article.category}
          </span>
          <span className="w-1 h-1 rounded-full bg-border inline-block" />
          <span className="text-xs text-[#5b9bd5] font-medium uppercase tracking-wider">
            {article.date}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wide text-white leading-tight mb-8">
          {article.title}
        </h1>

        {/* Hero video or image */}
        {article.video ? (
          <div className="relative w-full rounded-xl overflow-hidden mb-10 border border-border aspect-video">
            <video
              src={article.video}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        ) : article.image ? (
          <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden mb-10 border border-border">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover object-[center_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
        ) : null}

        {/* Red rule */}
        <div className="h-px bg-gradient-to-r from-[#cc1533] via-[#cc1533]/30 to-transparent mb-10" />

        {/* Body */}
        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-base text-gray-300 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Prev / Next */}
        {(prev || next) && (
          <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row gap-4">
            {next && (
              <Link
                href={`/news/${next.id}`}
                className="flex-1 group bg-navy border border-border rounded-xl p-5 hover:border-[#cc1533]/40 transition-colors"
              >
                <p className="text-xs text-muted uppercase tracking-widest mb-2">← Older</p>
                <p className="text-sm font-bold text-white group-hover:text-[#cc1533] transition-colors line-clamp-2">
                  {next.title}
                </p>
              </Link>
            )}
            {prev && (
              <Link
                href={`/news/${prev.id}`}
                className="flex-1 group bg-navy border border-border rounded-xl p-5 hover:border-[#cc1533]/40 transition-colors text-right"
              >
                <p className="text-xs text-muted uppercase tracking-widest mb-2">Newer →</p>
                <p className="text-sm font-bold text-white group-hover:text-[#cc1533] transition-colors line-clamp-2">
                  {prev.title}
                </p>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
