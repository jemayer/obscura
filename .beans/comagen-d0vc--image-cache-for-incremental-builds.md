---
# comagen-d0vc
title: Image cache for incremental builds
status: todo
type: task
priority: high
created_at: 2026-02-27T22:03:47Z
updated_at: 2026-02-27T22:03:47Z
parent: comagen-nakw
---

Implement content-hash image cache. Before processing a photo, hash source file contents + processing params (breakpoints, quality). If hash matches dist/.image-cache.json, skip processing. Cache invalidates automatically when params change. Clean build (rm -rf dist/) reprocesses all. Per ADR-013.
