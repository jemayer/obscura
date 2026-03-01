---
# comagen-tvjb
title: Consistent positioning of all elements in photo detail view
status: completed
type: task
priority: normal
created_at: 2026-03-01T15:06:38Z
updated_at: 2026-03-01T16:58:06Z
---

Currently, the (EXIF/sidecar) information block changes its position, dependent
on whether we have a caption in place or not. Sometimes, the information block
is on the right, sometimes it is on the left. This is inconsistent and doesn't
look like we made this product with love. 

Please assure all elements keep their positions.

## Summary of Changes

Root cause: `.photo-detail__body` uses a 2-column CSS grid at desktop (2fr 1fr), but child elements flowed into columns based on DOM order via auto-placement. When the optional caption was absent, the EXIF meta block shifted from column 2 to column 1.

Fix: assigned explicit `grid-column` and `grid-row` positions at the 48em breakpoint:
- Title: column 1, row 1
- Caption: column 1, row 2
- EXIF meta: column 2, spanning all rows (pinned to top-right)
- Tags, backlinks: column 1
- Back nav: spans both columns

Now the EXIF info block stays on the right regardless of whether caption/tags/backlinks are present.
