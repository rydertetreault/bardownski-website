"use client";
import Image from "next/image";
import ArticleVideo from "./ArticleVideo";
import "./article.css";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useHockeyMotionPaused } from "@/components/layout/hockey-motion-preference";

type NewsItem = {id:string; title:string; summary:string; date:string; image?:string; video?:string; captions?:string; featured?:boolean; category:string};
const CATEGORIES = ["All", "Highlights", "Results", "Club News", "Stats", "Announcements"];

function StoryMedia({item, priority = false}: {item:NewsItem; priority?:boolean}) {
  // Inline videos stay still until played, including for reduced-motion users.
  return <div className="news-media">{item.video ? <ArticleVideo src={item.video} poster={item.image} captions={item.captions} title={item.title} /> : item.image ? <Image src={item.image} alt={item.title} fill priority={priority} sizes={priority ? "(max-width: 800px) 100vw, 60vw" : "(max-width: 650px) 100vw, 50vw"} /> : <div className="news-media-fallback" aria-hidden="true"><span>BD.</span><small>THE CLUB JOURNAL</small></div>}</div>;
}
export default function NewsClient({items}: {items:NewsItem[]}) {
  const [active,setActive] = useState("All");
  const reduce = useHockeyMotionPaused();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const categories = [...new Set([...CATEGORIES, ...items.map(item => item.category)])];
  const filtered = items.filter(item => (active === "All" || item.category === active) && `${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
  const [featured,...rest] = filtered;
  const reveal = {initial:false as const, animate:reduce ? {opacity:1,y:0} : undefined, whileInView:{opacity:1,y:0}, viewport:{once:true,amount:.1}, transition:{duration:reduce ? 0 : .55}};
  return <section className="news-stories" id="stories" aria-label="Club stories">
    <div className="news-search"><label htmlFor="story-search">Find a story</label><input id="story-search" type="search" placeholder="Search the journal…" value={query} onChange={e => { setQuery(e.target.value); setLimit(8); }} /></div>
    <div className="news-filterbar"><div role="group" aria-label="Filter stories by category">{categories.map(cat => <button key={cat} type="button" aria-pressed={active === cat} onClick={() => { setActive(cat); setLimit(8); }}>{cat}</button>)}</div><p aria-live="polite">{filtered.length} {filtered.length === 1 ? "story" : "stories"}</p></div>
    {featured && <div className="news-frontpage"><motion.article key={`feature-${featured.id}`} {...reveal} className="news-lead">
      <div className="news-lead-visual"><StoryMedia item={featured} priority /><span className="news-feature-label">{featured.featured ? "THE 2027 REVEAL / FEATURED FILM" : featured.id === "10" ? "THE CHAMPIONSHIP STORY" : "THE LEAD STORY"}</span></div>
      <div className="news-lead-copy"><p className="news-eyebrow">{featured.category} <span>/ {featured.date}</span></p><h2><Link href={`/news/${featured.id}`}>{featured.title}</Link></h2><p className="news-summary">{featured.summary}</p><Link className="news-read" href={`/news/${featured.id}`} aria-label={`Read ${featured.title}`}>Read the story <span>↗</span></Link></div>
    </motion.article>
      {rest.length > 0 && <aside className="news-dispatch"><p className="news-eyebrow">IN THE ROOM</p><h2>On the radar.</h2><ol>{rest.slice(0,3).map((item,i) => <li key={item.id}><span className="news-dispatch-number">0{i+1}</span><div><p>{item.category} / {item.date}</p><h3><Link href={`/news/${item.id}`}>{item.title}</Link></h3></div></li>)}</ol><a href="#story-feed">Browse the journal ↓</a></aside>}
    </div>}
    {rest.length > 0 && <><div className="news-section-heading" id="story-feed"><h2>The story feed.</h2><span>THE JOURNAL / {active === "All" ? "ALL STORIES" : active.toUpperCase()}</span></div><div className="news-story-layout">{rest.slice(0,limit).map((item,i) => <motion.article key={`${active}-${item.id}`} {...reveal} whileHover={reduce ? undefined : {y:-4}} className={`news-story news-story-${i % 5}`}>
      <StoryMedia item={item} />
      <div className="news-story-copy"><p className="news-eyebrow">{item.category}<span>{item.date}</span></p><h3><Link href={`/news/${item.id}`}>{item.title}</Link></h3><p className="news-summary">{item.summary}</p><Link className="news-read" href={`/news/${item.id}`} aria-label={`Read ${item.title}`}>Read the story <span>↗</span></Link></div>
    </motion.article>)}</div>{rest.length > limit && <button className="news-load" type="button" onClick={() => setLimit(n => n + 8)}>More stories <span>+ {Math.min(8, rest.length - limit)}</span></button>}</>}
    {!filtered.length && <div className="news-empty"><h2>More stories to come.</h2><p>No stories match this selection.</p><button type="button" onClick={() => {setActive("All"); setQuery(""); setLimit(8);}}>Browse all stories ↗</button></div>}
    <footer className="news-end"><p className="news-eyebrow">MORE THAN THE HEADLINES</p><h2>One club.<br /><em>So many stories.</em></h2><Link href="/">Explore the season recap ↗</Link></footer>
  </section>;
}
