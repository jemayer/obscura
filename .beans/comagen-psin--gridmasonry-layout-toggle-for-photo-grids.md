---
# comagen-psin
title: Grid/masonry layout toggle for photo grids
status: todo
type: feature
priority: normal
created_at: 2026-02-28T21:17:27Z
updated_at: 2026-02-28T21:17:27Z
---

Add a toggle to switch between uniform grid and masonry layout on every photo grid (homepage, gallery pages, tag pages).

- Add optional `layout: grid | masonry` field to gallery config for per-gallery defaults
- CSS: masonry layout via CSS columns, grid layout via CSS Grid (existing)
- JS: toggle button that swaps layout class, persists in localStorage
- Toggle should be minimal and elegant — fits the editorial aesthetic
- Default to grid if no gallery-level config is set
