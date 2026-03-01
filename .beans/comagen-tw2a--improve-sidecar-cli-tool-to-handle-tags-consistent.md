---
# comagen-tw2a
title: Improve sidecar CLI tool to handle tags consistently
status: completed
type: task
priority: normal
created_at: 2026-03-01T13:11:06Z
updated_at: 2026-03-01T13:29:43Z
---

We have a great CLI tool to manage the sidecar YAMLs. As our static site
generator also offers the possibility for super-flexible free text tags, tagging
consistently can become difficult - little differences in writing or typos
create logical duplicates.

Can we extend our CLI tool to show a multi-selectable list of existing tags,
having the the free text input at the end if we want to create new ones?

Better ideas are welcome!


## Implementation Plan

- [x] Add `collectAllTags()` utility in `src/sidecar-edit.ts`
- [x] Replace tag text prompt with multiselect + free-text flow in `src/sidecar-cli.ts`
- [x] Add unit tests for `collectAllTags()` in `test/sidecar-edit.test.ts`
- [x] Typecheck passes
- [x] All tests pass


## Summary of Changes

Replaced the plain comma-separated text input for tags in the sidecar CLI with a two-step flow:

1. **Multiselect picker** — shows all tags already in use across the project, with the current photo's tags pre-checked. Users select/deselect from known tags.
2. **Free-text input** — allows entering new tags (comma-separated) that don't exist yet.

New tags entered via free-text are added to `knownTags` after save, so subsequent photos in the same session see them in the multiselect.

**Files changed:**
- `src/sidecar-edit.ts` — added `collectAllTags()` utility
- `src/sidecar-cli.ts` — multiselect tag flow + `knownTags` tracking
- `test/sidecar-edit.test.ts` — 4 new tests for `collectAllTags()`
