# Bardownski FC — Full Site Build Design

## Concept
`/fc/*` is a complete second website ("Bardownski FC", EA FC 26 Pro Clubs) living inside
the same Next.js app as the hockey site. Clicking the gold "Bardownski FC" CTA in the
hockey navbar routes to `/fc` and the shared top navbar **morphs with a sliding
animation** into the FC nav (gold/grey theme, FC links). Clicking "Bardownski Hockey"
morphs it back. Visual language modelled on Premier League / Champions League club
sites (Man City / Real Madrid style): huge black-weight typography, full-bleed media
heroes, fixture cards, form guide dots, league-table-style stat blocks, diagonal cuts,
gold accent lines.

## Theme (CSS vars in globals.css — already added)
- `--fc-gold: #c9a227`, `--fc-gold-light: #e6c964`, `--fc-gold-dark: #a3841c`
- `--fc-bg: #1b1d21`, `--fc-bg-dark: #141518`
- `--fc-card: #24272c`, `--fc-card-light: #2d3138`
- `--fc-border: rgba(255,255,255,0.08)`
- Wins = gold, losses = muted white, draws = grey. Text: white / white-40s.
- Typography: same Geist font, `font-black tracking-tighter` for display headings,
  `text-[10px] uppercase tracking-[0.25em]` for labels. Gold 2px accent bars before
  section headings (see existing /fc page.tsx).

## Media (all committed under public/fc/)
- `/fc/images/gallery/fc-still-01.webp` … `fc-still-29.webp` — portrait 576×1024
  gameplay stills extracted from the highlight reel.
- `/fc/images/fc-highlight-1-poster.webp` — poster frame.
- `/fc/videos/fc-highlight-1.mp4` — 60s portrait highlight reel (h264/aac).
- Club logo: shared `/images/logo/BD - logo.png`.
- Portrait media: use `object-cover` for wide crops, or lean into phone-style
  portrait frames (gallery grid, highlight player).

## Data layer — `src/lib/fcstats.ts`
Single fetch (`fetchFcStatsData`) → `{ clubStats, members, matches }` from
proclubstracker.com (5-min revalidate). Extended with:
- `FcClubMember.proHeight` (cm) + `formatHeight()` helper
- `positionLabel()` → GK / DEF / MID / FW display labels
- `computeFcForm(matches, n)` → recent W/L/D array (form guide dots)
- `computeFcRecords(data)` → club + player records from tracked matches
- `buildFcNews(data)` → auto-generated news items (match recaps, milestones,
  form pieces) with stills as cover images — no persistence needed
- `computeFcPlayerMatchAggregates(matches)` → per-player totals from the tracked
  match window (shots, saves, pass %, per-match logs) for stats deep dives

## Routes
| Route | Model | Content |
|---|---|---|
| `/fc` | Club home (PL style) | Full-height hero w/ video bg, latest result + next-match-style scoreboard strip, form guide, stats ticker, news grid, leaders preview, highlight promo, gallery strip |
| `/fc/fixtures` | Fixtures & Results | All tracked matches grouped by competition (League/Playoff/Friendly) w/ filters, expandable per-match player ratings, result badges, forfeit tags |
| `/fc/squad` | Squad | EPL-style player cards grid (portrait stills as card art), position groups, pro name/height/OVR, per-player quick stats |
| `/fc/stats` | Stats centre | Club season block, leaderboards (G/A/Pts/Rating/MOTM/Pass%/Tackles/Saves), per-player selector w/ detail panel + match log |
| `/fc/records` | Records | Club records + player records computed live, gold "hall of fame" cards |
| `/fc/gallery` | Gallery | Masonry/grid of the 29 stills + lightbox |
| `/fc/highlights` | Highlights | Phone-frame video player for the reel, auto-generated "moments" (deep-links w/ ?t= timestamps) |
| `/fc/news` | News | Auto-generated articles list + `/fc/news/[id]` detail |

## Chrome
- `Navbar.tsx` (shared, client): detects `pathname.startsWith("/fc")`, morphs theme,
  slides link sets in/out (AnimatePresence, staggered x-slide), CTA toggles between
  gold "Bardownski FC" → red "Bardownski Hockey". Mobile overlay themed too.
- `SiteFooter` client wrapper: hockey `Footer` vs `FcFooter` by pathname.

## Conventions
- Server components fetch via `fetchFcStatsData()`; interactive parts split into
  `*Client.tsx` (same pattern as hockey pages).
- Every page exports `metadata` w/ "… | Bardownski FC" titles.
- Graceful null-data fallback card on every page (API can be slow/cold).
- All pages set `style={{ backgroundColor: "var(--fc-bg)" }}` w/ subtle gold radial
  accents (copy pattern from existing /fc/page.tsx).
