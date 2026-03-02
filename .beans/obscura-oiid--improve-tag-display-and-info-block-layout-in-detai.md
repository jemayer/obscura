---
# obscura-oiid
title: Improve tag display and info block layout in detail view
status: completed
type: bug
priority: low
created_at: 2026-03-02T19:11:37Z
updated_at: 2026-03-02T19:16:11Z
---

Two related layout issues in the photo detail view:

1. **Tags floating in negative space**: The tag display is currently detached from the main information block. It should be integrated into the same block where EXIF/sidecar metadata is shown, so everything feels cohesive.

2. **Info block needs more horizontal space**: Some lens descriptions (especially from iPhones) produce long strings that wrap awkwardly. The info block should have more horizontal breathing room to accommodate these longer values gracefully.

## Summary of Changes

1. Moved tag display from a separate floating div into the photo-meta block as a new row with a "Tags" label, matching the EXIF/sidecar info layout.
2. Widened the info block column ratio from 2fr/1fr to 3fr/2fr to give longer lens strings (e.g. iPhone lenses) more breathing room.
3. Added min-width: 0 on meta values to allow proper text wrapping within the grid.
