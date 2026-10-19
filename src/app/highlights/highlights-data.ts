// Club clips. Titles are short: what the video is, plus a punchy word ("Crazy Save", "Huge Hit");
// the player's name heads each section. Written from full-video analysis (scripts/describe-media.mjs,
// Gemini watches the whole clip) and on-screen title cards. Season tapes are titled by player
// and season (JRT 2025–26, Xavier 2023–24...), as requested. Posters are stills from each clip.
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
      { id: "r1", poster: "/images/highlights/r1.webp", title: "JRT 2025–26", src: "https://youtu.be/aGrVfM6HsO0" },
      { id: "r2", poster: "/images/highlights/r2.webp", title: "Crazy Save", src: "/videos/Ryder1.mp4" },
      { id: "r3", poster: "/images/highlights/r3.webp", title: "Massive Save", src: "/videos/Ryder2.mp4" },
      { id: "r4", poster: "/images/highlights/r4.webp", title: "Spectacular Saves", src: "/videos/ryder3.mp4" },
      { id: "r5", poster: "/images/highlights/r5.webp", title: "Wild Scramble Saves", src: "/videos/ryder-save-away.mp4" },
      { id: "r6", poster: "/images/highlights/r6.webp", title: "Sick Glove Save", src: "/videos/ryder-save-away2.mp4" },
      { id: "r7", poster: "/images/highlights/r7.webp", title: "Big Pad Save", src: "/videos/b-roll/ryder-save-bRoll.mp4" },
      { id: "r8", poster: "/images/highlights/r8.webp", title: "Locked In", src: "/videos/b-roll/ryder-standing-bRoll.mp4" },
      { id: "r9", poster: "/images/highlights/r9.webp", title: "Fist Bump With Matt Hut", src: "/videos/b-roll/ryder-matt-bRoll-alt.mp4" },
      { id: "r10", poster: "/images/highlights/r10.webp", title: "Celebrating With Matt Hut", src: "/videos/b-roll/ryder-matt-bRoll-away.mp4" },
    ],
  },
  {
    id: "dylan",
    name: "Xavier Laflamme",
    role: "The playmaker",
    statement: "Space created. Chances taken.",
    theme: "attack",
    clips: [
      { id: "d1", poster: "/images/highlights/d1.webp", title: "Xavier 2023–24", src: "/videos/Dylan1.mp4" },
      { id: "d2", poster: "/images/highlights/d2.webp", title: "Xavier 2024–25", src: "/videos/Dylan2.mp4" },
      { id: "d3", poster: "/images/highlights/d3.webp", title: "Xavier 2025–26", src: "/videos/dylan - 2026.mp4" },
    ],
  },
  {
    id: "kaden",
    name: "Gotta Be",
    role: "From the blue line",
    statement: "The breakout starts here.",
    theme: "paper",
    clips: [
      { id: "k1", poster: "/images/highlights/k1.webp", title: "Trap Edition", src: "/videos/GottaBe - Trap Edition.mp4" },
      { id: "k2", poster: "/images/highlights/k2.webp", title: "Clean Celly", src: "/videos/Kaden1.mp4" },
    ],
  },
  {
    id: "slobby-robby",
    name: "Slobby Robby",
    role: "Holding the line",
    statement: "All Robby. All on tape.",
    theme: "ink",
    clips: [
      { id: "sr1", poster: "/images/highlights/sr1.webp", title: "Sick Goal Compilation", src: "/videos/Slobby Robby 2026.mp4" },
    ],
  },
  {
    id: "matt",
    name: "Matt Hut",
    role: "The finisher",
    statement: "Find the space. Pick the corner.",
    theme: "finish",
    clips: [
      { id: "m1", poster: "/images/highlights/m1.webp", title: "Nasty Dekes", src: "/videos/matt1.mp4" },
      { id: "m2", poster: "/images/highlights/m2.webp", title: "Clutch Goals", src: "/videos/matt2.mp4" },
      { id: "m3", poster: "/images/highlights/m3.webp", title: "Buzzer-Beater", src: "/videos/matt3.mp4" },
      { id: "m4", poster: "/images/highlights/m4.webp", title: "Hits and Goals", src: "/videos/matt4.mp4" },
      { id: "m5", poster: "/images/highlights/m5.webp", title: "Filthy Goal", src: "/videos/matt5.mp4" },
      { id: "m6", poster: "/images/highlights/m6.webp", title: "Huge Hit", src: "/videos/matt6.mp4" },
      { id: "m7", poster: "/images/highlights/m7.webp", title: "Pre-Game Intro", src: "/videos/matt7.mp4" },
      { id: "m8", poster: "/images/highlights/m8.webp", title: "Fist Bump With JRT IV", src: "/videos/b-roll/ryder-matt-bRoll-alt.mp4" },
      { id: "m9", poster: "/images/highlights/m9.webp", title: "Celebrating With JRT IV", src: "/videos/b-roll/ryder-matt-bRoll-away.mp4" },
    ],
  },
];

