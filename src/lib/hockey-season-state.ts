import type { ChelstatsData } from "./chelstats";
import type { Match } from "@/types";

export const HOCKEY_SEASON = "2026–2027";
export const HOCKEY_ARCHIVE_SEASON = "2025–2026";
// Hand-built SVG, not a crop or derivative of the supplied jersey photo.
export const HOCKEY_ARTWORK = "/images/2026-2027/club-sweaters.svg";

export type HockeyAnnouncement = {
  videoSrc: string | null;
  captionsSrc?: string;
  poster: string;
  title: string;
};

/** Set videoSrc to a public MP4 URL when the announcement is ready to publish.
 * Keep it null until then: no dead play button, autoplay or last-year video.
 */
export const HOCKEY_ANNOUNCEMENT: HockeyAnnouncement = {
  videoSrc: null,
  poster: HOCKEY_ARTWORK,
  title: "The letters. The look. The next chapter.",
};

export type HockeySeasonState = {
  season: typeof HOCKEY_SEASON;
  syncedAt: string | null;
  error?: string;
  coverage: {storedMatches: number; totalGames: number | null};
} & (
  | {status: "awaiting-setup" | "unavailable"; data: null; matches: Match[]; updatedAt: null}
  | {status: "connected" | "stale"; data: ChelstatsData; matches: Match[]; updatedAt: string}
);

export function hockeyTrackingLabel(state: HockeySeasonState): string {
  return state.status === "connected" ? "Tracking connected" : state.status === "stale" ? "Last saved data" : state.status === "unavailable" ? "Tracking temporarily unavailable" : "Tracking setup pending";
}
