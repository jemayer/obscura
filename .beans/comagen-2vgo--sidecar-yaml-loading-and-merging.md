---
# comagen-2vgo
title: Sidecar YAML loading and merging
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:12:16Z
parent: comagen-4mko
blocking:
    - comagen-byng
---

Load sidecar YAML files and merge them with EXIF data. Sidecar values win on conflict. Return a unified Photo metadata object. Handle missing sidecars gracefully (EXIF-only is valid).

## Summary of Changes

- Created src/metadata.ts with:
  - loadAndMergeMetadata(): loads sidecar YAML for a photo and merges with EXIF data
  - mergeMetadata(): pure merge function (exported for testing) — sidecar values win on conflict
  - Handles missing sidecars gracefully (EXIF-only is valid)
  - Parses sidecar date strings to Date objects
  - Ignores empty string values in sidecars (don't override EXIF with blanks)
