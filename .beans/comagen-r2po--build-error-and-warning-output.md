---
# comagen-r2po
title: Build error and warning output
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:57:09Z
updated_at: 2026-02-27T21:57:09Z
parent: comagen-7f5h
---

Implement structured CLI output for build errors and warnings. Hard errors: print the error with file path and context, exit with code 1. Warnings: accumulate and print a summary at the end (e.g. the EXIF warning format from the spec). Success: print build time and file counts.
