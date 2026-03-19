import GalleryBackground from "../gallery/GalleryBackground";
import HighlightsClient from "./HighlightsClient";

export interface PlayerClip {
  id: string;
  title: string;
  src: string;
}

export interface PlayerHighlights {
  id: string;
  name: string;
  number?: string;
  position?: string;
  clips: PlayerClip[];
}

const players: PlayerHighlights[] = [
  {
    id: "ryder",
    name: "JRT IV",
    clips: [
      { id: "r1", title: "JRT IV — 2026", src: "https://youtu.be/aGrVfM6HsO0" },
      { id: "r2", title: "JRT IV — Clip 1", src: "/videos/Ryder1.mp4" },
      { id: "r3", title: "JRT IV — Clip 2", src: "/videos/Ryder2.mp4" },
      { id: "r4", title: "JRT IV — Clip 3", src: "/videos/ryder3.mp4" },
    ],
  },
  {
    id: "dylan",
    name: "Xavier Laflamme",
    clips: [
      { id: "d1", title: "Xavier Laflamme — Clip 1", src: "/videos/Dylan1.mp4" },
      { id: "d2", title: "Xavier Laflamme — Clip 2", src: "/videos/Dylan2.mp4" },
      { id: "d3", title: "Xavier Laflamme — 2026", src: "/videos/dylan - 2026.mp4" },
    ],
  },
  {
    id: "kaden",
    name: "Gotta Be",
    clips: [
      { id: "k1", title: "Gotta Be — Trap Edition", src: "/videos/GottaBe - Trap Edition.mp4" },
      { id: "k2", title: "Gotta Be — Clip 1", src: "/videos/Kaden1.mp4" },
    ],
  },
  {
    id: "slobby-robby",
    name: "Slobby Robby",
    clips: [
      { id: "sr1", title: "Slobby Robby 2026", src: "/videos/Slobby Robby 2026.mp4" },
    ],
  },
  {
    id: "matt",
    name: "Matt",
    clips: [
      { id: "m1", title: "Matt — Clip 1", src: "/videos/matt1.mp4" },
      { id: "m2", title: "Matt — Clip 2", src: "/videos/matt2.mp4" },
      { id: "m3", title: "Matt — Clip 3", src: "/videos/matt3.mp4" },
      { id: "m4", title: "Matt — Clip 4", src: "/videos/matt4.mp4" },
      { id: "m5", title: "Matt — Clip 5", src: "/videos/matt5.mp4" },
      { id: "m6", title: "Matt — Clip 6", src: "/videos/matt6.mp4" },
      { id: "m7", title: "Matt — Clip 7", src: "/videos/matt7.mp4" },
    ],
  },
];

export default function HighlightsPage() {
  const totalClips = players.reduce((sum, p) => sum + p.clips.length, 0);

  return (
    <div className="min-h-screen">
      <GalleryBackground />

      {/* Header */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, rgba(204,21,51,0.5), transparent)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.4em] mb-5"
            style={{ color: "#cc1533" }}
          >
            Bardownski · Newfoundland
          </p>
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tight text-white mb-6 leading-none">
            Highlights
          </h1>
          <div className="flex items-center justify-center gap-6 text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>{players.length} Players</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#cc1533" }} />
            <span>{totalClips} Clips</span>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-32"
          style={{ backgroundColor: "#cc1533" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-4">
        <HighlightsClient players={players} />
      </div>
    </div>
  );
}