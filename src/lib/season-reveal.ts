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
  // Use the requested 0:05 title-card still, never the retired uniform lineup artwork.
  poster: "/images/announcements/bardownski-2027-00-05.webp",
  posterAlt: "White Bardownski logo above Bardownski Hockey Club and NHL 27 lettering on a dark background",
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
