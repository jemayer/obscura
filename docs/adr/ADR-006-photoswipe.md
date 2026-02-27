# ADR-006: PhotoSwipe for Lightbox

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Gallery pages need a full-screen lightbox for browsing photos with keyboard and swipe navigation. The lightbox must:

- Display photos at full resolution with smooth transitions
- Support keyboard navigation (arrow keys, escape)
- Support touch/swipe on mobile
- Show photo metadata (title, location, camera, date)
- Include a link to the photo's permalink page
- Be dependency-free (no jQuery or other runtime libraries)

Alternatives considered:
- **Lightbox2** — jQuery dependency, less maintained
- **GLightbox** — good but smaller community, fewer features
- **Custom implementation** — significant effort for gestures, accessibility, and edge cases

## Decision

Use PhotoSwipe as the lightbox library.

## Consequences

- Zero dependencies, small footprint (~15 KB gzipped)
- Built-in gesture support (pinch to zoom, swipe to navigate)
- Accessible (keyboard navigation, ARIA attributes)
- Highly customisable — metadata overlay and "View details" link can be added via its API
- Well-established library with extensive documentation
- Responsive image support via `srcset` — the lightbox can load the appropriate variant
