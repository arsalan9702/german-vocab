# German Vocab

Phone-only (iPhone, Safari) flashcard web app for learning German vocab.

## Stack
- Svelte 5 (runes) + Vite, Dexie (IndexedDB), deployed to GitHub Pages.
- `base: './'` in vite.config.js; hash routing (`#/chapter/:id`) because Pages has no SPA fallback.
- Fonts self-hosted via Fontsource. Grain is a tiled PNG from `scripts/make-grain.mjs`.

## Product rules
- UI text is English only. German appears only as flashcard content.
- Chapters and words can be created and edited, never deleted.
- Word fields: de, deExample, en, enExample, status (learning | known), chapterId.
- Chapters in creation order; words in the order they were added.
- Backup: JSON export/import. Merge by id (newer updatedAt wins) plus replace-all behind a confirm that auto-exports first.
- Device is the source of truth and works offline. Optional cloud copy in a private GitHub gist
  (`src/lib/sync.svelte.js`): pull, merge by id (newer updatedAt wins), push if changed. Runs on open,
  on app hide/show, when back online, and 3s after any write. Replace-all pushes without pulling.

## Design
Neo-brutalist 90s/Y2K: lavender/pink pastels, cyan/yellow/pink/green accents, thick black borders,
hard offset shadows (no blur), pill buttons that press into their shadow, stickers, grain.
Animate only transform and opacity. Performance matters.

## Architecture
- `src/lib/store.js`: all writes and validation (ValidationError with a field).
- `src/lib/data.svelte.js`: whole dataset in memory via liveQuery; pages read it synchronously.
- `src/lib/router.svelte.js`: hash router + page slide animation.
- Routes in `src/routes/`, components in `src/components/`, styles in `app.css` and `screens.css`.

## Roadmap
Done: tokens, data layer, chapters, chapter detail, add/edit form, single-card view,
study mode (swipe right = known, left = learning, buttons fallback, "learning only" option, every session shuffled),
settings with backup/restore, GitHub gist sync, GitHub Pages deploy (`.github/workflows/deploy.yml`, every push to main).
Next: fuzzy search (Fuse.js, diacritics ignored), PWA layer.

## Parked bug: page-change flicker (iOS Safari)
- Parked 2026-10-15: cosmetic, first-load only. Resume with the switches below and `/flicker-test.html`.
- Every page change flickers in place (content does not move).
- It disappears after reloading the tab (now once; earlier 5-6 times) and returns after the tab is closed and reopened.
  Something cold on a fresh load becomes cached; CSS alone cannot explain this.
- Present in both the dev server and `npm run build && npm run preview`.
- Already tried without success: View Transitions API (removed), cloning the old page for the slide (removed),
  moving the grain off body::after, preloading data into memory, preloading fonts, will-change on .view.
- Debug switches (set before the `#`, combinable with `&`): `?nav=none` (no animation), `?nav=slide` (slide without opacity),
  `?grain=0` (no grain). Not yet run on a fresh tab.
- Suspect: Safari served a stale cached build (found while debugging swipe). Dev and preview now send
  `Cache-Control: no-store`. Recheck the flicker after clearing Safari website data.
- `public/flicker-test.html` is a plain-HTML page (no Svelte, no animation) to tell Safari from app.
- The installed home-screen app is shelved for now because of iOS 26 bugs (bottom gap, top edge blur).
  Test in a Safari tab.

## iOS notes
- Swipe uses touch events with a non-passive touchmove (pointer events get cancelled by Safari's pan).
- If a change seems to have no effect on the phone, suspect a stale cache first: clear Safari website data.

## Conventions
- Talk to me tersely; no emoji.
- Inspect the actual source before changing it; don't assume a file matches what was written earlier.