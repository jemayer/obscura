---
# comagen-lbox
title: Fix lightbox vertical alignment
status: completed
type: bug
priority: high
created_at: 2026-02-28T16:00:00Z
updated_at: 2026-02-28T16:00:00Z
---

PhotoSwipe images start at roughly half the screen height instead of being centred. Root cause: `data-pswp-height` is always empty in the gallery and homepage templates. PhotoSwipe needs both width and height to calculate image placement.

Fix: store image height alongside width in `ImageVariant` (or separately on `Photo`), and pass it through to the `data-pswp-height` attribute. The height must come from sharp during image processing.
