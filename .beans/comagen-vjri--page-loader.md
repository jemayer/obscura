---
# comagen-vjri
title: Page loader
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:16:20Z
parent: comagen-4mko
---

Load simple Markdown pages from content/pages/ (about, contact, etc.). Extract YAML frontmatter (title). Derive output path from filename.

## Summary of Changes

Implemented as part of comagen-o9cn in src/markdown.ts. loadPage() and loadAllPages() handle simple Markdown pages from content/pages/.
