---
# comagen-6egq
title: Handle special date "1 January 1970"
status: completed
type: task
priority: normal
created_at: 2026-03-01T16:44:33Z
updated_at: 2026-03-01T17:03:41Z
---

Usually, there won't be many photos with a date of "1 January 1970", at least
not in the meaningful sense. It would be better to handle/display such a date as
"Date Unknown" (or not at all), since most of the times, this is a relict of
UNIX time.

## Summary of Changes

Epoch dates (1 January 1970) are now treated as missing/undefined at three filter points:
1. **exif.ts**: `isEpochDate()` check in `buildExifData()` — filters during EXIF reading
2. **metadata.ts**: `isEpochDate()` check in `parseDate()` — filters sidecar date strings and Date objects
3. **metadata.ts**: `isEpochDate()` check in `mergeMetadata()` — filters the final resolved date

Only exact Jan 1, 1970 is filtered; other 1970 dates (e.g. June 15, 1970) pass through normally.

4 new tests added to metadata.test.ts covering EXIF epoch, sidecar string epoch, sidecar Date epoch, and non-epoch 1970 dates.
