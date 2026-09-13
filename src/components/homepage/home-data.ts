import frozen from "./archive.json";

/** Historical register uses the original start-year IDs; labels are full spans.
 * Do not insert a fictitious completed 2026–2027 campaign or new captain. */
export const homeArchive = {
  ...frozen,
  seasons: frozen.seasons.map((season) => ({
    ...season,
    label: `${season.year}–${Number(season.year) + 1}`,
    image: season.year === "2021" || season.year === "2022"
      ? "captain-matt"
      : season.year === "2020" ? "captain-xavier" : season.image,
    imagePosition: season.year === "2021" ? "42% 28%" : season.year === "2022" ? "42% 42%" : "center",
    imageAlt: season.year === "2021" || season.year === "2022"
      ? "Matt, number 8, with a teammate in an archived club photo"
      : season.year === "2020"
        ? "Still from Xavier Laflamme’s archived highlight video"
        : season.year === "2023" ? "Bardownski players on the bench"
          : season.year === "2024" ? "Archived Bardownski goaltending photo"
            : "Bardownski’s first club championship celebration",
    imageCaption: season.year === "2021" || season.year === "2022"
      ? "MATT / CLUB PHOTO ARCHIVE"
      : season.year === "2020" ? "XAVIER LAFLAMME / HIGHLIGHT ARCHIVE"
        : "FROM THE CLUB ARCHIVE",
  })),
};

export type HomeArchive = typeof homeArchive;
