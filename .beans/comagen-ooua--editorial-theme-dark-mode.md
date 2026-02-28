---
# comagen-ooua
title: Editorial theme — dark mode
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:56:50Z
updated_at: 2026-02-28T09:04:26Z
parent: comagen-zezk
---

Add a full dark mode variant to the editorial theme via prefers-color-scheme: dark. Override CSS custom properties for dark backgrounds, adjusted text colours, and appropriate contrast ratios.

## Summary of Changes

Dark mode implemented as part of the editorial theme CSS (comagen-kd35) via @media (prefers-color-scheme: dark). Overrides all CSS custom properties for dark backgrounds (#111110), light text (#e8e6e1), adjusted borders and tertiary colors. Automatic switching, no toggle needed.
