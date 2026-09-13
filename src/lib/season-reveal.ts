/** Public metadata for the approved Bardownski 2027 announcement film.
 * Keep this module dependency-free so server and client views share one source.
 * Leadership is confirmed by the film; it does not finalize the returning roster
 * or assign the demonstration jersey numbers to players.
 */
export const SEASON_REVEAL = {
  articleId: "bardownski-2027-reveal",
  title: "Bardownski 2027: New Jerseys, New Leadership, Same Club",
  date: "2026-09-13",
  videoSrc: "/videos/announcements/bardownski-2027.mp4",
  poster: "/images/announcements/bardownski-2027.webp",
  posterAlt: "Bardownski 2027 home, away and alternate uniforms in teal, off-white and purple, shown together in the reveal film",
  captionsSrc: "/videos/announcements/bardownski-2027.en.vtt",
  durationSeconds: 155.066667,
  durationLabel: "2:35",
  leadership: {
    captain: {
      name: "Xavier Laflamme",
      profileName: "DYLAN",
      letter: "C",
      role: "Captain",
    },
    assistants: [
      {
        name: "Matt Hut",
        profileName: "MATT",
        letter: "A",
        role: "Assistant captain",
      },
    ],
  },
} as const;
