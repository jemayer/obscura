---
# comagen-hyrr
title: Cross-reference graph builder
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:17:04Z
parent: comagen-4mko
---

Build a bidirectional graph between blog posts and photos based on shortcode references. For each photo, compute which posts reference it (back-links). For each post, compute which photos it references. This graph is used by templates for photo permalink back-links and could support related content in future.

## Summary of Changes

- Created src/crossref.ts with:
  - buildCrossReferenceGraph(): builds bidirectional Map from posts' referencedPhotos arrays
  - getBackLinks(): returns post slugs that reference a given photo
  - getReferencedPhotos(): returns photo slugs referenced by a given post
  - Deduplicates multiple references to the same photo within a single post
