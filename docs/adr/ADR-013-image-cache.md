# ADR-013: Content-Hash Image Cache for Incremental Builds

- **Date:** 2026-02-27
- **Status:** Accepted
- **Updated:** 2026-09-04

## Context

The image pipeline is the slowest part of the build. Each photo is resized to multiple breakpoints and converted to WebP — processing a single high-resolution image takes hundreds of milliseconds, and a portfolio of 100+ photos means minutes per full build.

During development and content authoring, most builds change only one or two photos (or none at all — just Markdown or templates). Reprocessing unchanged images on every build wastes time and makes the development feedback loop painfully slow.

## Decision

Implement a content-hash image cache. Before processing a photo, compute a hash of the source file's contents and the processing parameters (breakpoints, quality, `max_dimension`) together with a pipeline version constant. If the hash matches a previous build, skip processing and reuse the existing output.

The cache manifest is stored at `.cache/image-cache.json` (gitignored). It maps `<photo-slug>` to a cache key (`SHA256(file):SHA256(params)`) and the resulting output variants. The processed image files themselves are preserved in `dist/assets/images/` across builds — the build cleans HTML, theme assets, and vendor files from `dist/` but leaves the images directory intact.

On a cache hit, the system verifies that the output files actually exist on disk before skipping processing. If files are missing (e.g. after a manual partial clean), it falls back to re-processing.

## Pipeline Versioning

The params hash covers configuration, but configuration is only half of what
determines the output — the other half is the image-processing code itself.
A change to `src/image-processing.ts` that alters the variants a given source
produces leaves both hashes untouched, so `npm run build` would serve every
photo from cache, `outputFilesExist` would pass (the old variants are still on
disk), and the build would report success while emitting stale output. It fails
quietly, which is the worst way to fail.

`IMAGE_PIPELINE_VERSION` in `src/image-processing.ts` is therefore part of the
params hash. **Bump it in the same commit as any change to the pipeline that
changes its output.** Users then pick the change up on their next ordinary
build rather than needing to know that `build:clean` was required.

Note that this invalidates cache *entries*; it does not delete files. Variants
that are no longer referenced stay in `dist/assets/images/` until a
`build:clean`.

## Clean Build Escape Hatch

When caching produces inconsistent results, a full clean build can be triggered with:

```bash
npm run build:clean   # or: npm run build -- --clean
npm run dev:clean     # or: npm run dev -- --clean
```

This wipes both `dist/` and `.cache/` entirely, forcing all images to be re-processed from scratch.

## Consequences

- Incremental builds only process new or modified photos — typical rebuild time drops from ~13s to ~200ms (for 31 photos)
- The cache is invalidated automatically when processing parameters change (e.g. adding a breakpoint, changing WebP quality, or adjusting `max_dimension`) and when `IMAGE_PIPELINE_VERSION` is bumped
- Superseded variant files are orphaned rather than removed; `build:clean` purges them
- The cache manifest lives in `.cache/` (outside `dist/`) so it survives normal builds; use `--clean` to force a full rebuild
- No external cache service or database — just a JSON file
- Adds modest complexity to the image pipeline (hash computation, cache lookup, output file verification, cache write) but the DX improvement is significant
