---
# comagen-1qk6
title: Fix nested anchor tags breaking photo grids
status: completed
type: bug
created_at: 2026-03-01T13:53:46Z
updated_at: 2026-03-01T13:53:46Z
---

Nested `<a>` tags inside `<a class="gallery-item">` in gallery.html, tag.html, and location.html caused invalid HTML. Browsers auto-closed the outer link, breaking photo clickability and downstream links like 'All locations'.

## Summary of Changes

Reverted location overlay elements in grid templates (gallery.html, tag.html, location.html) from `<a>` back to `<span>`. Location links only appear on photo.html detail pages where they're not nested inside another link.
