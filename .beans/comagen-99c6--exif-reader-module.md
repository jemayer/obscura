---
# comagen-99c6
title: EXIF reader module
status: todo
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-27T21:58:05Z
parent: comagen-4mko
blocking:
    - comagen-a0je
    - comagen-2vgo
---

Implement a module that reads EXIF data from image files using exifr. Extract: date, camera model, lens, GPS lat/lon. Return partial results for missing/corrupt data (never throw). Log warnings listing each file and its specific missing fields per the error handling spec.
