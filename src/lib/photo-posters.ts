/** Monochrome preview copies: do not filter video playback or alter source media. */
export const MONOCHROME_POSTERS: Record<string, string> = {
  ...Object.fromEntries(["r1", "r2", "r3", "r4", "d1", "d2", "d3", "k1", "k2", "sr1", "m1", "m2", "m3", "m4", "m5", "m6", "m7"].map(id => [
    `/images/highlights/${id}.webp`, `/images/monochrome/posters/${id}.webp`,
  ])),
  "/images/homepage/player-teal.webp": "/images/monochrome/posters/home-skater.webp",
  "/images/homepage/goalie-purple.webp": "/images/monochrome/posters/home-goalie.webp",
  "/images/announcements/bardownski-2027-00-05.webp": "/images/monochrome/posters/reveal-00-05.webp",
  "/fc/images/fc-highlight-1-poster.webp": "/images/monochrome/posters/fc-highlight-1.webp",
};

export function getMonochromePoster(src: string): string;
export function getMonochromePoster(src?: string): string | undefined;
export function getMonochromePoster(src?: string): string | undefined {
  return src ? MONOCHROME_POSTERS[src] ?? src : src;
}
