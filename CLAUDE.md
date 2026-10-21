# Bardownski site: notes for agents

## Seeing the rendered site (screenshots)

You can screenshot any page and have a vision model describe it, even without image input:

```bash
node scripts/screenshot-review.mjs http://localhost:3000/news/<id> --width 1440 \
  --ask "Does the hero photo line up with the text column? Anything broken?" \
  --model anthropic/claude-sonnet-4.5
```

- **Key:** the user's OpenRouter API key is in `~/.synaps-cli/auth.json` under `openrouter.key` (or set `OPENROUTER_API_KEY`). The script reads it itself. Never print, log or commit the key.
- **Browser:** Chromium comes from the Playwright cache (`~/.cache/ms-playwright/chromium-*`). There are no npm deps. Flags: `--width`, `--height`, `--scroll ".selector"`, `--full`, `--out file.png`, `--model`.
- **Model choice:** `google/gemini-2.5-flash` (the default) is cheap but unreliable for pixel alignment. Use `anthropic/claude-sonnet-4.5` for layout or alignment questions. Confirm layout claims with DOM measurements (`getBoundingClientRect`) as well.
- **Verify visual fixes:** check every visual fix this way before reporting it done.

### Describing videos and images

`scripts/describe-media.mjs` samples frames from a clip into one contact sheet and asks the vision model what happens. Use it for titles and alt text. It uses the same key, and needs `FFMPEG` (or `ffmpeg` on PATH). One way to get it: `uv run --with imageio-ffmpeg python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`.

```bash
FFMPEG=... node scripts/describe-media.mjs public/videos/matt2.mp4 --frames 16 --context "Clip of Matt Hut #8"
```

- **Trust:** prefer on-screen title cards ("HAT TRICK", "SPECTACULAR SAVE") over the model's guesses. If two passes disagree, only state what both agree on.
- **Highlight titles:** keep them short. Say what the video is, plus one expressive word: "Crazy Save", "Huge Hit", "Nasty Dekes", "Sick Goal Compilation". Don't try to describe the exact play (the model gets details wrong). No numbers or counts; season tapes are the only exception (see below). Never use generic "Clip N", and don't repeat the player's full name, which heads their section.
- **Photo titles:** short names only, 1–4 words: "Lights Out", "Team Huddle", "Line Change", "On the Rush" (the names the user approved). Never describe the photo ("a Bardownski player rushes the puck…"); people can see it. Alt text is the same short name. **Never mention colours or which jersey.** The user approved the first five gallery titles; keep them: "Matt Hut Celebrates in Front of the Net", "Matt Hut Celebrates With JRT IV", "Matt Hut Carrying the Puck Behind the Net", "JRT IV Lunging for the Save", "Bardownski Players Celebrate as Hats Cover the Ice". Every gallery title must be unique, with no duplicate photos. Don't use stills grabbed from compilations or highlight reels (the user removed `captain-xavier.webp`, "Flying").
- **Season tapes:** titled by player and season, as the user chose: "JRT 2025–26", "Xavier 2023–24", "Xavier 2024–25", "Xavier 2025–26".
- **Saves vs goals:** never call a clip a goal against unless the puck clearly goes in. `Ryder1` is a save.

## Drop-ins (guest players): hard rule

Drop-ins are any of "our" players in a match who are **not** on the club roster (the EA snapshot's `members` list).

- **Awards:** they must **never** be included in Player of the Week, whether standings, leaders, winners or history. `weekly()` in `src/lib/hockey-awards.ts` filters on the roster (`calculateWeeklyAwardHistory(matches, asOf, members)` requires it). An empty roster means nobody qualifies.
- **News:** they must **never** be mentioned by name in news articles, whether manual (`src/lib/news.ts`) or generated.
- **Elsewhere:** the Line Planner also shows club members only.

## News articles

- **Player names:** use nicknames (`src/lib/nicknames.ts`), e.g. Matt Hut, Xavier Laflamme, JRT IV / Jean Rene Tetreau IV.
- **Stats:** must come from real data: the NHL27 tracker snapshot and matches in Upstash, keyed under `hockey:nhl27:2026-2027:common-gen5:29202`. Never invent numbers.
- **Photos:** use this season's media (`media/`, see `media/README.md`). Stills are black and white. Don't reuse old-season photos for current-season stories.
- **Layout:** article photos match the text column, shown whole at their natural aspect ratio (never cropped). The reveal film matches the text column too (`src/app/news/article.css`).

## Media library

- **Gallery:** every photo and video on the site belongs in the gallery (`src/app/gallery/page.tsx`), except jersey showcases (videos or customization screenshots), logos and exact duplicates. Video previews are black and white; opened media (lightbox/player) shows in colour.
- **Colour when enlarged:** add `data-full-color` to an enlarged `<img>` to lift the site-wide grayscale. Use `ZoomableImage` / `MediaLightbox` from `src/components/ui/MediaLightbox.tsx`.
- **Highlights:** any video featuring a player also goes in that player's highlights (`src/app/highlights/highlights-data.ts`), with a poster in `public/images/highlights/` and a monochrome copy (`src/lib/photo-posters.ts`, then `npx tsx scripts/generate-monochrome-posters.ts`).
- **Records:** log new web copies in the `media/README.md` table.
