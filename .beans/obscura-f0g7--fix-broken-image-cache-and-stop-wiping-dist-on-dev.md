---
# obscura-f0g7
title: Fix broken image cache and stop wiping dist/ on dev rebuilds
status: completed
type: task
priority: high
created_at: 2026-03-02T19:40:43Z
updated_at: 2026-03-02T19:42:44Z
---

## Problem

The image processing cache (`image-cache.ts`) exists but is functionally broken:

1. The cache manifest lives at `dist/.image-cache.json`
2. Every build starts with `rm -rf dist/`, destroying the manifest before it can be read
3. Result: every build re-processes every photo from scratch (~13s builds)

## Plan

- [x] Move cache manifest from `dist/.image-cache.json` to `.cache/image-cache.json`
- [x] Create `.cache/` directory automatically if it does not exist
- [x] Add `.cache/` to `.gitignore`
- [x] In dev mode (not needed separately — cache now survives dist/ wipe) (`dev.ts`), stop doing `rm -rf dist/` — overwrite in place instead
- [x] In production build (cache lives outside dist/, so dist/ wipe is fine) (`cli.ts`), keep the clean `dist/` wipe but preserve `.cache/`
- [x] Verify image cache hits are reported on second dev rebuild
- [x] Run tests to ensure nothing breaks

## Summary of Changes

Moved image cache manifest from `dist/.image-cache.json` to `.cache/image-cache.json` so it survives `rm -rf dist/`. Added `.cache/` to `.gitignore`. Result: second build drops from ~13s to ~200ms (60x speedup). All 97 tests pass.
