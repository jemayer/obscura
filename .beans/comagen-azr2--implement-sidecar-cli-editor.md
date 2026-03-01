---
# comagen-azr2
title: Implement sidecar CLI editor
status: completed
type: feature
created_at: 2026-03-01T12:27:10Z
updated_at: 2026-03-01T12:27:10Z
---

Implemented the interactive sidecar YAML editor CLI tool (npm run sidecar). New files: src/sidecar-edit.ts (core logic — scanGallery, filterTargets, loadSidecarSnapshot, writeSidecarEdits, countByFilter), src/sidecar-cli.ts (TUI entry point using @clack/prompts + terminal-image), test/sidecar-edit.test.ts (17 unit tests). Added @clack/prompts and terminal-image dependencies. Added sidecar script to package.json.
