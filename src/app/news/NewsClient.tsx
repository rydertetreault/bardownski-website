"use client";

import Image from "next/image";
import ArticleVideo from "./ArticleVideo";
import "./article.css";
import Link from "next/link";
import { useState } from "react";

type NewsItem = {id:string; title:string; summary:string; date:string; image?:string; video?:string; captions?:string; featured?:boolean; category:string};
const CATEGORIES = ["All", "Highlights", "Results", "Club News", "Stats", "Announcements"];

function StoryMedia({ item, priority = false }: { item: NewsItem; priority?: boolean }) {
  return <div className="news-media">{item.video
    ? <ArticleVideo src={item.video} poster={item.image} captions={item.captions} title={item.title} />
    : item.image
      ? <Image src={item.image} alt={item.title} fill priority={priority} sizes={priority ? "(max-width: 750px) 90vw, 60vw" : "(max-width: 480px) 90px, (max-width: 750px) 155px, 220px"} />
      : <div className="news-media-fallback" aria-hidden="true"><span className="news-fallback-logo"><Image src="/images/logo/B-logo.png" width={96} height={96} alt="" /></span><small>THE CLUB JOURNAL</small></div>}
  </div>;
}

export default function NewsClient({ items }: { items: NewsItem[] }) {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const categories = [...new Set([...CATEGORIES, ...items.map(item => item.category)])];
  const filtered = items.filter(item => (active === "All" || item.category === active) && `${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
  const [featured, ...rest] = filtered;
  const isFiltered = active !== "All" || query.trim().length > 0;
  function clearFilters() { setActive("All"); setQuery(""); setLimit(8); }

  return <section className="news-stories" id="stories" aria-label="Club stories">
    <div className="news-tools" role="search" aria-label="Search and filter club stories">
      <div className="news-search">
        <label className="news-sr-only" htmlFor="story-search">Search stories</label>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        <input id="story-search" type="search" placeholder="Search stories…" value={query} onChange={event => { setQuery(event.target.value); setLimit(8); }} />
      </div>
      <div className="news-topic">
        <label htmlFor="story-topic">Topic</label>
        <select id="story-topic" aria-label="Filter stories by category" value={active} onChange={event => { setActive(event.target.value); setLimit(8); }}>
          {categories.map(category => <option key={category} value={category}>{category === "All" ? "All stories" : category}</option>)}
        </select>
      </div>
    </div>
    <div className="news-results-heading">
      <p className="news-eyebrow">{isFiltered ? "Your selection" : "In focus"}</p>
      <div><p className="news-result-count" role="status" aria-live="polite" aria-atomic="true">{filtered.length} {filtered.length === 1 ? "story" : "stories"}{isFiltered ? " found" : " to explore"}</p>{isFiltered && <button type="button" className="news-reset" onClick={clearFilters}>Clear filters <span aria-hidden="true">×</span></button>}</div>
    </div>

    {featured && <div className="news-frontpage">
      <article key={`feature-${featured.id}`} className="news-lead">
        <div className="news-lead-visual"><StoryMedia item={featured} priority /><span className="news-feature-label">{featured.video ? "Featured film" : featured.id === "10" ? "The championship story" : "The lead story"}</span></div>
        <div className="news-lead-copy">
          <p className="news-eyebrow">{featured.category}<span>{featured.date}</span></p>
          <h2><Link href={`/news/${featured.id}`}>{featured.title}</Link></h2>
          <p className="news-summary">{featured.summary}</p>
          <Link className="news-read" href={`/news/${featured.id}`} aria-label={`Read ${featured.title}`}>Read the story <span aria-hidden="true">↗</span></Link>
        </div>
      </article>
      {rest.length > 0 && <aside className="news-dispatch" aria-labelledby="radar-title">
        <p className="news-eyebrow">Also in the room</p><h2 id="radar-title">On the radar.</h2>
        <ol>{rest.slice(0,3).map((item,index) => <li key={item.id}><span className="news-dispatch-number">{String(index + 1).padStart(2, "0")}</span><div><p>{item.category} / {item.date}</p><h3><Link href={`/news/${item.id}`}>{item.title}</Link></h3></div></li>)}</ol>
        <a href="#story-feed">More from the club <span aria-hidden="true">↓</span></a>
      </aside>}
    </div>}

    {rest.length > 0 && <div className="news-feed">
      <div className="news-section-heading" id="story-feed"><h2>More from the club.</h2><span>{active === "All" ? "THE STORY COLLECTION" : active.toUpperCase()}</span></div>
      <div className="news-story-layout">{rest.slice(0,limit).map(item => <article key={item.id} className="news-story">
        <StoryMedia item={item} />
        <div className="news-story-copy"><p className="news-eyebrow">{item.category}<span>{item.date}</span></p><h3><Link href={`/news/${item.id}`}>{item.title}</Link></h3><p className="news-summary">{item.summary}</p><Link className="news-read" href={`/news/${item.id}`} aria-label={`Read ${item.title}`}>Read the story <span aria-hidden="true">↗</span></Link></div>
      </article>)}</div>
      {rest.length > limit && <button className="news-load" type="button" onClick={() => setLimit(n => n + 8)}>More stories <span>+ {Math.min(8, rest.length - limit)}</span></button>}
    </div>}
    {!filtered.length && <div className="news-empty"><h2>No stories found.</h2><p>Try another search or explore a different topic.</p><button type="button" onClick={clearFilters}>Browse all stories ↗</button></div>}
    <footer className="news-end"><p className="news-eyebrow">Keep up with the club</p><h2>Back to<br /><em>the action.</em></h2><Link href="/">Follow the current season <span aria-hidden="true">↗</span></Link></footer>
  </section>;
}
