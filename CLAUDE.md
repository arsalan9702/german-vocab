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
- Gender is derived, never stored: leading der/die/das in `de` (`src/lib/gender.js`). Terms containing
  `(pl.)` or `(pl)` get no gender. Colours: der cyan, die hot pink, das green; German face only.
- Study: every session shuffled; a left swipe requeues the card 3-6 later; only the first answer of a
  session sets status (retries are practice); direction de / en / mixed (`src/lib/study.js`).
  Each session first asks how many different words: 10, 20 or 30, picked at random from the pool
  (all / learning only). A size is offered if the pool fills it or it is the first size covering the pool.
- Chapters sorted by the first number in the title (Kapitel 2 before Kapitel 10); titles without a number
  last; ties by creation order (`byNumber` in `data.svelte.js`). Words in the order they were added.
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
study mode (swipe, buttons fallback, "learning only", shuffle, retries, direction), gender colours,
settings with backup/restore, GitHub gist sync, GitHub Pages deploy (`.github/workflows/deploy.yml`, every push to main),
search (Fuse.js over `fold()`ed fields in `data.svelte.js`; transposed letters in short words don't match).
Next: smarter learning algorithm (spaced repetition or similar); user is researching options first.
Then: PWA layer (offline service worker, manifest, icons).

## Resolved: page-change flicker (iOS Safari)
- Fixed itself on the GitHub Pages deploy (2026-10-18); never reproduced there. Most likely Safari was
  serving stale cached builds from the LAN dev/preview server (now `Cache-Control: no-store`).
- Leftover debug tools, removable: `?nav=none|slide` and `?grain=0` switches, `public/flicker-test.html`.
- Home-screen app (Add to Home Screen) works as of 2026-10-20: the earlier iOS 26 bugs (bottom gap,
  top edge blur) are gone.

## iOS notes
- Swipe uses touch events with a non-passive touchmove (pointer events get cancelled by Safari's pan).
- If a change seems to have no effect on the phone, suspect a stale cache first: clear Safari website data.

## Conventions
- Talk to me tersely; no emoji.
- Inspect the actual source before changing it; don't assume a file matches what was written earlier.