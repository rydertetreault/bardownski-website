// Existing club clips; titles and source URLs are preserved. Posters are stills from each clip.
export interface PlayerClip {
  id: string;
  title: string;
  src: string;
  poster: string;
}

export interface PlayerHighlights {
  id: string;
  name: string;
  role: string;
  statement: string;
  theme: "crease" | "attack" | "paper" | "ink" | "finish";
  clips: PlayerClip[];
}

export const players: PlayerHighlights[] = [
  {
    id: "ryder",
    name: "JRT IV",
    role: "Between the pipes",
    statement: "The last line. Worth another look.",
    theme: "crease",
    clips: [
      { id: "r1", poster: "/images/highlights/r1.webp", title: "JRT IV — 2026", src: "https://youtu.be/aGrVfM6HsO0" },
      { id: "r2", poster: "/images/highlights/r2.webp", title: "JRT IV — Clip 1", src: "/videos/Ryder1.mp4" },
      { id: "r3", poster: "/images/highlights/r3.webp", title: "JRT IV — Clip 2", src: "/videos/Ryder2.mp4" },
      { id: "r4", poster: "/images/highlights/r4.webp", title: "JRT IV — Clip 3", src: "/videos/ryder3.mp4" },
    ],
  },
  {
    id: "dylan",
    name: "Xavier Laflamme",
    role: "The playmaker",
    statement: "Space created. Chances taken.",
    theme: "attack",
    clips: [
      { id: "d1", poster: "/images/highlights/d1.webp", title: "Xavier Laflamme — Clip 1", src: "/videos/Dylan1.mp4" },
      { id: "d2", poster: "/images/highlights/d2.webp", title: "Xavier Laflamme — Clip 2", src: "/videos/Dylan2.mp4" },
      { id: "d3", poster: "/images/highlights/d3.webp", title: "Xavier Laflamme — 2026", src: "/videos/dylan - 2026.mp4" },
    ],
  },
  {
    id: "kaden",
    name: "Gotta Be",
    role: "From the blue line",
    statement: "The breakout starts here.",
    theme: "paper",
    clips: [
      { id: "k1", poster: "/images/highlights/k1.webp", title: "Gotta Be — Trap Edition", src: "/videos/GottaBe - Trap Edition.mp4" },
      { id: "k2", poster: "/images/highlights/k2.webp", title: "Gotta Be — Clip 1", src: "/videos/Kaden1.mp4" },
    ],
  },
  {
    id: "slobby-robby",
    name: "Slobby Robby",
    role: "Holding the line",
    statement: "All Robby. All on tape.",
    theme: "ink",
    clips: [
      { id: "sr1", poster: "/images/highlights/sr1.webp", title: "Slobby Robby 2026", src: "/videos/Slobby Robby 2026.mp4" },
    ],
  },
  {
    id: "matt",
    name: "Matt Hut",
    role: "The finisher",
    statement: "Find the space. Pick the corner.",
    theme: "finish",
    clips: [
      { id: "m1", poster: "/images/highlights/m1.webp", title: "Matt Hut — Clip 1", src: "/videos/matt1.mp4" },
      { id: "m2", poster: "/images/highlights/m2.webp", title: "Matt Hut — Clip 2", src: "/videos/matt2.mp4" },
      { id: "m3", poster: "/images/highlights/m3.webp", title: "Matt Hut — Clip 3", src: "/videos/matt3.mp4" },
      { id: "m4", poster: "/images/highlights/m4.webp", title: "Matt Hut — Clip 4", src: "/videos/matt4.mp4" },
      { id: "m5", poster: "/images/highlights/m5.webp", title: "Matt Hut — Clip 5", src: "/videos/matt5.mp4" },
      { id: "m6", poster: "/images/highlights/m6.webp", title: "Matt Hut — Clip 6", src: "/videos/matt6.mp4" },
      { id: "m7", poster: "/images/highlights/m7.webp", title: "Matt Hut — Clip 7", src: "/videos/matt7.mp4" },
    ],
  },
];

