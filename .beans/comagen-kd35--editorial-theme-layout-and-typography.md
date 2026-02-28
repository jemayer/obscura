---
# comagen-kd35
title: Editorial theme — layout and typography
status: completed
type: task
priority: high
created_at: 2026-02-27T21:56:50Z
updated_at: 2026-02-28T09:04:26Z
parent: comagen-zezk
blocking:
    - comagen-ooua
---

Build the editorial theme: light background, strong typography inspired by Foam magazine and LensCulture. Use CSS custom properties for all colours, spacing, and typography values. Implement the full page layout: header/nav, content area, footer. Responsive design with mobile-first approach.

## Summary of Changes

- Created themes/editorial/assets/css/style.css with:
  - Full CSS custom properties system (typography, color, spacing, layout, transitions)
  - Magazine-inspired layout: sticky header, content area, footer
  - Strong typography with Playfair Display for headings, system stack for body
  - Gallery grid: 1→2→3→4 columns across breakpoints
  - Photo cards for shortcode embeds in blog posts
  - Blog typography: clean reading experience with narrow content width
  - Minimal navigation with animated underline
  - Photo permalink page layout with metadata table and back-links
  - Homepage recent shots section
  - 404 page styling
  - Gallery index cards
  - Utility classes
