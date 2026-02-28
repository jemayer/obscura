---
# comagen-e230
title: Unit tests — Markdown and shortcode parsing
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:57:29Z
updated_at: 2026-02-27T21:57:29Z
parent: comagen-0osb
---

Tests for Markdown rendering and shortcode parsing: renders basic Markdown to HTML, extracts frontmatter, parses {{< photo "slug" >}} shortcodes, hard error on non-existent photo slug, hard error on ambiguous slug, shortcodes inside code blocks are not parsed.
