import GalleryClient from "./GalleryClient";
import GalleryBackground from "./GalleryBackground";

export interface GalleryPhoto {
  src: string;
  /** Shown as the lightbox caption. */
  title: string;
  alt: string;
}

export interface GalleryVideo {
  src: string;
  label: string;
}

// Every photo used on the site (exact/near duplicates, logos and jersey showcases excluded).
// Names are short ("Puck Rush", "Goal Celebration"): no descriptions, no colours. Alt = title.
const photos: GalleryPhoto[] = [
  // 2026–27
  { src: "/images/2026-2027/ryder-matt-away-bw.webp", title: "Matt Hut Celebrates in Front of the Net", alt: "Matt Hut Celebrates in Front of the Net" },
  { src: "/images/players/matt-alt.webp", title: "Matt Hut Celebrates With JRT IV", alt: "Matt Hut Celebrates With JRT IV" },
  { src: "/images/gallery/screenshots/matt-alt-2027.webp", title: "Matt Hut Carrying the Puck Behind the Net", alt: "Matt Hut Carrying the Puck Behind the Net" },
  { src: "/images/players/ryder-crease.webp", title: "JRT IV Lunging for the Save", alt: "JRT IV Lunging for the Save" },
  // Club archive
  { src: "/images/club%20finals.png", title: "Bardownski Players Celebrate as Hats Cover the Ice", alt: "Bardownski Players Celebrate as Hats Cover the Ice" },
  { src: "/images/gallery/screenshots/team.webp", title: "Hat Trick", alt: "Hat Trick" },
  { src: "/images/gallery/screenshots/milestone-1000pts.webp", title: "Lights Out", alt: "Lights Out" },
  { src: "/images/team%20pic.png", title: "Team Huddle", alt: "Team Huddle" },
  { src: "/images/gallery/screenshots/team%20over.webp", title: "Goal Huddle", alt: "Goal Huddle" },
  { src: "/images/gallery/screenshots/team%20shot.webp", title: "Win Huddle", alt: "Win Huddle" },
  { src: "/images/gallery/screenshots/team2.webp", title: "Sticks Up", alt: "Sticks Up" },
  { src: "/images/gallery/screenshots/t.webp", title: "Huddle Up", alt: "Huddle Up" },
  { src: "/images/bench.png", title: "Line Change", alt: "Line Change" },
  { src: "/images/gallery/screenshots/milestone-highlight.webp", title: "Net Drive", alt: "Net Drive" },
  { src: "/images/records-hero.webp", title: "Stick Raised", alt: "Stick Raised" },
  { src: "/images/homepage/captain-matt.webp", title: "Fresh Skates", alt: "Fresh Skates" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183953.webp", title: "Knee Celly", alt: "Knee Celly" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183502.webp", title: "Goal Celly", alt: "Goal Celly" },
  { src: "/images/gallery/screenshots/image.webp", title: "Crowd Pleaser", alt: "Crowd Pleaser" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 184232.webp", title: "Rope Pull", alt: "Rope Pull" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183904.webp", title: "On the Rush", alt: "On the Rush" },
  { src: "/images/gallery/screenshots/Screenshot 2026-03-16 183710.webp", title: "Crease View", alt: "Crease View" },
  { src: "/images/gallery/screenshots/IMG_3294.jpg", title: "Tunnel Walk", alt: "Tunnel Walk" },
  { src: "/images/gallery/screenshots/IMG_3288.webp", title: "Stars and Stripes", alt: "Stars and Stripes" },
  { src: "/images/gallery/screenshots/IMG_3428.webp", title: "Spotlight", alt: "Spotlight" },
  { src: "/images/logo/BD%20-%20stadium.webp", title: "Home Barn", alt: "Home Barn" },
];

const videos: GalleryVideo[] = [
  { src: "/videos/announcements/bardownski-2027.mp4", label: "Bardownski 2027: The Season Reveal Film" },
  { src: "https://youtu.be/aGrVfM6HsO0", label: "JRT 2025–26" },
  { src: "/videos/b-roll/ryder-matt-bRoll-alt.mp4", label: "JRT IV & Matt Hut — Fist Bump" },
  { src: "/videos/b-roll/ryder-matt-bRoll-away.mp4", label: "JRT IV & Matt Hut — Celebration" },
  { src: "/videos/b-roll/ryder-save-bRoll.mp4", label: "JRT IV — Big Pad Save" },
  { src: "/videos/b-roll/ryder-standing-bRoll.mp4", label: "JRT IV — Locked In" },
  { src: "/videos/ryder-save-away.mp4", label: "JRT IV — Wild Scramble Saves" },
  { src: "/videos/ryder-save-away2.mp4", label: "JRT IV — Sick Glove Save" },
  { src: "/videos/Ryder1.mp4", label: "JRT IV — Crazy Save" },
  { src: "/videos/Ryder2.mp4", label: "JRT IV — Massive Save" },
  { src: "/videos/ryder3.mp4", label: "JRT IV — Spectacular Saves" },
  { src: "/videos/Dylan1.mp4", label: "Xavier 2023–24" },
  { src: "/videos/Dylan2.mp4", label: "Xavier 2024–25" },
  { src: "/videos/dylan - 2026.mp4", label: "Xavier 2025–26" },
  { src: "/videos/matt1.mp4", label: "Matt Hut — Nasty Dekes" },
  { src: "/videos/matt2.mp4", label: "Matt Hut — Clutch Goals" },
  { src: "/videos/matt3.mp4", label: "Matt Hut — Buzzer-Beater" },
  { src: "/videos/matt4.mp4", label: "Matt Hut — Hits and Goals" },
  { src: "/videos/matt5.mp4", label: "Matt Hut — Filthy Goal" },
  { src: "/videos/matt6.mp4", label: "Matt Hut — Huge Hit" },
  { src: "/videos/matt7.mp4", label: "Matt Hut — Pre-Game Intro" },
  { src: "/videos/GottaBe - Trap Edition.mp4", label: "Gotta Be — Trap Edition" },
  { src: "/videos/Kaden1.mp4", label: "Gotta Be — Clean Celly" },
  { src: "/videos/Slobby Robby 2026.mp4", label: "Slobby Robby — Sick Goal Compilation" },
  { src: "/videos/team clip.mp4", label: "Slick Toe-Drag Goal" },
  { src: "/videos/b-roll/loading-flash.mp4", label: "Bardownski Club Intro" },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      <GalleryBackground />

      {/* Header */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        {/* Powder blue top rule */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, rgba(104,200,206,0.4), transparent)" }}
        />

        <div className="relative hockey-page-container text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.4em] mb-5"
            style={{ color: "var(--gold)" }}
          >
            Bardownski · Newfoundland
          </p>
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tight text-white mb-6 leading-none">
            Gallery
          </h1>
          <div className="flex items-center justify-center gap-6 text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>{photos.length} Photos</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#68c8ce" }} />
            <span>{videos.length} Videos</span>
          </div>
        </div>

        {/* Red bottom accent */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-32"
          style={{ backgroundColor: "#68c8ce" }}
        />
      </div>

      <div className="hockey-page-container pb-24 pt-8">
        <GalleryClient photos={photos} videos={videos} />
      </div>
    </div>
  );
}
