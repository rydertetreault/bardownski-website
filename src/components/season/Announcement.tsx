"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HockeyAnnouncement } from "@/lib/hockey-season";

export default function Announcement({ announcement }: { announcement: HockeyAnnouncement }) {
  const [failed, setFailed] = useState(false);
  const available = Boolean(announcement.videoSrc) && !failed;
  return <div className="new-announcement">
    <div className="new-announcement-media">
      {available ? <video controls playsInline preload="none" poster={announcement.poster} aria-label={announcement.title} onError={() => setFailed(true)}>
        <source src={announcement.videoSrc!} type="video/mp4" onError={() => setFailed(true)} />
        {announcement.captionsSrc && <track kind="captions" src={announcement.captionsSrc} srcLang="en" label="English" default />}
        Your browser does not support embedded video.
      </video> : <><Image src={announcement.poster} alt="Original Bardownski sweater illustration for the upcoming captain and jersey announcement" width={1200} height={700} sizes="(max-width: 800px) 90vw, 58vw" /><span className="new-film-label">{failed ? "VIDEO TEMPORARILY UNAVAILABLE" : "ANNOUNCEMENT FILM / COMING SOON"}</span></>}
    </div>
    <div className="new-announcement-copy"><span className="new-eyebrow">{available ? "NOW SHOWING" : "UP NEXT / 2026–2027"}</span><h3>{announcement.title}</h3><p>{failed ? "The announcement could not be loaded. Please try again later." : available ? "Meet the leadership group and take a closer look at the jerseys for our next chapter." : "The jerseys set the tone. The captain and leadership group are next. Watch for the official announcement here."}</p>{!available && <span className="new-film-status">{failed ? "Playback unavailable" : "Film coming soon · captains to be announced"}</span>}<Link href="/roster#leadership">The leadership chapter ↗</Link></div>
  </div>;
}
