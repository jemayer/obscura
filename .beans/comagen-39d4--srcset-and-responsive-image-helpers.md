---
# comagen-39d4
title: Srcset and responsive image helpers
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:56:34Z
updated_at: 2026-02-28T08:57:45Z
parent: comagen-nakw
---

Provide helper functions (usable as Nunjucks filters or template globals) that generate srcset attributes and <picture> elements for a given photo, using its generated variants. These are consumed by templates.

## Summary of Changes

- Created src/responsive.ts with:
  - srcset(): generates srcset attribute from ImageVariant array
  - sizes(): generates sizes attribute with sensible defaults
  - bestVariant(): picks closest variant to a target width
  - responsiveImg(): generates full <img> tag with srcset, sizes, lazy loading, async decoding
  - escapeHtml(): safe HTML attribute escaping
