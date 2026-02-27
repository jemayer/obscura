# ADR-013: Content-Hash Image Cache for Incremental Builds

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

The image pipeline is the slowest part of the build. Each photo is resized to multiple breakpoints and converted to WebP — processing a single high-resolution image takes hundreds of milliseconds, and a portfolio of 100+ photos means minutes per full build.

During development and content authoring, most builds change only one or two photos (or none at all — just Markdown or templates). Reprocessing unchanged images on every build wastes time and makes the development feedback loop painfully slow.

## Decision

Implement a content-hash image cache. Before processing a photo, compute a hash of the source file's contents and the processing parameters (breakpoints, quality). If the hash matches a previous build, skip processing and reuse the existing output.

The cache manifest is stored at `dist/.image-cache.json` (gitignored along with the rest of `dist/`). It maps `<source-path>:<params-hash>` to the set of generated output files.

## Consequences

- Incremental builds only process new or modified photos — typical rebuild time drops from minutes to seconds
- The cache is invalidated automatically when processing parameters change (e.g. adding a breakpoint or changing WebP quality)
- The cache lives in `dist/`, so a clean build (`rm -rf dist/`) reprocesses everything — this is the expected escape hatch
- No external cache service or database — just a JSON file
- Adds modest complexity to the image pipeline (hash computation, cache lookup, cache write) but the DX improvement is significant
