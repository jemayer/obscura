---
# comagen-gsj7
title: 'Bug: Sometimes, initial grid rendering only shows slim lines instead of full images'
status: completed
type: task
priority: high
created_at: 2026-03-01T14:28:49Z
updated_at: 2026-03-01T16:52:17Z
---

Sometimes, when loading a page with a photo grid, the images get rendered as
slim lines, but not as full pictures. This happens in Vivaldi (Chromium based)
and Safari, so I doubt it's only a browser issue.

Please investigate and fix, if possible.

## Investigation

Root cause: race condition between masonry layout calculation and image loading.

### How it happens
1. **Masonry CSS** uses `grid-auto-rows: 4px` with `aspect-ratio: auto` on items
2. `layoutMasonry()` computes `gridRowEnd` spans based on `img.naturalHeight`
3. With `loading="lazy"`, images below the fold haven't loaded when `layoutMasonry()` runs
4. `naturalHeight` is 0 → function returns early → items stay at 4px height = slim lines
5. `localStorage` override makes it worse: if user previously chose masonry, it applies to all grids immediately, even before `window.load`

### Fix plan
- [x] Add per-image `load` event listeners that re-trigger masonry layout for their grid
- [x] Use image `onload` + `img.complete` to catch lazy-loaded and cached images
- [x] Add a CSS fallback so uncomputed masonry items have a reasonable min-height

## Summary of Changes

Two-part fix:
1. **CSS fallback**: Added `grid-row-end: span 40` to `.gallery-grid--masonry .gallery-item` so items have a reasonable default size before JS computes the real span
2. **Per-image load observers**: New `observeMasonryImages()` function attaches `load` event listeners to each image. Already-loaded images (cached via `img.complete`) are laid out immediately; lazy-loaded images are laid out as they load. This is called both during early masonry init and when toggling to masonry mode.
