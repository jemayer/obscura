---
# comagen-pzxg
title: Full build pipeline orchestrator
status: todo
type: task
priority: high
created_at: 2026-02-27T21:57:09Z
updated_at: 2026-02-27T21:57:09Z
parent: comagen-7f5h
---

Wire together all pipeline stages into a single build command (npm run build): load config → scan photos → read EXIF → generate sidecars → merge metadata → build slug index → load posts → parse shortcodes → build cross-reference graph → load pages → process images → render templates → generate RSS → generate sitemap → write dist/. Implement proper error handling: hard errors abort, warnings accumulate and display at the end.
