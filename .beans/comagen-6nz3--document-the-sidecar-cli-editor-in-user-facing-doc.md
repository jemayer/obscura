---
# comagen-6nz3
title: Document the sidecar CLI editor in user-facing docs
status: completed
type: task
priority: normal
created_at: 2026-03-01T12:34:40Z
updated_at: 2026-03-01T12:37:08Z
---

The new interactive sidecar editor (npm run sidecar) is fully implemented but has no user-facing documentation. Users need to know it exists and how to use it.

## Tasks

- [x] Add a section to the user documentation covering the sidecar CLI editor
- [x] Document the interactive workflow: gallery selection, photo filtering, per-photo editing
- [x] Document supported filter modes (all, missing title/location/caption/tags)
- [x] Document navigation options (continue, quit, skip via empty input)
- [x] Document prerequisites (terminal image preview support: iTerm2/Kitty for best results)
- [x] Add `npm run sidecar` to the commands reference in CLAUDE.md
- [x] Include example session walkthrough showing typical usage

## Context

The sidecar editor was implemented in comagen-azr2. Entry point is `src/sidecar-cli.ts`, core logic in `src/sidecar-edit.ts`. It uses @clack/prompts for the TUI and terminal-image for in-terminal photo previews. The tool auto-generates missing sidecars before entering the edit loop, so users don't need to run a separate step first.

## Summary of Changes

- Added full `npm run sidecar` section to `docs/cli.md` with workflow description, example session, and tips
- Updated `docs/getting-started.md` step 4 to recommend the sidecar editor as the primary workflow
- Added cross-reference to sidecar editor in `docs/content-model.md` Auto-Generated Sidecars section
- Added `npm run sidecar` to the commands list in `CLAUDE.md`
