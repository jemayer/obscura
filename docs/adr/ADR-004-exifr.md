# ADR-004: exifr for EXIF Reading

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura automatically extracts metadata from photo files: date taken, camera model, lens, and GPS coordinates. The EXIF reading library must:

- Parse EXIF, IPTC, and XMP data from JPEG, TIFF, and WebP files
- Handle missing, partial, or corrupt metadata gracefully (return what it can, not throw)
- Be fast — it runs on every photo at every build
- Work in Node.js

Alternatives considered:
- **exif-parser** — JPEG only, no TIFF/WebP, limited tag support
- **sharp's built-in metadata** — provides basic info but not full EXIF (no lens, limited GPS)
- **exiftool via child process** — powerful but external Perl dependency

## Decision

Use exifr for EXIF reading.

## Consequences

- Pure JavaScript, zero native dependencies — no install issues
- Supports JPEG, TIFF, WebP, and HEIC
- Partial parsing: can extract specific tags without reading the entire file, improving performance
- Handles corrupt/missing EXIF by returning partial results rather than throwing, which aligns with our "warn and continue" error policy
- Good TypeScript support
