---
# comagen-3imu
title: Set up .gitignore
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:32Z
updated_at: 2026-02-28T07:57:55Z
parent: comagen-qgnu
---

Create .gitignore covering: original image files (content/photos/**/*.{jpg,jpeg,png,tiff,tif,webp}), dist/, node_modules/, and compiled output. Per ADR-011.

## Summary of Changes

- Created .gitignore covering: node_modules/, dist/, dist-build/, original image files by extension (per ADR-011), OS files
