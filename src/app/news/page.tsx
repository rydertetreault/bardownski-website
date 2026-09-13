import type { Metadata } from "next";
import Image from "next/image";
import { featureArticles } from "@/lib/featured-news";
import NewsClient from "./NewsClient";
import { getAllArticles } from "@/lib/articles";
import "./news.css";
import { newsExcerpt } from "./excerpt";

export const metadata: Metadata = {
  title: "Club News | Bardownski Hockey",
  description: "Results, player stories, and life at Bardownski. Read the latest club news and explore the story collection.",
};

export default async function NewsPage() {
  const items = featureArticles(await getAllArticles());
  return <div className="news-edition news-index">
    <header className="news-masthead" aria-labelledby="news-title">
      <div className="news-masthead-copy">
        <p className="news-eyebrow">Bardownski / Club news</p>
        <h1 id="news-title">Around<br /><em>the club.</em></h1>
        <p className="news-masthead-intro">Results, player stories, and life at Bardownski.</p>
      </div>
      <Image className="news-masthead-mark" src="/images/logo/B-logo.png" width={512} height={512} alt="" aria-hidden="true" sizes="(max-width: 480px) 1px, 28vw" />
    </header>
    <NewsClient items={items.map(item => ({ ...item, summary: newsExcerpt(item.summary) }))} />
  </div>;
}
