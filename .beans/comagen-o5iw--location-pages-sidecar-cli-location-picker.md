---
# comagen-o5iw
title: Location pages + sidecar CLI location picker
status: completed
type: feature
priority: normal
created_at: 2026-03-01T13:41:50Z
updated_at: 2026-03-01T13:46:05Z
---

Add browsable location index/detail pages (mirroring tags) and a location picker in the sidecar CLI.

## Tasks
- [x] Add LocationPage type to types.ts + extend BuildContext
- [x] Add slugifyLocation to slugs.ts
- [x] Create src/locations.ts with buildLocationPages()
- [x] Wire location pages into build.ts
- [x] Add location rendering to rendering.ts
- [x] Create location-index.html and location.html templates
- [x] Make locations clickable in photo.html, gallery.html, tag.html
- [x] Add location pages to sitemap.xml
- [x] Add collectAllLocations to sidecar-edit.ts
- [x] Add location picker to sidecar-cli.ts
- [x] Write tests for locations.ts
- [x] Write tests for collectAllLocations
- [x] Verify typecheck and tests pass

## Summary of Changes

Added location pages feature mirroring the existing tag pages:

- **types.ts**: Added `LocationPage` interface and `locationPages` field to `BuildContext`
- **slugs.ts**: Added `slugifyLocation()` function
- **locations.ts**: New module with `buildLocationPages()` that groups photos by location
- **build.ts**: Wired location pages into the build pipeline and page count
- **rendering.ts**: Added `slugifylocation` filter, `renderLocationIndex()`, `renderLocationPage()`, and updated `renderSitemap()`/`renderAll()`
- **Templates**: Created `location-index.html` and `location.html`; made locations clickable links in `photo.html`, `gallery.html`, `tag.html`; added location pages to `sitemap.xml`
- **sidecar-edit.ts**: Added `collectAllLocations()` helper
- **sidecar-cli.ts**: Added location picker with existing locations + free-text option
- **Tests**: 7 tests for `buildLocationPages()`, 5 tests for `collectAllLocations()`
