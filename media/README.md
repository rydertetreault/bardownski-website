# Media library

Source footage and photos for the site, organised per player. **Drop files here;
nothing in this folder is deployed or committed** (see "How it's wired" below).
When a clip or photo is used on the site, a web-optimised copy is produced into
`public/` and referenced from code — the original stays here untouched.

Run `npm run media` for an inventory (per player: file counts, sizes, clip durations).

## Layout

```
media/
├── inbox/                 ← not sure where something goes? drop it here, it gets sorted
├── team/
│   ├── b-roll/            team/arena/bench footage that isn't about one player
│   ├── highlights/        finished team clips (intros, montages)
│   ├── jerseys/           jersey reveal / showcase videos and renders
│   └── photos/            team photos, screenshots, group shots
└── players/
    └── <player>/
        ├── b-roll/        RAW footage: full shifts, unedited captures, anything to cut from
        ├── highlights/    FINISHED clips: a goal, a save, a reel — usable as-is
        └── photos/        stills: portraits, celebrations, screenshots, memes
```

### Player folders

Folder names are the roster first names used in code (`src/lib/nicknames.ts`), so
they stay stable even if a nickname changes.

| Folder    | Nickname on site      | EA gamertag   |
|-----------|-----------------------|---------------|
| `ryder`   | Jene Rene Tetreau IV  | Rydayro       |
| `rob`     | Slobby Robby          | S1obbyRobby   |
| `matt`    | Matt Hut              | Mhut8         |
| `dylan`   | Xavier Laflamme       | u4 Pablo      |
| `colin`   | Wolfgang Mozart       | oP wet        |
| `kaden`   | Gotta Be              | u4 Hood       |
| `jimmy`   | Jimmy Lemons          | Julio 3026    |
| `logan`   | Top G                 | oP Ding1633   |

New player → add a folder with the same three sub-folders (and add them to
`nicknames.ts`).

### b-roll vs highlights

- **b-roll** = raw. Long captures, whole periods, multiple plays in one file, stuff
  with dead time. It's material to *cut from* — hero backgrounds, article loops,
  montage building blocks.
- **highlights** = done. One clean moment or an edited reel that could go on the
  `/highlights` page as-is.

If a file could be either, put it in `b-roll`.

## Naming

Anything descriptive works. Preferred pattern when you know it:

```
YYYY-MM-DD_what-happened_vs-opponent.mp4      2026-09-14_ot-winner_vs-sharks.mp4
YYYY-MM-DD_what-it-is.png                      2026-09-14_hat-trick-celly.png
```

Avoid renaming files after they've been used on the site — the `public/` copy
carries a note of its source name so the original can be found again.

## Formats & sizes

- Video: `.mp4` (H.264) or `.mov` straight off the console/capture card is fine.
  Don't pre-compress — the web copy is encoded from the best source available.
- Photos: `.png` / `.jpg` / `.heic` / `.webp`, full resolution.
- No size limit here. Web copies in `public/` are kept small (GitHub and Vercel
  both reject files over 100 MB, and page weight matters).

## How it's wired

- `.gitignore` ignores everything under `media/` except this README and the
  `.gitkeep` placeholders, so the folder skeleton exists in every clone but the
  footage never hits GitHub.
- `.vercelignore` excludes `media/` from deploys.
- `scripts/media-inventory.mjs` (`npm run media`) lists what's here, with mp4/mov
  durations read from the file headers — no ffmpeg needed.

## Already-published clips

The clips that were live on `/highlights` before this library existed have been
copied into each player's `highlights/` folder (originals remain in `public/videos/`
because the site references them there). `public/bardownski-hockey-media/` is an
older, untracked duplicate of the same files and can be deleted.
