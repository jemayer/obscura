---
# comagen-dv93
title: Image resizing and WebP conversion
status: todo
type: task
priority: high
created_at: 2026-02-27T21:56:34Z
updated_at: 2026-02-27T22:04:02Z
parent: comagen-nakw
blocking:
    - comagen-39d4
    - comagen-d0vc
---

Using sharp, generate resized variants of each photo at configurable breakpoints (default [400, 800, 1200, 2400]). Convert all variants to WebP at configurable quality (default 85). Generate thumbnails for gallery grids. Output to dist/assets/images/<gallery-slug>/<photo-slug>/. Never copy originals to dist/.
