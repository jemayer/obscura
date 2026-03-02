---
# obscura-xryx
title: Redesign homepage intro as two-column magazine layout
status: completed
type: feature
priority: normal
created_at: 2026-03-02T20:44:59Z
updated_at: 2026-03-02T20:47:18Z
---

Reduce the vertical footprint of the homepage intro by switching to a CSS column layout on desktop, so photos appear sooner. Inspired by magazine editorial layouts.

- [x] Switch homepage intro to CSS column-count: 2 on desktop
- [x] Use full content width instead of narrow
- [x] Left-align text (editorial standard for flowing prose)
- [x] Adjust font size to ~21px for two-column readability
- [x] Add break-inside: avoid so each paragraph stays in its own column
- [x] Add subtle top border to frame the section
- [x] Reduce vertical padding/margin
- [x] Verify build and visual result

## Summary of Changes

Converted homepage intro from a single centered narrow column (2.25rem) to a CSS two-column magazine layout on desktop. Text is now left-aligned at 21px in the display serif, with a 4rem column gap and a top border. Each paragraph stays in its own column via break-inside: avoid. The h1 heading spans both columns. Vertical footprint reduced by ~45% so photos appear much sooner.
