---
# comagen-83xs
title: Design sidecar CLI editor — interactive workflow, tech choices, architecture
status: completed
type: task
created_at: 2026-03-01T12:27:05Z
updated_at: 2026-03-01T12:27:05Z
---

Designed the sidecar CLI editor tool. Key decisions: @clack/prompts for TUI (sequential prompts, no JSX needed), terminal-image for in-terminal photo previews, logic/UI separation (sidecar-edit.ts + sidecar-cli.ts), YAML round-tripping via parseDocument() API. Defined interactive workflow: gallery selection, photo filtering by missing fields, per-photo edit loop with image preview and EXIF context display.
