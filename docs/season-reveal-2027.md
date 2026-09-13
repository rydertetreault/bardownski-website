# Bardownski 2027 announcement publication

## Approved media

The user supplied `Bardownski 2027.mp4` in the repository root and explicitly authorized publication. The published file is an exact copy, not a re-edit or transcode:

- URL: `/videos/announcements/bardownski-2027.mp4`
- Size: **63,746,155 bytes**
- SHA-256: **6f6d1f0d753ec369ca0a24635b0f7e1bf7c4fb465bc7311fc016b58c308f5570**
- H.264 / AAC, 1920×1080, 30 fps, **155.066667 seconds (2:35)**
- `moov` precedes `mdat` (fast-start already present).
- Poster: original-color frame at 138 seconds showing the home/away/alternate lineup, exported at 1600×900 WebP.
- English WebVTT: `public/videos/announcements/bardownski-2027.en.vtt`, 44 nonoverlapping cues derived from the final edit's word-timed transcript, plus bracketed visual/music descriptions. It preserves the edited narration rather than rewriting it. This was checked against final timeline data and sampled video frames, not freshly transcribed by ear.
- Readable transcript: `src/lib/season-reveal-transcript.json`.

The original root file and editing workspace are not committed. Only the deliberate public copy, poster and captions are deployed.

## Homepage and article

- Story: `/news/bardownski-2027-reveal`
- Title: **Bardownski 2027: New Jerseys, New Leadership, Same Club**
- Date: September 13, 2026; category: Announcements.
- `src/lib/season-reveal.ts` is the dependency-free shared metadata source.
- The new manual article is `featured: true`; `featureArticles()` pins it without changing dates or duplicating it. Homepage still shows three news cards, and the News journal leads with the same story.
- Homepage hero now advertises the reveal and uses its true-color poster. The surrounding approved Variation 4 layout, archive sections and current-tracker link remain unchanged.
- “Watch the reveal” enhances into the existing accessible dialog and returns focus on close. Its real article anchor works without JavaScript. The featured news card opens the full article instead of a text-only modal.
- No autoplay or homepage video download before selection. Article/journal video uses `preload="none"`, poster and captions, with an accessible load-error retry and direct-file fallback.
- Article includes page/Open Graph metadata, readable transcript, leadership link and original film.

## Factual content and history

The film announces **Xavier Laflamme as captain** and **Matt Hut as assistant captain**, with no second assistant. The roster now reflects only those two letters; the third existing leadership card links to the film. Returning roster statistics and jersey-number qualifiers remain historical/unconfirmed as appropriate.

Verified final-film uniforms: teal home with purple/white striping and black pants; white/off-white away with teal/purple striping and teal pants; purple alternate with teal/white striping and purple pants. Uniform models wear 24, but the article does not assign that number to either leader or claim new roster numbers. No fourth/blackout uniform is announced.

The narration says “307 games” while the verified frozen archive contains **366 games** and a **207–144–15** record. The media and dialogue captions are unchanged. The article includes an explicit archive note; no original stats or older articles are rewritten to match the spoken discrepancy.

## Verification

```sh
npx tsx tests/season-reveal.test.ts
for test in tests/*.test.ts; do npx tsx "$test" || exit; done
npx tsc --noEmit
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROME=/path/to/chrome \
AXE_PATH=/path/to/axe.min.js node scripts/check-season-reveal.mjs
```

`SITE_URL` can target an optimized local build or the deployed site. The reveal browser check covers 1440/768/390/320px, explicit featured order, original-color poster, deferred playback, actual media metadata/play/seek, loaded caption cues, dialog cleanup/focus return, article/transcript, load-error recovery, roster leadership, no-JS links/player and axe checks. The existing homepage regression suite also passes. Automated checks do not replace a complete manual accessibility audit.

## Live MVP and POTW follow-up

The same publication also enables current awards calculation, per the user's follow-up. `src/lib/hockey-awards.ts` derives and validates season MVP and UTC-week performances from the NHL27 tracker data only. Each successful sync persists the award audit inside the season-namespaced snapshot. Page reads recalculate week boundaries so Monday rollover never labels the previous race as current.

- MVP preserves the existing position-adjusted raw scoring formula, five games per scored role, highest eligible role per player, exact shared-score ranks, and no displayed betting odds.
- POTW uses the existing position-aware weekly skater/goalie weights, with a clearly disclosed three-recorded-role-game qualification gate for selections. Current-week leaders are not final awards; the last completed UTC week has separate eligible winners. Tied scores share ranks/winners. Smaller samples remain visibly provisional.
- Weeks run Monday 00:00 UTC inclusive to the next Monday exclusive. Known missing games stay missing. Private/synthetic/future/out-of-week records and invalid/conflicting duplicates do not score. Real partial/DNF match performances remain usable when their reported player statistics validate; goalie shutouts are period-weighted and never inferred from an empty zero-shot record.
- The homepage weekly and MVP sections now use current awards, not last year's featured POTW/model rankings. Past award winners, six historical seasons and archived match cards remain explicitly historical.
- Automated written articles remain paused. Calculating POTW does not run old article generators or write any legacy POTW keys.

At the verification snapshot there were seven captured current games: Matt Hut led MVP at 404.05 (12 season games), Xavier Laflamme was second at 277.98 (seven games); JRT IV led the current POTW race at 127.7 from three goalie appearances, 52 saves and 83.9% aggregate SV%. These are time-specific observations, not fixed content.

Checks: `tests/hockey-awards.test.ts`, `scripts/check-hockey-awards.mjs`, and all earlier tracker/award/season suites. They cover role changes, raw MVP consistency, weekly rate aggregation, duplicates, eligibility, ties, partial/no-shot goalie games, future timestamps, UTC week/year rollover and unchanged historical data.
