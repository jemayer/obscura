---
# comagen-uwc1
title: Gallery data loader
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:14:48Z
parent: comagen-4mko
blocking:
    - comagen-o9cn
---

Load config/galleries.yaml, scan gallery directories for photos, assemble full Gallery objects with their Photo arrays. Validate that all gallery directories declared in config exist. Handle the post-assets gallery (listed: false).

## Summary of Changes

- Created src/gallery.ts with:
  - loadGalleries(): scans gallery directories, reads EXIF, merges metadata, registers slugs, assembles Gallery objects
  - Returns galleries, populated SlugIndex, and accumulated EXIF warnings
  - Handles post-assets and any gallery (listed or unlisted) identically
  - Photos created with empty variants/thumbnailPath (populated later by image pipeline)
