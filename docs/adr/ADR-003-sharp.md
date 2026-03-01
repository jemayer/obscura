# ADR-003: sharp for Image Processing

- **Date:** 2026-02-27
- **Status:** Accepted

## Context

Obscura must generate multiple resized variants of every photo at configurable breakpoints, convert them to WebP, and produce thumbnails. This is the most computationally expensive part of the build. The image processing library must:

- Handle JPEG, PNG, TIFF, and WebP input
- Resize with high quality (Lanczos or similar)
- Convert to WebP with configurable quality
- Be fast enough to process hundreds of high-resolution photos in a reasonable time

Alternatives considered:
- **Jimp** — pure JavaScript, significantly slower, no WebP support without plugins
- **ImageMagick via child process** — external dependency, harder to install, harder to handle errors

## Decision

Use sharp for all image processing.

## Consequences

- sharp uses libvips under the hood — one of the fastest image processing libraries available
- Native bindings mean platform-specific prebuilt binaries are downloaded at install time; this occasionally causes issues on uncommon platforms but works reliably on macOS, Linux, and Windows
- Single library handles resize, format conversion, and thumbnail generation — no need to shell out to external tools
- Well-maintained with active development and good TypeScript type definitions
