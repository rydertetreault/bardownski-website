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
    name: "Ryder",
    clips: [
      { id: "r1", title: "JRT IV — 2026", src: "/videos/JRT IV - 2026.mp4" },
      { id: "r2", title: "Ryder — Clip 1", src: "/videos/Ryder1.mp4" },
      { id: "r3", title: "Ryder — Clip 2", src: "/videos/Ryder2.mp4" },
    ],
  },
  {
    id: "dylan",
    name: "Dylan",
    clips: [
      { id: "d1", title: "Dylan — Clip 1", src: "/videos/Dylan1.mp4" },
      { id: "d2", title: "Dylan — Clip 2", src: "/videos/Dylan2.mp4" },
    ],
  },
  {
    id: "kaden",
    name: "Kaden",
    clips: [
      { id: "k1", title: "GottaBe — Trap Edition", src: "/videos/GottaBe - Trap Edition.mov" },
      { id: "k2", title: "Kaden — Clip 1", src: "/videos/Kaden1.mp4" },
    ],
  },
  {
    id: "slobby-robby",
    name: "Slobby Robby",
    clips: [
      { id: "sr1", title: "Slobby Robby 2026", src: "/videos/Slobby Robby 2026.mov" },
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