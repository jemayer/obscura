---
# comagen-byng
title: Slug generation
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:13:19Z
parent: comagen-4mko
blocking:
    - comagen-uwc1
---

Derive photo slugs from file paths: <gallery-slug>/<filename-without-extension>. Build a slug index and detect ambiguities. Per ADR-009. No slug field in sidecars.

## Summary of Changes

- Created src/slugs.ts with:
  - slugifyFilename(): normalises filenames to URL-safe slugs
  - namespacedSlug(): builds full gallery/photo slug
  - SlugIndex class: register photos, resolve slug references (full or bare), detect duplicates and ambiguities
  - Hard errors on: non-existent slugs, ambiguous bare slugs, duplicate full slugs
  - Per ADR-009
