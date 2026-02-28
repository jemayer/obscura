---
# comagen-99c6
title: EXIF reader module
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:09:56Z
parent: comagen-4mko
blocking:
    - comagen-a0je
    - comagen-2vgo
---

Implement a module that reads EXIF data from image files using exifr. Extract: date, camera model, lens, GPS lat/lon. Return partial results for missing/corrupt data (never throw). Log warnings listing each file and its specific missing fields per the error handling spec.

## Summary of Changes

- Installed exifr package
- Created src/exif.ts with:
  - readExif(): reads EXIF from image files, returns partial results on missing/corrupt data (never throws)
  - Extracts: date (DateTimeOriginal/CreateDate), camera (Make+Model), lens (LensModel), GPS lat/lon
  - Camera string deduplication (avoids 'NIKON NIKON D850')
  - ExifResult discriminated union type for clean/warning results
  - formatExifWarnings(): formats warning summary per spec format
- All strict TypeScript, no any, passes ESLint
