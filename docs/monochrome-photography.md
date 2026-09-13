# Site-wide black-and-white photography

User direction: photos on every page remain black and white; section backgrounds, text, borders, logos, charts, and video playback keep their colors.

- `src/app/globals.css` applies `filter: grayscale(1) !important` only to `.site-main img:not([data-brand-mark])`. This covers plain images, Next/Image, lazy-loaded cards, hover states, galleries, history tab replacements, and lightboxes on hockey and FC routes. The important declaration intentionally overrides page-local photo filters without filtering entire containers.
- Actual logo renderers carry `data-brand-mark`. Stadium photographs are not exempted just because their file is in the `logo` folder. Navigation marks and footer branding outside the main content remain unchanged.
- Video poster frames use grayscale display copies from `src/lib/photo-posters.ts`. Regenerate them with `npx tsx scripts/generate-monochrome-posters.ts`. Copies retain original dimensions and use lossless WebP after grayscale conversion. Source photos and video/audio files are not modified. Videos themselves are not filtered; captions, native controls, preload behavior, and playback are unchanged.
- The Records background photo uses `public/images/monochrome/team-overhead.webp`, a grayscale copy of `public/images/team pic.png`. Its purple gradient, text, and controls retain their colors.
- The 2022–2023 crease photo remains the homepage hero. The 2020–2023 history replacements remain selected. Club photos and the footer keep the lavender/purple palette and the diagonal transition.

## Verification

`npx tsx --test tests/monochrome-photos.test.ts` checks the shared rule, native poster mappings, original dimensions, and equality of RGB channels in every generated monochrome asset. Existing reveal tests retain the original film and 0:05 source-image hashes.

`PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROME=/path/to/chrome node scripts/check-monochrome-photos.mjs` checks rendered image filters on hockey and FC pages, desktop/mobile hover, dynamic history/album/lightbox content, no-JS behavior, and preserved UI/video colors. It fails on build overlays rather than hiding them.
