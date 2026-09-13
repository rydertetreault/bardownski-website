import type { Metadata } from "next";
import HomepageClient from "@/components/homepage/HomepageClient";
import { renderHome } from "@/components/homepage/views";
import { homeArchive } from "@/components/homepage/home-data";
import { getHockeySeason } from "@/lib/hockey-season";
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
  const trackingNotice = season.status === "connected"
    ? "2026–2027 tracking is connected. Open Season tracking for current totals and matches; the homepage performances below remain the 2025–2026 archive."
    : season.status === "stale"
      ? "Current-season tracking is showing its last saved data. Open Season tracking for details; the homepage performances below remain the 2025–2026 archive."
      : "Current-season tracking is temporarily unavailable. The homepage performances below remain the preserved 2025–2026 archive.";
  // The existing article layer supplies real published stories, not demo copy.
  const articles = [...news, ...homeArchive.news.filter(item => !news.some(article => article.id === item.id))];
  return <HomepageClient markup={renderHome(news.slice(0, 3), trackingNotice)} articles={articles} />;
}
