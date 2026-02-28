---
# comagen-og8n
title: Image format validation
status: completed
type: task
priority: high
created_at: 2026-02-27T21:56:34Z
updated_at: 2026-02-28T08:49:18Z
parent: comagen-nakw
blocking:
    - comagen-dv93
---

At build time, scan all gallery directories and validate that every file is a supported format (JPEG, PNG, TIFF, WebP). Any other format (RAW, video, etc.) is a hard build error with a clear message: 'Unsupported image format: <path>. Please export to JPEG, PNG, TIFF, or WebP.'

## Summary of Changes

- Created src/image-validation.ts with:
  - UnsupportedImageFormatError: custom error class with filePath
  - validateGalleryFormats(): scans a gallery dir, hard error on unsupported formats
  - validateAllGalleryFormats(): runs across all gallery directories
  - Skips hidden files, YAML sidecars, and .gitkeep
