import Image from "next/image";
import type { Metadata } from "next";
import ArticleVideo from "../ArticleVideo";
import revealTranscript from "@/lib/season-reveal-transcript.json";
import { SEASON_REVEAL } from "@/lib/season-reveal";
import "../article.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticles, getArticleById } from "@/lib/articles";
import { articles as manualArticles } from "@/lib/news";
import NewsBackground from "../NewsBackground";

export const dynamicParams = true;

export function generateStaticParams() {
  // Only pre-render manual articles at build time.
  // Auto articles are rendered on-demand via dynamicParams = true.
  return manualArticles.map((a) => ({ id: a.id }));
}

export async function generateMetadata({params}: {params:Promise<{id:string}>}): Promise<Metadata> {
  const article=await getArticleById((await params).id);
  if(!article)return {title:"Story not found | Bardownski"};
  const description=article.summary.split("\n\n")[0];
  return {title:`${article.title} | Bardownski Hockey`,description,openGraph:{title:article.title,description,type:"article",publishedTime:article.date,images:article.image?[{url:article.image}]:[]}};
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const isReveal = article.id === SEASON_REVEAL.articleId;
  const allArticles = await getAllArticles();
  const paragraphs = article.summary.split(/\n\n+/);
  const idx = allArticles.findIndex((a) => a.id === id);
  const prev = allArticles[idx - 1] ?? null;
  const next = allArticles[idx + 1] ?? null;

  return (
    <div className={`min-h-screen hockey-article${isReveal ? " reveal-article" : ""}`}>
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
          <span className="text-xs font-black uppercase tracking-widest text-[#68c8ce]">
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
          <div id={isReveal ? "reveal-film" : undefined} className="relative w-full rounded-xl overflow-hidden mb-10 border border-border aspect-video">
            <ArticleVideo src={article.video} poster={article.image} captions={article.captions} title={article.title} />
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
        <div className="h-px bg-gradient-to-r from-[#68c8ce] via-[#68c8ce]/30 to-transparent mb-10" />

        {/* Body */}
        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-base text-gray-300 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {isReveal && <section className="reveal-resources" aria-labelledby="reveal-resources-title"><h2 id="reveal-resources-title">The 2027 reveal</h2><p>The film names Xavier Laflamme captain and Matt Hut assistant captain, then introduces the home, away and alternate uniforms. The number shown on the uniform models is presentation artwork, not a new roster-number announcement.</p><p className="reveal-archive-note">Archive note: the introduction says “307 games.” The preserved final 2025–2026 record is 207–144–15 across 366 games; those historical totals remain unchanged.</p><details className="reveal-transcript"><summary>Read the film transcript</summary>{revealTranscript.map(section => <div key={section.title}><h3>{section.title}</h3><p>{section.text}</p></div>)}</details><a href={SEASON_REVEAL.captionsSrc}>Download timed English captions ↗</a><Link href="/roster#leadership">Meet the leadership group ↗</Link></section>}

        {/* Prev / Next */}
        {(prev || next) && (
          <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row gap-4">
            {next && (
              <Link
                href={`/news/${next.id}`}
                className="flex-1 group bg-navy border border-border rounded-xl p-5 hover:border-[#68c8ce]/40 transition-colors"
              >
                <p className="text-xs text-muted uppercase tracking-widest mb-2">← Older</p>
                <p className="text-sm font-bold text-white group-hover:text-[#68c8ce] transition-colors line-clamp-2">
                  {next.title}
                </p>
              </Link>
            )}
            {prev && (
              <Link
                href={`/news/${prev.id}`}
                className="flex-1 group bg-navy border border-border rounded-xl p-5 hover:border-[#68c8ce]/40 transition-colors text-right"
              >
                <p className="text-xs text-muted uppercase tracking-widest mb-2">Newer →</p>
                <p className="text-sm font-bold text-white group-hover:text-[#68c8ce] transition-colors line-clamp-2">
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
