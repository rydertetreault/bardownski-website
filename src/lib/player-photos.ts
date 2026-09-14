/** Player photos for announced awards. Keys are public display nicknames so
 * feed names ("RYDER"), gamertags ("Rydayro") and nicknames all resolve through
 * the shared nickname map. Unlisted players fall back to the club's generic
 * skater/goalie photo, never another player's still. */
import { getDisplayName } from "./nicknames";

export interface PlayerPhoto { src: string; alt: string }

const PLAYER_PHOTOS: Readonly<Record<string, PlayerPhoto>> = {
  "JENE RENE TETREAU IV": { src: "/images/highlights/r2.webp", alt: "JRT IV set in the Bardownski crease, from the club film room" },
  "XAVIER LAFLAMME": { src: "/images/highlights/d1.webp", alt: "Xavier Laflamme celebrating a goal, from the club film room" },
  "MATT HUT": { src: "/images/highlights/m1.webp", alt: "Matt Hut celebrating at centre ice, from the club film room" },
  "GOTTA BE": { src: "/images/highlights/k1.webp", alt: "Gotta Be raising his stick, from the club film room" },
  "SLOBBY ROBBY": { src: "/images/highlights/sr1.webp", alt: "Slobby Robby play of the game card, from the club film room" },
};

export const FALLBACK_PLAYER_PHOTOS: Readonly<Record<"skater" | "goalie", PlayerPhoto>> = {
  skater: { src: "/images/homepage/player-purple.webp", alt: "Bardownski club photo, not a portrait of the player" },
  goalie: { src: "/images/homepage/goalie-purple.webp", alt: "Bardownski club photo, not a portrait of the player" },
};

export function getPlayerPhoto(name: string, isGoalie = false): PlayerPhoto {
  const key = getDisplayName(name).trim().replace(/\s+/g, " ").toUpperCase();
  return (Object.hasOwn(PLAYER_PHOTOS, key) ? PLAYER_PHOTOS[key] : null) ?? FALLBACK_PLAYER_PHOTOS[isGoalie ? "goalie" : "skater"];
}
