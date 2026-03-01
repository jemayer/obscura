---
# comagen-977e
title: Fix lightbox caption spacing and light-mode contrast
status: completed
type: bug
priority: normal
created_at: 2026-03-01T13:01:48Z
updated_at: 2026-03-01T13:01:57Z
---

Two visual fixes in lightbox.css: (1) increase caption top padding for breathing room, (2) replace gradient scrim with solid dark bar and hardcode light text colors so captions are readable in both light and dark themes.

## Summary of Changes

Modified `themes/editorial/assets/css/lightbox.css`:

1. **Increased caption padding** — changed from `1rem 1.5rem` to `1.5rem 1.5rem 1.25rem` for more breathing room above the text.
2. **Solid dark caption bar** — replaced the gradient-to-transparent scrim with `rgba(0, 0, 0, 0.7)` background + `backdrop-filter: blur(8px)` for a consistent dark bar.
3. **Hardcoded light text colors** — caption title uses `#f0eeea`, meta/link text uses `rgba(255, 255, 255, 0.65)`, link borders use `rgba(255, 255, 255, 0.3)` / `0.6` on hover. No longer theme-dependent, readable in both light and dark modes.
