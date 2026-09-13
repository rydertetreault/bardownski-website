# Homepage history photo replacements

## Sources and provenance limits

All three replacements are restrained crops of existing **club gameplay screenshots**, not generated art, stock photography, or verified contemporaneous portraits. Source candidates were inspected in a 25-image contact sheet covering `public/images/gallery/screenshots/` and the top-level raster images in `public/bardownski-hockey-media/images/`, followed by individual previews and desktop/mobile crop comparisons.

The years below are homepage tab IDs, **not verified image capture seasons**. No player identity, captain portrait, particular match, championship, or uniform debut is inferred from the images. The page's existing later-season archive disclosure remains applicable. The 2023 image is a dark-jersey team huddle, not evidence of the historical Miami Vice uniform debut described in the unchanged accomplishment text.

All source paths below are relative to `public/images/gallery/screenshots/`. Crop coordinates are original-image pixels: `(left, top, width, height)`. No resizing/upscaling, retouching, sharpening, artificial blur, color grading, compositing, or generated pixels were applied. Sharp extraction plus WebP encoding used `quality: 92, effort: 6`; original screenshot softness remains.

| Tab | Source | Original size | Crop / output dimensions | `imagePosition` | Output bytes |
| --- | --- | --- | --- | --- | ---: |
| 2021 | `Screenshot 2026-03-16 184232.webp` | 1276 × 764 | `(0, 0, 1276, 744)` → 1276 × 744 | `50% 25%` | 22,010 |
| 2022 | `Screenshot 2026-03-16 183710.webp` | 1501 × 877 | `(0, 16, 1501, 861)` → 1501 × 861 | `50% 60%` | 43,506 |
| 2023 | `team2.webp` | 1803 × 966 | `(80, 0, 1644, 962)` → 1644 × 962 | `50% 100%` | 114,550 |

Outputs are `/images/homepage/history-2021.webp`, `/images/homepage/history-2022.webp`, and `/images/homepage/history-2023.webp`.

- **2021:** white-jersey skater kneeling with the stick held across the chest. Caption: `WHITE-JERSEY CELEBRATION / CLUB ARCHIVE`. Both aspect ratios retain the helmet, gloves, stick, knee and visible skate.
- **2022:** overhead goaltender/teammate view. Caption: `OVERHEAD CREASE VIEW / CLUB ARCHIVE`. Both players, the pink stick and blue crease remain visible; desktop trims the very top of the net mesh, but retains the red crossbar. This is not labeled as a save or goal.
- **2023:** dark-jersey team huddle. Caption: `ON-ICE TEAM HUDDLE / CLUB ARCHIVE`. Players' helmets, bodies, and skates remain visible. Some raised stick tips and background board signage are clipped by the wide desktop panel. In-scene jersey marks and board signage remain; no logo-only graphic, scorecard, or gameplay HUD is used.

The sources are already registered by `src/app/gallery/page.tsx`. The 2022 source also accompanies a March 2026 stats article in `src/lib/news.ts`; `team2.webp` accompanies a March 2026 club-finals article. These uses corroborate existing club-archive use, **not capture dates or 2021–2023 provenance**. Source filenames containing 2026 likewise do not establish capture chronology.

## Data scope

Only `src/components/homepage/home-data.ts`, these three new images, and this document were edited. Raw `archive.json` is unchanged. All season IDs, spans, roster sizes and historical accomplishments remain intact except display-only `Matt` → `Matt Hut`. Existing 2020 (`captain-xavier`), 2024 (`goalie-purple`) and 2025 (`championship`) images and positioning remain unchanged.

Captains resolve through `getNickname`: `Matt` → `MATT HUT`, `Rob` → `SLOBBY ROBBY`, `Jimmy` → `JIMMY LEMONS`. The 2022 prose expansion uses the same resolver with title-case formatting. New photo alt/caption text names scenes rather than unidentified people. Existing Xavier alt/caption output is unchanged but now derives the nickname through `getNickname`.

The final mapper resolves `historyPhotos[season.year] ?? fallbackPhoto` before returning the season and spreads the resolved photo once. This fixes TS2783 duplicate-property diagnostics. The override table is a partial record, matching its three-key coverage.

## Verification

- Sharp decoded all outputs and confirmed dimensions; total new image size is 180,066 bytes.
- Chromium against the running site on port 3000: **33 checks** (three replacement tabs at widths **1920, 1440, 1280, 1024, 820, 768, 600, 430, 390, 375, 320**, height 1000, DPR 1, reduced motion).
- All new images loaded/decoded with the expected URL, alt, caption and object-position; one selected tab; zero horizontal document overflow, out-of-viewport images or page errors. Actual panel ratios were approximately **2.1:1 desktop / 1.8:1 mobile**. Measured images ranged from ~918 × 437 at 1920 to ~274 × 152 at 320.
- Screenshots saved for all three tabs at 1440, 768, 390, 320. Reviewed full desktop panels for each replacement and representative mobile panels, plus both crop ratios in contact-sheet previews.
- Screenshot artifacts: `/tmp/history-202{1,2,3}-{1440,768,390,320}-panel.png` and corresponding `-image.png`; full 2023 sections at `/tmp/history-{1440,390}-section.png`. Initial contact sheet: `/tmp/history-photo-contact.jpg`. Browser measurements: `/tmp/history-photo-browser-check.json`. These `/tmp` artifacts are session-local, not committed assets.
- Targeted runtime assertions passed after the TS2783 refactor: six captain mappings, season IDs/spans, roster counts, accomplishment preservation, nickname-only display text, new/unchanged image mappings, and raw archive byte equality with HEAD.
- `npx eslint src/components/homepage/home-data.ts`: passed.
- `npx tsc --noEmit --incremental false`: no `home-data.ts` errors after refactor; last observed project failure was unrelated `src/app/highlights/highlights-data.ts:65` TS2739 (missing `role`, `statement`, `theme`).
- `npx tsx --test tests/homepage-live-layout.test.ts`: **12/13 passed**, including historical captain and local-asset tests. Remaining observed failure at line 216 expects `/not votes or odds/i`, but current MVP empty-state copy is `No eligible rankings yet this season.` Views/tests are handled separately; neither was edited here.

Browser screenshots precede the final type-only/map-assembly fix; post-fix assertions verified unchanged resolved content. No Safari/Firefox, physical-device, high-DPR, full-production-build or image capture-season verification is claimed.

## 2020 follow-up replacement

The user subsequently requested the **2020** Past seasons photo be changed as well. Its old `captain-xavier` highlight still is no longer referenced by the history mapper.

- Source: `public/images/gallery/screenshots/t.webp` (868 × 529), showing Bardownski teammates together in white jerseys.
- Output: `/images/homepage/history-2020.webp`, 868 × 529, 39,756 bytes. Sharp WebP quality 92 / effort 6; no upscaling, retouching, or generated pixels.
- Position: `50% 0%`, keeping the helmets/faces visible in both the desktop 2.1:1 and mobile 1.8:1 panels.
- Caption: `TOGETHER ON THE ICE / CLUB ARCHIVE`. This is an existing club image, not a verified 2020 capture or captain portrait.
- The 2020–2021 label, Xavier Laflamme captain entry, three-player roster count, and club-established description are unchanged. The previously updated 2021–2023 photos and remaining seasons are unchanged.
- Chromium checks passed at 1440, 768, 390, and 320px: correct new image/position, decoded asset, unchanged season/captain, no horizontal overflow or page errors. Desktop and mobile panel screenshots were reviewed at `/tmp/history-2020-{1440,768,390,320}-panel.png`.
