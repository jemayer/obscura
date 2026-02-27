---
# comagen-og8n
title: Image format validation
status: todo
type: task
priority: high
created_at: 2026-02-27T21:56:34Z
updated_at: 2026-02-27T21:58:05Z
parent: comagen-nakw
blocking:
    - comagen-dv93
---

At build time, scan all gallery directories and validate that every file is a supported format (JPEG, PNG, TIFF, WebP). Any other format (RAW, video, etc.) is a hard build error with a clear message: 'Unsupported image format: <path>. Please export to JPEG, PNG, TIFF, or WebP.'
