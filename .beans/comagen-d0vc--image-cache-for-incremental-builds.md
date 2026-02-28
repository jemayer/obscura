---
# comagen-d0vc
title: Image cache for incremental builds
status: completed
type: task
priority: high
created_at: 2026-02-27T22:03:47Z
updated_at: 2026-02-28T08:58:33Z
parent: comagen-nakw
---

Implement content-hash image cache. Before processing a photo, hash source file contents + processing params (breakpoints, quality). If hash matches dist/.image-cache.json, skip processing. Cache invalidates automatically when params change. Clean build (rm -rf dist/) reprocesses all. Per ADR-013.

## Summary of Changes

- Created src/image-cache.ts with:
  - Content-hash cache using SHA-256 of file contents + processing params
  - Cache manifest stored at dist/.image-cache.json
  - processPhotoWithCache(): checks cache before processing, returns fromCache flag
  - processAllPhotosWithCache(): batch processing with cache, logs hit rate
  - Cache invalidates automatically when breakpoints or quality change
  - Clean build (rm -rf dist/) reprocesses everything
  - Per ADR-013
