---
# obscura-qfd2
title: Lightbox close button style inconsistent between light and dark mode
status: completed
type: bug
priority: low
created_at: 2026-03-02T19:07:36Z
updated_at: 2026-03-02T19:16:07Z
---

In light mode, the lightbox close button ('x') appears as an outlined shape rather than solid. In dark mode, the close button is solid and looks better. We should make the close button consistently solid across both light and dark modes for a unified look and feel.

## Summary of Changes

Added CSS overrides in `lightbox.css` for PhotoSwipe icon variables (`--pswp-icon-color`, `--pswp-icon-color-secondary`, `--pswp-icon-stroke-color`) so that in light mode the close/arrow buttons render as solid dark shapes instead of appearing as outlines. Dark mode is preserved via both the data-theme and prefers-color-scheme media query.
