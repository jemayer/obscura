---
# comagen-o9cn
title: Blog post parser with shortcode support
status: completed
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-28T08:16:20Z
parent: comagen-4mko
blocking:
    - comagen-hyrr
---

Parse Markdown blog posts from content/posts/. Extract YAML frontmatter (title, date, tags, summary). Implement the {{< photo "slug" >}} shortcode — parse shortcodes from Markdown, resolve them against the photo slug index. Hard error on non-existent or ambiguous slugs.

## Summary of Changes

- Installed unified, remark-parse, remark-frontmatter, remark-rehype, rehype-stringify
- Created src/markdown.ts with:
  - extractShortcodes(): regex-based {{< photo "slug" >}} shortcode extraction
  - resolveShortcodes(): resolves shortcode slugs against SlugIndex, hard error on non-existent/ambiguous
  - parseBlogFrontmatter(): extracts and validates title, date, tags, summary from YAML
  - loadBlogPost(): full blog post loading pipeline (frontmatter + shortcodes + Markdown rendering)
  - loadAllBlogPosts(): loads all posts from content/posts/, sorted by date descending
  - Also includes loadPage() and loadAllPages() (covers comagen-vjri)
