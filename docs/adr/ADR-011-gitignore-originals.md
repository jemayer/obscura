# ADR-011: Gitignore Strategy for Original Images

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Photography portfolios contain large image files — a single RAW export as JPEG can be 20-50 MB. A gallery of 100 photos could easily exceed 2 GB. Git is not designed for large binary files, and hosting services (GitHub, GitLab) impose repository size limits.

At the same time, the project contains many files that *should* be version-controlled: sidecar YAML files, Markdown posts and pages, configuration, templates, and documentation.

## Decision

Original image files are gitignored by extension:

```
content/photos/**/*.jpg
content/photos/**/*.jpeg
content/photos/**/*.png
content/photos/**/*.tiff
content/photos/**/*.tif
content/photos/**/*.webp
```

The `dist/` output directory is also gitignored.

Everything else is committed: sidecar YAML files, Markdown content, config files, templates, themes, Beans tickets, ADRs, documentation, and the PRD.

## Consequences

- The repository stays small and fast to clone, regardless of portfolio size
- Sidecar YAML files (which live alongside the images) are committed, preserving the metadata library
- Users must manage original images outside of git (local backup, cloud storage, NAS, etc.)
- A fresh clone requires the user to provide their images before building — the build will warn about missing images referenced by sidecars
- This is the standard approach for content-heavy static sites and aligns with how tools like Hugo and Gatsby handle large assets
