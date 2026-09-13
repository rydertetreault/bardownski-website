import NewsClient from "./NewsClient";
import { getAllArticles } from "@/lib/articles";
import "./news.css";
import { newsExcerpt } from "./excerpt";

export default async function NewsPage() {
  const items = await getAllArticles();
  return <div className="news-edition">
    <header className="news-masthead"><div><p className="news-eyebrow">2026–2027 · THE CLUB JOURNAL</p><h1>THE CLUB <em>JOURNAL.</em></h1></div><div className="news-masthead-note"><span>NEWFOUNDLAND ROOTS.</span><p>The big nights. The quiet work.<br />The stories behind the sweater.</p><small>{items.length} STORIES IN THE JOURNAL</small></div></header>
    <NewsClient items={items.map(item => ({ ...item, summary: newsExcerpt(item.summary) }))} />
  </div>;
}
