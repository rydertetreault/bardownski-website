# Shared site content width

## Approved layout contract

The user approved a single readability-focused system across all pages, while preserving their designs:

- **1280px maximum content width**, centered. The cap excludes horizontal gutters.
- **32px gutters** above 1024px; **24px** at 601–1024px; **20px** at 600px and below.
- **700px reading columns** for long articles. Article media can use the wider 1280px rail.
- Section backgrounds, hero photos, diagonal transitions, and background decoration remain full bleed.
- Existing mobile layouts, tables' horizontal scrolling, compact dialogs, photos, section colors and content are preserved.

## Implementation

`src/components/layout/site-widths.css` is imported in the root layout after the theme stylesheet. It supplies `--site-content-max`, `--site-reading-max`, `--site-gutter`, `.site-content-container`, `.site-reading-container` and `.hockey-page-container`.

A `.site-content-container` includes padding in its border box, so its total maximum width is **1344px** with 32px gutters, leaving exactly **1280px of content**. Full-bleed sections instead apply `padding-inline: max(var(--site-gutter), calc((100% - var(--site-content-max)) / 2))`.

- Shared navigation and both site footers align with the same rails.
- Home uses scoped overrides in `production.css`; section paint and all four SVG joins remain uncapped. The decorative scroll rule tracks the content rail on large screens.
- Matches, Roster, Stats, Highlights, News, Awards and article/report layouts retain their route-specific structures and use the shared tokens. Split heroes use container-relative outer insets rather than padding based on their half-width grid tracks. Modal widths are not widened.
- Records keeps its colored bands and full-width photo while constraining exhibits, search, and historical sections.
- Gallery uses the shared outer container; bento spans/lightboxes are not reworked.
- Player Lab uses its full-width inline-size container and `100cqw` for nested breakout margins, avoiding the scrollbar discrepancy introduced by `100vw`.
- FC page shells, hero content and home sections use the shared container. FC article prose is capped at 700px inside its already-guttered shell, without double padding.

## Verification

`node scripts/check-site-widths.mjs` measures actual foreground rails separately from full-bleed paint at **2560, 1920, 768, 390 and 320px**. It checks document overflow, navigation bounds, heading clipping and development errors. It also exposes Player Lab comparison via its real `?tool=comparison` route.

Verification during this change:

- All audited pages' geometry uses the shared rail; desktop content measures 1280px, article text 700px. At 390px Chromium's reserved 8px scrollbar leaves a 382px canvas and 342px content after gutters.
- Homepage responsive/interaction suite passed at 1440/1024/768/390/320: history tabs, album, dialogs, current match navigation, video, motion, no-JS, FC navigation and accessibility.
- Purple closing palette/diagonal checker passed at 1440/768/390/320.
- Interior checks passed filters/search, roster disclosures, season tabs, mobile table scrolling, highlight dialogs, article transcript and awards disclosures.
- FC's live feed was unavailable, so populated FC article/table states were additionally measured using isolated synthetic data rendered through the actual components: 18 fixture/viewport checks passed. Live unavailable-state wrappers were also checked. No synthetic data was saved to the site.
- TypeScript and focused ESLint passed. All 302 existing tests passed before concurrent Lab feature changes; later full-suite failures concern the evolving goalie/formation tests, not this width contract. The geometry unit tests pass.

Concurrent work added Player Lab's tabbed dynamic-loading interface during the audit. Both tool views meet the width contract with no document overflow, but the development server reports a separate React `useId` hydration mismatch inside that interface. The checker deliberately reports this rather than hiding it. Width changes do not modify Lab tool loading or state logic.

Evidence is session-local under `/tmp/site-widths-complete/`, `/tmp/site-widths-lab-final/`, `/tmp/hockey-interior-check/`, and `/tmp/fc-readability-check/`. No deployment or commit is part of this change.
