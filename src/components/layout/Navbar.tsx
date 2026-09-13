"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import "./navbar.css";

const hockeyLinks = [
  ["/", "Home"], ["/matches", "Matches"], ["/roster", "Roster"],
  ["/stats", "Stats"], ["/lab", "Player lab"], ["/records", "Records"], ["/gallery", "Gallery"],
  ["/highlights", "Highlights"], ["/news", "News"],
];
const fcLinks = [
  ["/fc", "Home"], ["/fc/fixtures", "Fixtures"], ["/fc/squad", "Squad"],
  ["/fc/stats", "Stats"], ["/fc/records", "Records"], ["/fc/gallery", "Gallery"],
  ["/fc/highlights", "Highlights"], ["/fc/news", "News"],
];

export default function Navbar() {
  const pathname = usePathname();
  const isFc = pathname === "/fc" || pathname.startsWith("/fc/");
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const toggle = useRef<HTMLButtonElement>(null);
  if (lastPath !== pathname) { setLastPath(pathname); setOpen(false); }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const active = (href: string) => href === "/" || href === "/fc" ? pathname === href : pathname.startsWith(href + "/") || pathname === href;
  const pageStrips: Record<string, { title: string; links: string[][] }> = {
    "/": { title: "2026–2027 / BARDOWNSKI HOCKEY", links: [["/#results", "Recent matches"], ["/#standings", "MVP tracker"], ["/#history", "Past seasons"]] },
    "/matches": { title: "2026–2027 / THE MATCH CENTRE", links: [["/matches#results", "Season matches"], ["/matches#archive", "2025–2026 archive ↗"]] },
    "/roster": { title: "2026–2027 / THE ROSTER", links: [["/roster#squad", "The squad"], ["/roster#leadership", "Leadership ↗"]] },
    "/stats": { title: "2026–2027 / THE STAT BOOK", links: [["/stats#standings", "MVP race"], ["/stats#numbers", "Season stats"], ["/stats#weekly-honors", "Player of the Week"], ["/stats#archive", "Previous seasons"]] },
    "/lab": { title: "BARDOWNSKI / THE PLAYER LAB", links: [["/lab#lines", "Build lines"], ["/lab#comparison", "Compare players"], ["/lab#chemistry-method", "How it works ↗"]] },
    "/awards": { title: "2025–2026 / AWARD WINNERS", links: [["/stats#archive", "Archived stats"], ["/stats#standings", "New-season MVP tracker ↗"]] },
    "/records": { title: "BARDOWNSKI / CLUB RECORDS", links: [["/stats", "Season stats"], ["/matches#archive", "Match archive ↗"]] },
    "/gallery": { title: "BARDOWNSKI / GALLERY", links: [["/highlights", "Watch highlights ↗"]] },
    "/highlights": { title: "BARDOWNSKI / THE FILM ROOM", links: [["/highlights#highlights-ryder", "JRT IV"], ["/highlights#highlights-dylan", "Xavier Laflamme"], ["/highlights#highlights-kaden", "Gotta Be"], ["/highlights#highlights-slobby-robby", "Slobby Robby"], ["/highlights#highlights-matt", "Matt Hut"]] },
    "/news": { title: "BARDOWNSKI / THE CLUB JOURNAL", links: [["/news#stories", "Explore the stories ↘"]] },
  };
  const section = "/" + pathname.split("/")[1];
  const strip = isFc
    ? { title: `BARDOWNSKI FC / ${(pathname.split("/")[2] || "CLUB HUB").toUpperCase()}`, links: [["/fc/fixtures", "Fixtures"], ["/fc/squad", "Squad"], ["/fc/news", "Club news ↗"]] }
    : pageStrips[section] ?? pageStrips["/"];
  return (
    <header className="legacy-site-header">
      <div className="legacy-nav-inner">
        <Link href={isFc ? "/fc" : "/"} className="legacy-nav-brand" onClick={() => setOpen(false)}>
          <Image src={isFc ? "/icon-192.png" : "/images/logo/B-logo.png"} width={40} height={40} alt="" />
          <span>BARDOWNSKI<small>NEWFOUNDLAND / {isFc ? "FOOTBALL" : "HOCKEY"} CLUB</small></span>
        </Link>
        <button ref={toggle} type="button" className="legacy-nav-toggle" aria-controls="legacy-site-links" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"} <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav id="legacy-site-links" className={open ? "legacy-site-links open" : "legacy-site-links"} aria-label="Main navigation">
          {(isFc ? fcLinks : hockeyLinks).map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link href={isFc ? "/" : "/fc"} className="legacy-nav-fc" onClick={() => setOpen(false)}>{isFc ? "Bardownski Hockey" : "Bardownski FC"} <span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
      <div className="legacy-subnav">
        <span>{strip.title}</span>
        <nav aria-label="Page sections">
          {strip.links.map(([href, label]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
