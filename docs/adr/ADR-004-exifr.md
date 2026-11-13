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

Use `exifr` for parsing EXIF, XMP, and IPTC payloads, paired with `sharp(buffer).metadata()` as a universal container demuxer.

## Consequences

- Pure JavaScript tag parser (`exifr`) combined with `sharp` (already used for image resizing) — no new dependencies
- Direct `exifr.parse(buffer)` handles JPEG, TIFF, PNG, HEIC, and AVIF containers, while `sharp(buffer).metadata()` demuxes raw `exif`, `xmp`, and `iptc` byte buffers from containers `exifr` does not natively recognize (specifically **WebP**, which otherwise throws `Unknown file format` in `exifr`)
- Stripping the optional 6-byte `Exif\0\0` JPEG APP1 prefix from `sharp`'s extracted `meta.exif` buffer yields a standard TIFF header (`II*\0` or `MM\0*`) that `exifr` parses identically across all formats
- Supports multi-standard fallback chains across EXIF IFD0/ExifIFD, XMP (`aux`/`exif`/`dc`), and IPTC (`Byline`/`DateCreated`) so exports from RAW processors (darktable, Lightroom, Capture One) and all major camera brands retain full metadata
- Handles corrupt/missing EXIF by returning partial results rather than throwing, which aligns with our "warn and continue" error policy
- Good TypeScript support
