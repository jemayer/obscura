---
# comagen-jm4x
title: Fix sidecar CLI tag/location suggestions to be global
status: completed
type: bug
priority: normal
created_at: 2026-03-01T14:11:41Z
updated_at: 2026-03-01T14:12:13Z
---

Tag and location pickers in the sidecar CLI only show suggestions from the selected gallery, not from all galleries. The `knownTags` and `knownLocations` sets are built from `allTargets` which only includes the selected galleries.

Fix: scan all listed galleries for known tags/locations, regardless of which gallery the user selected to edit.

## Tasks
- [x] Scan all galleries for tags/locations before gallery selection filtering
- [x] Pass global known tags/locations to the edit loop
- [x] Add test coverage for collectAllTags/collectAllLocations (already tested in unit tests, logic change is in CLI only)
- [x] Verify typecheck and tests pass

## Summary of Changes

Moved `knownTags` and `knownLocations` set construction to the initial gallery scan loop (which iterates all listed galleries), so tag/location suggestions are global regardless of which gallery the user selects to edit.
