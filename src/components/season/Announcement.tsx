"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HockeyAnnouncement } from "@/lib/hockey-season-state";
import { SEASON_REVEAL } from "@/lib/season-reveal";

export default function Announcement({ announcement }: { announcement: HockeyAnnouncement }) {
  const [failed, setFailed] = useState(false);
  const available = Boolean(announcement.videoSrc) && !failed;

  return (
    <div className="new-announcement">
      <div className="new-announcement-media">
        {available ? (
          <video
            controls
            playsInline
            preload="none"
            poster={announcement.poster}
            aria-label={announcement.title}
            onError={() => setFailed(true)}
          >
            <source src={announcement.videoSrc!} type="video/mp4" onError={() => setFailed(true)} />
            {announcement.captionsSrc && (
              <track kind="captions" src={announcement.captionsSrc} srcLang="en" label="English" default />
            )}
            Your browser does not support embedded video.
            <a href={announcement.videoSrc!}>Watch the announcement film.</a>
          </video>
        ) : (
          <>
            <Image
              src={announcement.poster}
              alt={announcement.posterAlt ?? `${announcement.title} — announcement poster`}
              width={1200}
              height={675}
              sizes="(max-width: 800px) 90vw, 58vw"
            />
            <span className="new-film-label">VIDEO TEMPORARILY UNAVAILABLE</span>
          </>
        )}
      </div>
      <div className="new-announcement-copy">
        <span className="new-eyebrow">{available ? "NOW SHOWING" : "THE REVEAL / 2026–2027"}</span>
        <h3>{announcement.title}</h3>
        <p>
          Captain {SEASON_REVEAL.leadership.captain.name}. Assistant captain {SEASON_REVEAL.leadership.assistants[0].name}.
          {" "}See the leadership introductions and our home, away and alternate jerseys in the {SEASON_REVEAL.durationLabel} reveal film.
        </p>
        {!available && (
          <p className="new-film-status" role="status">
            The film is temporarily unavailable. You can still read the announcement, or try playback again later.
          </p>
        )}
        <Link href={`/news/${SEASON_REVEAL.articleId}`}>Read the reveal story ↗</Link>
        <Link href="/roster#leadership">Meet the captain and assistant ↗</Link>
      </div>
    </div>
  );
}
