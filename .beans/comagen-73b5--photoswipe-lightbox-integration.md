---
# comagen-73b5
title: PhotoSwipe lightbox integration
status: completed
type: task
priority: high
created_at: 2026-02-27T21:56:50Z
updated_at: 2026-02-28T09:07:08Z
parent: comagen-zezk
---

Integrate PhotoSwipe into gallery pages. Clicking a photo in the grid opens the lightbox with full-screen display, keyboard navigation (arrows, escape), swipe navigation on mobile, metadata overlay (title, location, camera, date), and a 'View details →' link to the photo permalink page. Use responsive srcset in the lightbox.

## Summary of Changes

- Installed photoswipe package
- Created themes/editorial/assets/js/lightbox.js:
  - IIFE that initializes PhotoSwipe on gallery grids
  - Reads slide data from data-pswp-* attributes on gallery items
  - Custom caption UI: title, metadata (location, camera, date), 'View details' permalink
  - Keyboard and swipe navigation
- Created themes/editorial/assets/css/lightbox.css:
  - Caption overlay styling matching editorial theme
- Created src/photoswipe.ts:
  - copyPhotoSwipeAssets(): copies PhotoSwipe JS and CSS to dist/assets/vendor/photoswipe/
