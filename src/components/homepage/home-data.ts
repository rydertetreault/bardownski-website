import { getNickname } from "@/lib/nicknames";
import frozen from "./archive.json";

const nicknameInProse = (name: string) => getNickname(name)
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Existing club screenshots, not verified photos of these seasons or captains.
 * Crop/source details: docs/homepage-history-photos.md. Positions preserve the
 * players at the history panel's 2.1:1 desktop and 1.8:1 mobile aspect ratios. */
const historyPhotos: Partial<Record<string, {
  image: string;
  imagePosition: string;
  imageAlt: string;
  imageCaption: string;
}>> = {
  "2020": {
    image: "history-2020",
    imagePosition: "50% 0%",
    imageAlt: "Bardownski teammates in white jerseys gathered together on the ice",
    imageCaption: "TOGETHER ON THE ICE / CLUB ARCHIVE",
  },
  "2021": {
    image: "history-2021",
    imagePosition: "50% 25%",
    imageAlt: "Club gameplay screenshot of a Bardownski skater in a white jersey kneeling on the ice and holding a stick across his chest",
    imageCaption: "WHITE-JERSEY CELEBRATION / CLUB ARCHIVE",
  },
  "2022": {
    image: "history-2022",
    imagePosition: "50% 60%",
    imageAlt: "Overhead club gameplay screenshot of a Bardownski goaltender in the blue crease with a white-jersey teammate and pink stick nearby",
    imageCaption: "OVERHEAD CREASE VIEW / CLUB ARCHIVE",
  },
  "2023": {
    image: "history-2023",
    imagePosition: "50% 100%",
    imageAlt: "Club gameplay screenshot of Bardownski players in dark jerseys gathered in an on-ice huddle with sticks raised",
    imageCaption: "ON-ICE TEAM HUDDLE / CLUB ARCHIVE",
  },
};

/** Historical register uses the original start-year IDs; labels are full spans.
 * Do not insert a fictitious completed 2026–2027 campaign or new captain. */
export const homeArchive = {
  ...frozen,
  seasons: frozen.seasons.map((season) => {
    const photo = historyPhotos[season.year] ?? {
      image: season.image,
      imagePosition: "center",
      imageAlt: season.year === "2024" ? "Archived Bardownski goaltending photo"
        : "Bardownski’s first club championship celebration",
      imageCaption: "FROM THE CLUB ARCHIVE",
    };
    return {
      ...season,
      label: `${season.year}–${Number(season.year) + 1}`,
      captain: getNickname(season.captain),
      // The frozen 2022 copy names Matt once. Resolve it for display only, without
      // changing its historical facts or doubling an already-expanded nickname.
      accomplishment: season.accomplishment.replace(/\bMatt\b(?!\s+Hut\b)/gi, nicknameInProse),
      ...photo,
    };
  }),
};

export type HomeArchive = typeof homeArchive;
