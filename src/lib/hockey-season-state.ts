import type { HockeyAwards } from "./hockey-awards";
import type { ChelstatsData } from "./chelstats";
import type { Match } from "@/types";
import { SEASON_REVEAL } from "./season-reveal";

export const HOCKEY_SEASON = "2026–2027";
export const HOCKEY_ARCHIVE_SEASON = "2025–2026";
// Hand-built SVG, not a crop or derivative of the supplied jersey photo.
export const HOCKEY_ARTWORK = "/images/2026-2027/club-sweaters.svg";

export type HockeyAnnouncement = {
  videoSrc: string | null;
  captionsSrc?: string;
  poster: string;
  posterAlt?: string;
  title: string;
};

/** Published announcement assets from the approved final reveal film. */
export const HOCKEY_ANNOUNCEMENT: HockeyAnnouncement = {
  videoSrc: SEASON_REVEAL.videoSrc,
  poster: SEASON_REVEAL.poster,
  posterAlt: SEASON_REVEAL.posterAlt,
  captionsSrc: SEASON_REVEAL.captionsSrc,
  title: SEASON_REVEAL.title,
};

export type HockeySeasonState = {
  season: typeof HOCKEY_SEASON;
  syncedAt: string | null;
  error?: string;
  awards?: HockeyAwards | null;
  coverage: {storedMatches: number; totalGames: number | null};
} & (
  | {status: "awaiting-setup" | "unavailable"; data: null; matches: Match[]; updatedAt: null}
  | {status: "connected" | "stale"; data: ChelstatsData; matches: Match[]; updatedAt: string}
);

export function hockeyTrackingLabel(state: HockeySeasonState): string {
  return state.status === "connected" ? "Season stats" : state.status === "stale" ? "Last saved data" : state.status === "unavailable" ? "Tracking temporarily unavailable" : "Tracking setup pending";
}
