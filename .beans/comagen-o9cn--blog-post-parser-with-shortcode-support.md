---
# comagen-o9cn
title: Blog post parser with shortcode support
status: todo
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-27T21:58:05Z
parent: comagen-4mko
blocking:
    - comagen-hyrr
---

Parse Markdown blog posts from content/posts/. Extract YAML frontmatter (title, date, tags, summary). Implement the {{< photo "slug" >}} shortcode — parse shortcodes from Markdown, resolve them against the photo slug index. Hard error on non-existent or ambiguous slugs.
