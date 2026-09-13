import type { Metadata } from "next";
import HomepageClient from "@/components/homepage/HomepageClient";
import { renderHome } from "@/components/homepage/views";
import { homeArchive } from "@/components/homepage/home-data";
import { getHockeySeason } from "@/lib/hockey-season";
import { featureArticles } from "@/lib/featured-news";
import { getAllArticles } from "@/lib/articles";
import "@/components/homepage/homepage.css";
import "@/components/homepage/production.css";

export const metadata: Metadata = {
  title: "Bardownski Hockey | 2026–2027",
  description: "Follow Bardownski Hockey: recent matches, player performances, highlights, club news and past seasons with their captains.",
};
export const revalidate = 300;

export default async function Home() {
  const [news, season] = await Promise.all([getAllArticles(), getHockeySeason()]);
  // The existing article layer supplies real published stories, not demo copy.
  const featuredNews = featureArticles(news);
  const articles = [...featuredNews, ...homeArchive.news.filter(item => !news.some(article => article.id === item.id))];
  return <HomepageClient markup={renderHome(featuredNews.slice(0, 3), season)} articles={articles} />;
}
